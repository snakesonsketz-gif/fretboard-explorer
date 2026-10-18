/**
 * Turning raw pitch readings into a steady tuner display: which string you're on, how many cents
 * off, and when it counts as in tune. Pure logic, no browser APIs.
 */
import { centsOff, type Pitch } from "./pitch";
import { midiHz, midiName, midiOctave } from "./tunings";

/** Within this many cents a string is in tune (most clip-on tuners use ±3–5). */
export const IN_TUNE_CENTS = 3;
/** Within this many cents: nearly there. */
export const CLOSE_CENTS = 10;

export interface StringMatch {
  index: number;
  cents: number;
}

/** The string (index into `midis`) whose pitch `hz` is closest to, with the cents offset. */
export function nearestString(hz: number, midis: number[], a4 = 440): StringMatch {
  let best = { index: 0, cents: Infinity };
  midis.forEach((m, i) => {
    const c = centsOff(hz, midiHz(m, a4));
    if (Math.abs(c) < Math.abs(best.cents)) best = { index: i, cents: c };
  });
  return best;
}

/** The nearest note of the chromatic scale, for when no string is close. */
export function nearestNote(hz: number, a4 = 440, flats = false): { midi: number; name: string; octave: number; cents: number } {
  const exact = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(exact);
  return { midi, name: midiName(midi, flats), octave: midiOctave(midi), cents: (exact - midi) * 100 };
}

export type Zone = "in-tune" | "close" | "off";
export const zoneOf = (cents: number): Zone => (Math.abs(cents) <= IN_TUNE_CENTS ? "in-tune" : Math.abs(cents) <= CLOSE_CENTS ? "close" : "off");

/** Plain-words advice for a reading. */
export function advice(cents: number): string {
  const z = zoneOf(cents);
  if (z === "in-tune") return "In tune";
  const a = Math.abs(Math.round(cents));
  const steps = Math.round(a / 100);
  const far = steps >= 1 ? `${steps} half step${steps === 1 ? "" : "s"}` : "";
  if (cents < 0) return a > 50 ? `Way flat${far ? ` (${far})` : ""} — tighten (tune up)` : `Flat by ${a}¢ — tighten a little (tune up)`;
  return a > 50 ? `Way sharp${far ? ` (${far})` : ""} — loosen (tune down)` : `Sharp by ${a}¢ — loosen a little (tune down)`;
}

export interface Reading {
  /** Index of the matching string, or -1 (by string: far from every string; chromatic: not a string's note). */
  string: number;
  /** The note being tuned to (MIDI): the string's note, or in chromatic mode the nearest note. */
  targetMidi: number;
  /** Cents off the target. */
  cents: number;
  hz: number;
  targetHz: number;
  /** The nearest chromatic note to what's heard (always filled). */
  note: { midi: number; name: string; octave: number };
  /** Cents off the nearest chromatic note. */
  noteCents: number;
}

export type TunerMode = "chromatic" | "strings";

export interface TrackerOptions {
  midis: number[];
  a4: number;
  /** "chromatic": tune to the nearest note; "strings": tune to the nearest (or locked) string. */
  mode?: TunerMode;
  /** Lock to one string (index) instead of picking the nearest. */
  locked?: number | null;
  flats?: boolean;
}

/** Too far from every string to call it one of them (more than ~a minor third away). */
const FAR = 350;

/**
 * Smooths readings: needs two readings in a row on a new note or string before switching to it,
 * and shows the median of the last few readings so the needle doesn't jitter.
 */
export class Tracker {
  private recent: number[] = [];
  private current: number | null = null;
  private pending: number | null = null;
  private pendingCount = 0;

  constructor(public opts: TrackerOptions) {}

  reset() {
    this.recent = [];
    this.current = null;
    this.pending = null;
    this.pendingCount = 0;
  }

  push(p: Pitch): Reading {
    const { midis, a4, locked, flats } = this.opts;
    const chromatic = this.opts.mode === "chromatic";
    const near = nearestNote(p.hz, a4, flats);
    const isLocked = locked != null && locked >= 0 && locked < midis.length;
    // What we tune to: the nearest note (chromatic), the locked string, or the nearest string.
    let key: number;
    if (chromatic && !isLocked) key = near.midi;
    else if (isLocked) key = -100 - locked; // strings are keyed apart from notes
    else {
      const m = nearestString(p.hz, midis, a4);
      key = Math.abs(m.cents) > FAR ? near.midi : -100 - m.index;
    }
    if (key !== this.current) {
      if (key === this.pending) this.pendingCount++;
      else {
        this.pending = key;
        this.pendingCount = 1;
      }
      if (this.current === null || this.pendingCount >= 2) {
        this.current = key;
        this.recent = [];
      } else key = this.current;
    } else this.pendingCount = 0;

    const stringIdx = key <= -100 ? -100 - key : -1;
    const targetMidi = stringIdx >= 0 ? midis[stringIdx]! : key;
    const string = stringIdx >= 0 ? stringIdx : midis.indexOf(targetMidi);
    const targetHz = midiHz(targetMidi, a4);
    const raw = centsOff(p.hz, targetHz);
    this.recent.push(raw);
    if (this.recent.length > 5) this.recent.shift();
    const sorted = [...this.recent].sort((a, b) => a - b);
    const cents = sorted[Math.floor(sorted.length / 2)]!;
    return { string, targetMidi, cents, hz: p.hz, targetHz, note: { midi: near.midi, name: near.name, octave: near.octave }, noteCents: near.cents };
  }
}
