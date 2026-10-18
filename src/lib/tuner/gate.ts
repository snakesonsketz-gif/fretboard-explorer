/**
 * Deciding which pitch readings come from a plucked string and which are room noise or voices.
 *
 * - Room noise: readings must stand well clear of the room's own level (the noise floor, tracked
 *   continuously), so hum, fans and distant chatter don't move the needle.
 * - Voices (with "guitar only" on): a plucked note starts with a sharp attack, then dies away at a
 *   steady pitch. Speech and singing glide and wobble in pitch, and a held sung note doesn't decay.
 *   A note is only shown once its pitch has held still for a few readings, and a sound that hasn't
 *   started fading half a second after it began is treated as a voice (or other sustained sound).
 *
 * Pure logic on (time, level, pitch) readings, so it is tested on synthetic plucks and voices.
 */

export interface GateOptions {
  /** Reject voices and other non-plucked sounds (on for guitar, bass and ukulele). */
  pluckedOnly: boolean;
}

export interface GateInput {
  /** Seconds (any clock that only goes forward). */
  t: number;
  /** Level of the analysis window in dB (RMS, dBFS). */
  db: number;
  /** Pitch reading, if the window has one. */
  hz: number | null;
  clarity: number;
}

export type GateVerdict = "accept" | "quiet" | "unclear" | "settling" | "voice";

/** Readings must be this far above the room's noise floor. */
export const ABOVE_FLOOR_DB = 10;
/** A rise this big within ONSET_WINDOW is a new pluck. */
const ONSET_RISE_DB = 9;
const ONSET_WINDOW = 0.25;
/** Pitch readings in a row that must agree (within STABLE_CENTS) before a plucked note shows. */
const STABLE_COUNT = 4;
const STABLE_CENTS = 12;
/** A plucked note only fades; swelling back up this much (without a new pluck) is a voice. */
const REGROW_DB = 5;
/** After this long, a plucked note must have faded at least SUSTAIN_DROP_DB from its peak. */
const SUSTAIN_CHECK_S = 0.5;
const SUSTAIN_DROP_DB = 3;
/** Clarity needed (YIN): plucked strings sit well above this; breathy or noisy sounds below. */
export const MIN_CLARITY = 0.75;

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

export class NoteGate {
  floorDb = Infinity;
  private recent: { t: number; db: number }[] = [];
  private event: { start: number; peak: number; low: number; sustained: boolean; pitches: number[] } | null = null;

  constructor(public opts: GateOptions) {}

  reset() {
    this.recent = [];
    this.event = null;
  }

  /** Is a pluck currently ringing (for the UI)? */
  get ringing() {
    return !!this.event;
  }

  push(r: GateInput): GateVerdict {
    // Noise floor: follows the level down at once, creeps up slowly (about 1.5 dB a second), so a
    // ringing note never becomes "the room".
    if (!Number.isFinite(this.floorDb) || r.db < this.floorDb) this.floorDb = r.db;
    else this.floorDb += Math.min(r.db - this.floorDb, 0.075);

    // Onset: the level jumped well above where it was a moment ago.
    this.recent.push({ t: r.t, db: r.db });
    while (this.recent.length && this.recent[0]!.t < r.t - ONSET_WINDOW) this.recent.shift();
    const before = Math.min(...this.recent.map((x) => x.db));
    const loudEnough = r.db >= this.floorDb + ABOVE_FLOOR_DB;
    if (loudEnough && r.db - before >= ONSET_RISE_DB && (!this.event || r.t - this.event.start > 0.15))
      this.event = { start: r.t, peak: r.db, low: r.db, sustained: false, pitches: [] };
    if (this.event) {
      const ev = this.event;
      if (r.t - ev.start < 0.15) {
        if (r.db > ev.peak) ev.peak = r.db;
        ev.low = ev.peak; // still in the attack: the fade is measured from the top
      } else {
        ev.low = Math.min(ev.low, r.db);
        if (r.db - ev.low >= REGROW_DB) ev.sustained = true; // swelled back up: not a plucked string
      }
      // The note has died away into the room.
      if (!loudEnough || r.t - this.event.start > 10) this.event = null;
    }

    if (!loudEnough) return "quiet";
    if (r.hz === null || r.clarity < MIN_CLARITY) return "unclear";
    if (!this.opts.pluckedOnly) return "accept";

    const ev = this.event;
    if (!ev) return "voice"; // pitched sound with no pluck: a voice or something sustained
    if (!ev.sustained && r.t - ev.start > SUSTAIN_CHECK_S && ev.peak - r.db < SUSTAIN_DROP_DB) ev.sustained = true;
    if (ev.sustained) return "voice";

    ev.pitches.push(r.hz);
    if (ev.pitches.length > 6) ev.pitches.shift();
    const last = ev.pitches.slice(-STABLE_COUNT);
    if (last.length < STABLE_COUNT) return "settling";
    const sorted = [...last].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)]!;
    return last.every((p) => Math.abs(cents(p, mid)) <= STABLE_CENTS) ? "accept" : "settling";
  }
}
