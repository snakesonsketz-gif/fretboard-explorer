/**
 * Turns measurements into the four Listen-mode results — Accuracy, Clarity, Ring-out, Timing —
 * each with its reasons. Anything the audio can't settle is "unsure" and is left out of the
 * score rather than counted as a mistake. Thresholds come from measured distributions on
 * simulated strums (see tests/listen.test.ts) and are kept in one place so real recordings can
 * re-tune them.
 */
import { degreeToSemitones, rootByName, spellDegree, pcsToDegrees, type Degree } from "../theory";
import {
  HIGHEST_MIDI,
  LOWEST_MIDI,
  checkChord,
  dbfs,
  detectOnsets,
  midiToHz,
  hfFloor,
  hfRelDb,
  ringProfile,
  rms,
  spectrumOf,
  type ChordCheck,
  type RingProfile,
} from "./dsp";

export const THRESHOLDS = {
  heard: 0.06, // chord note counts as played
  faint: 0.03, // between faint and heard: "unsure, faint"
  wrong: 0.13, // extra note counted as wrong (no false alarms seen on 288 correct strums)
  maybeWrong: 0.08, // between maybeWrong and wrong: "maybe" (not counted)
  tooQuietDb: -48, // strum peak below this: unsure, too quiet
  // Buzz: hiss in the 3–10 kHz band relative to the strongest note (dB). Bradley's guitar on an
  // iPhone (Oct 2026): 76 clean strums -87…-70, buzzing strums -71…-63.
  buzzSome: -69,
  buzzStrong: -64,
  buzzAboveRoom: 12, // the hiss must be this far (dB) above the room's to be the guitar's (soft clean strum: +9.9, buzz: ≥ +16)
  // A note that stops this soon while the chord rings on was deadened (and must also be far under
  // the loudest note 0.3 s in, see deadNotes). Real guitar: muted strings stop by ~0.25 s.
  deadNoteSeconds: 0.5,
  timingGoodMs: 25,
  timingOkMs: 60,
};

export type Thresholds = typeof THRESHOLDS;

export type Verdict = "good" | "fix" | "unsure";

export interface TargetChord {
  rootName: string;
  degrees: Degree[];
  label: string;
  /** Degrees that may be left out without penalty (default: a perfect 5th in 4+ note chords). */
  optional?: Degree[];
}

export interface NoteResult {
  name: string;
  degree: Degree;
  status: "heard" | "faint" | "missing" | "left-out" | "hidden" | "overtone";
  note: string;
}

export interface StrumReport {
  level: { peakDb: number; tooQuiet: boolean };
  tuningCents: number;
  accuracy: { score: number | null; verdict: Verdict; notes: NoteResult[]; extras: { name: string; status: "wrong" | "maybe" }[]; summary: string };
  clarity: { score: number | null; verdict: Verdict; buzz: "none" | "some" | "strong" | "unknown"; dead: string[]; summary: string };
  ringOut: { seconds: number; untilNext: boolean; verdict: Verdict; short: { name: string; seconds: number }[]; summary: string };
  timing: { offsetMs: number | null; verdict: Verdict; summary: string };
}

const pcName = (root: string, pc: number) => {
  const r = rootByName(root);
  const rel = (pc - r.pc + 12) % 12;
  return spellDegree(r, pcsToDegrees([rel])[0]!);
};

/** Is pitch class `pc` hidden under an overtone of a detected note (3rd, 5th, 6th, 7th, 9th, 10th partial)? */
function hiddenUnder(pc: number, chord: ChordCheck, tuning: number): number | null {
  const heard = chord.target.flatMap((t) => t.octaves);
  for (const m of heard)
    for (const h of [3, 5, 6, 7, 9, 10]) {
      const f = h * midiToHz(m, tuning);
      const midi = 69 + 12 * Math.log2(f / midiToHz(69, tuning));
      const near = Math.round(midi);
      // 20 cents: the 3rd/5th/6th/9th/10th partials sit this close to a note; the 7th (31 cents
      // flat of the b7) does not, so a missing b7 is still reported.
      if (near % 12 === pc && Math.abs(midi - near) < 0.2 && near >= LOWEST_MIDI && near <= HIGHEST_MIDI) return m;
    }
  return null;
}

/** Every octave of `pc` that was heard sits exactly on an overtone of a *different* chord note. */
function onlyOvertones(octaves: number[], chord: ChordCheck, tuning: number): number | null {
  if (!octaves.length) return null;
  const pc = octaves[0]! % 12;
  const others = chord.target.filter((t) => t.pc !== pc).flatMap((t) => t.octaves);
  let source: number | null = null;
  for (const o of octaves) {
    const fo = midiToHz(o, tuning);
    const hit = others.find((m) => m % 12 !== o % 12 && m < o && [3, 5, 6, 9, 10].some((h) => Math.abs(1200 * Math.log2(fo / (h * midiToHz(m, tuning)))) < 20));
    if (hit === undefined) return null;
    source = hit;
  }
  return source;
}

const midiName = (m: number) => ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][m % 12]!;

export interface StrumInput {
  audio: Float32Array;
  sr: number;
  onset: number;
  end: number;
  target: TargetChord;
  /** Room noise (hfFloor of a quiet moment), if known. */
  roomFloor?: number;
  /** Expected strum time minus actual, in ms, computed by the caller (play-along / metronome). */
  offsetMs?: number | null;
  /** Expected length of the chord in seconds (play-along), for ring-out. */
  expectedSeconds?: number;
  /** False while the strum may still be ringing (no next strum yet): ring-out is "so far". */
  complete?: boolean;
}

/**
 * Everything the sound analysis found for one strum — no thresholds applied yet. Measuring is
 * the slow part (spectra, per-note ring tracking); judging a measurement is instant, so the
 * Develop tab re-scores stored strums live while thresholds are adjusted.
 */
export interface StrumMeasure {
  /** Level of the first 250 ms (dBFS). */
  peakDb: number;
  /** Target pitch classes, in the chord's degree order. */
  pcs: number[];
  chord: ChordCheck;
  ring: RingProfile;
  /** Buzz-band (3–10 kHz) floor in the analysis window (compare with roomFloor). */
  hfFloor: number;
  /** Buzz measure: buzz-band floor relative to the strongest note (dB); null if the strum is too short to measure. */
  hfRelDb: number | null;
  /** Room's buzz-band floor (hfFloor of a quiet moment), if known. */
  roomFloor?: number;
  /** The note check saw this strum alone (≥ 0.2 s, no other attack); else extras are only "maybe". */
  clearLook: boolean;
  offsetMs: number | null;
  expectedSeconds?: number;
  complete: boolean;
}

/** Seconds a strum must ring on its own (no other attack) for buzz to be judged. */
export const BUZZ_MIN_RING = 0.5;

export function measureStrum(input: StrumInput): StrumMeasure {
  const { audio, sr, onset, end, target } = input;
  const N = 16384;
  const win = new Float32Array(N);
  // A slow strum's main attack can come well after its first string (Bradley: +8 to +14 dB
  // 0.12 s in). The spectra are taken after the loudest part of the strum has struck, not
  // during it — otherwise the strum's own attack looks like a different sound in the window.
  let body = onset;
  {
    const a0 = onset + Math.round(0.03 * sr), a1 = Math.min(end, onset + Math.round(0.35 * sr));
    const startLevel = rms(audio, onset, onset + Math.round(0.05 * sr));
    if (a1 - a0 > Math.round(0.05 * sr))
      for (const o of detectOnsets(audio.subarray(a0, a1), sr, { strumsOnly: false })) {
        const a = a0 + o;
        if (a <= onset + Math.round(0.3 * sr) && rms(audio, a, a + Math.round(0.02 * sr)) > startLevel) body = a;
      }
  }
  // Stop at the next strum: its attack would add notes and hiss that aren't this strum's.
  const from = body + Math.round(0.08 * sr);
  const to = Math.min(from + N, end - Math.round(0.01 * sr));
  if (to > from) win.set(audio.subarray(from, to));
  const spec = spectrumOf(win, sr);
  // Buzz is judged on the ring alone, so the strum must ring on its own for a while: no other
  // attack (the next strum, a brush of the strings, a scrape, a knock) within BUZZ_MIN_RING. In
  // quick rhythm playing the strings are re-struck and brushed so often that the hiss between
  // strums is the playing itself (Bradley's steady-rhythm take read like strong buzz on every strum).
  const aloneTo = Math.min(end, body + Math.round(BUZZ_MIN_RING * sr));
  let alone = aloneTo - body >= Math.round(BUZZ_MIN_RING * sr);
  if (alone && detectOnsets(audio.subarray(from, aloneTo), sr, { strumsOnly: false }).length) alone = false;
  // The note check needs a clean look too: at least 0.2 s of this strum alone. Otherwise (quick
  // rhythm playing, a brush or scrape in between) a note that isn't in the chord is only a "maybe".
  const clearTo = Math.min(to, body + Math.round(0.28 * sr));
  const clearLook = clearTo - from >= Math.round(0.2 * sr) && (alone || !detectOnsets(audio.subarray(from, to), sr, { strumsOnly: false }).length);
  const root = rootByName(target.rootName);
  const pcs = target.degrees.map((d) => (((root.pc + degreeToSemitones(d)) % 12) + 12) % 12);
  const chord = checkChord(spec, pcs);
  // Follow every octave of every chord note (the check may have heard D4 where the string was D3).
  const candidates: number[] = [];
  for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) if (pcs.includes(m % 12)) candidates.push(m);
  return {
    peakDb: dbfs(rms(audio, onset, Math.min(end, onset + Math.round(0.25 * sr)))),
    pcs,
    chord,
    ring: ringProfile(audio, sr, onset, end, candidates, chord.tuningCents),
    hfFloor: hfFloor(spec),
    hfRelDb: alone ? hfRelDb(spec) : null,
    clearLook,
    ...(input.roomFloor !== undefined ? { roomFloor: input.roomFloor } : {}),
    offsetMs: input.offsetMs ?? null,
    ...(input.expectedSeconds !== undefined ? { expectedSeconds: input.expectedSeconds } : {}),
    complete: input.complete ?? true,
  };
}

/** How far the strum's buzz-band hiss is above the room's (dB), or null without a room reading. */
export const hfAboveRoomDb = (m: StrumMeasure): number | null =>
  m.roomFloor !== undefined && m.roomFloor > 1e-18 ? 10 * Math.log10(m.hfFloor / m.roomFloor) : null;

/** Notes that sounded at the start and can be followed on their own (for per-note ring-out). */
export function soundingNotes(m: StrumMeasure) {
  const loudest = Math.max(1e-9, ...m.ring.notes.filter((n) => n.separable).map((n) => n.early));
  return m.ring.notes.filter((n) => n.separable && n.early >= 0.12 * loudest);
}

/**
 * Lowest note whose ring-out can be trusted. Phone mics barely pick up the fundamentals of the
 * low strings, so a low note looks like it "died" while it was ringing fine (Bradley's iPhone:
 * G2, E2 and A2 read 0.2–0.6 s on clean strums), and notes an octave below the real one show up.
 */
export const DEAD_NOTE_MIN_MIDI = 50; // D3
/** How far under the loudest note a dead note is 0.3 s in (dB): muted 23–57 dB down, ringing ≤ 20. */
const DEAD_NOTE_LATE_DB = -20;
/** A note too weak at the start to follow (an octave the guitar didn't play) isn't judged. */
const DEAD_NOTE_MIN_EARLY = 0.2;

/** Notes (grouped by pitch class) that died early while the chord rang on. */
export function deadNotes(m: StrumMeasure, T: Thresholds): StrumMeasure["ring"]["notes"][] {
  const sounding = soundingNotes(m);
  const loudest = Math.max(1e-9, ...sounding.map((n) => n.early));
  const judged = sounding.filter((n) => n.early >= DEAD_NOTE_MIN_EARLY * loudest);
  // Judge "died early" only with enough to look at: the chord kept ringing well past the cutoff.
  if (m.ring.seconds < T.deadNoteSeconds + 0.3) return [];
  return [...new Set(judged.map((n) => n.midi % 12))]
    .map((pc) => judged.filter((n) => n.midi % 12 === pc))
    // Both views must agree: its partials faded early, and by 0.3 s it is far under the loudest note.
    .filter((ns) => ns.some((n) => n.midi >= DEAD_NOTE_MIN_MIDI) && ns.every((n) => !n.stillRinging && n.seconds < T.deadNoteSeconds && n.lateDb < DEAD_NOTE_LATE_DB));
}

export function analyseStrum(input: StrumInput, T: Thresholds = THRESHOLDS): StrumReport {
  return judgeStrum(measureStrum(input), input.target, T);
}

/** Apply thresholds to a measured strum. */
export function judgeStrum(m: StrumMeasure, target: TargetChord, T: Thresholds = THRESHOLDS): StrumReport {
  const { peakDb, pcs, chord, ring } = m;
  const tooQuiet = peakDb < T.tooQuietDb;
  const root = rootByName(target.rootName);
  const tuning = chord.tuningCents;
  const optional = new Set(target.optional ?? (target.degrees.length >= 4 ? target.degrees.filter((d) => d === "5") : []));

  // ---------------- accuracy
  const notes: NoteResult[] = target.degrees.map((d, i) => {
    const pc = pcs[i]!;
    const name = spellDegree(root, d);
    const t = chord.target.find((x) => x.pc === pc)!;
    if (t.weak && !optional.has(d)) return { name, degree: d, status: "missing", note: "Barely sounding — that string is muted or deadened" };
    if (t.strength >= T.heard) {
      const src = onlyOvertones(t.octaves, chord, tuning);
      return src !== null
        ? { name, degree: d, status: "overtone", note: `Could be an overtone of ${midiName(src)}, can't tell if it was played` }
        : { name, degree: d, status: "heard", note: "Heard" };
    }
    const under = hiddenUnder(pc, chord, tuning);
    if (under !== null) return { name, degree: d, status: "hidden", note: `Hidden in ${midiName(under)}'s overtones, can't tell` };
    if (t.strength >= T.faint) return { name, degree: d, status: "faint", note: "Very faint — can't tell" };
    if (optional.has(d)) return { name, degree: d, status: "left-out", note: "Not heard — fine, it's optional in this chord" };
    return { name, degree: d, status: "missing", note: "Not heard" };
  });
  const extras = chord.extras
    .filter((e) => e.strength >= T.maybeWrong)
    .map((e) => ({ name: pcName(target.rootName, e.pc), status: (e.strength >= T.wrong && m.clearLook ? "wrong" : "maybe") as "wrong" | "maybe" }))
    .filter((e, i, a) => a.findIndex((x) => x.name === e.name) === i);
  const judged = notes.filter((n) => n.status === "heard" || n.status === "missing");
  const wrong = extras.filter((e) => e.status === "wrong").length;
  const accScore = tooQuiet || !judged.length ? null : Math.max(0, Math.round((100 * judged.filter((n) => n.status === "heard").length) / judged.length) - 25 * wrong);
  const missing = notes.filter((n) => n.status === "missing").map((n) => n.name);
  const accVerdict: Verdict = accScore === null ? "unsure" : missing.length || wrong ? "fix" : "good";
  const accSummary = tooQuiet
    ? "Too quiet to judge — get closer to the mic or play louder."
    : accScore === null
      ? "Couldn't hear the chord clearly enough to judge."
      : [
          missing.length ? `Missing ${missing.join(", ")}.` : `All ${target.label} notes heard.`,
          wrong ? `Extra note${wrong > 1 ? "s" : ""}: ${extras.filter((e) => e.status === "wrong").map((e) => e.name).join(", ")}.` : "",
          notes.some((n) => n.status === "hidden" || n.status === "overtone" || n.status === "faint") ? "Some notes couldn't be judged (not counted)." : "",
        ].filter(Boolean).join(" ");

  // ---------------- ring-out (overall and per note)
  // Keep the octaves that actually sounded at the start, and judge per note name: a note
  // "died early" only if every separable octave of it did.
  const untilNext = ring.stillRinging;
  const shortNotes = deadNotes(m, T).map((ns) => ({ name: pcName(target.rootName, ns[0]!.midi % 12), seconds: Math.max(...ns.map((n) => n.seconds)) }));
  const wanted = m.expectedSeconds;
  const ringVerdict: Verdict = tooQuiet ? "unsure" : untilNext || (wanted ? ring.seconds >= 0.85 * wanted : ring.seconds >= 1) ? (shortNotes.length ? "fix" : "good") : "fix";
  const complete = m.complete;
  const ringSummary = tooQuiet
    ? "Too quiet to judge."
    : `${untilNext ? (complete ? `Rang until the next strum (${ring.seconds.toFixed(1)} s)` : `Still ringing (${ring.seconds.toFixed(1)} s so far)`) : `Rang for ${ring.seconds.toFixed(1)} s`}${wanted ? ` of ${wanted.toFixed(1)} s` : ""}.${shortNotes.length ? ` ${shortNotes.map((n) => n.name).join(", ")} died early (${shortNotes.map((n) => `${n.seconds.toFixed(2)} s`).join(", ")}) — a finger may be touching ${shortNotes.length > 1 ? "those strings" : "that string"}.` : ""}`;

  // ---------------- clarity (buzz/noise + dead notes)
  let buzz: StrumReport["clarity"]["buzz"] = "unknown";
  if (!tooQuiet && m.hfRelDb !== null) {
    const rel = m.hfRelDb;
    buzz = rel >= T.buzzStrong ? "strong" : rel >= T.buzzSome ? "some" : "none";
    // Hiss barely above the room's is the room (a soft strum in a noisy room): no buzz found.
    // Without a quiet-room reading, hiss can't be told from room noise, so it isn't called buzz.
    const above = hfAboveRoomDb(m);
    if (above !== null && above < T.buzzAboveRoom) buzz = "none";
    else if (above === null && buzz !== "none") buzz = "unknown";
  }
  const dead = shortNotes.map((n) => n.name);
  const clarScore = tooQuiet || (buzz === "unknown" && !dead.length) ? null : Math.max(0, 100 - (buzz === "strong" ? 60 : buzz === "some" ? 30 : 0) - 25 * dead.length);
  const clarVerdict: Verdict = clarScore === null ? "unsure" : clarScore >= 85 ? "good" : "fix";
  const clarSummary = tooQuiet
    ? "Too quiet to judge."
    : buzz === "unknown" && !dead.length
      ? "Too much background noise to judge buzz."
      : [buzz === "strong" ? "Strong buzz or rattle." : buzz === "some" ? "Some buzz — press closer to the fret." : buzz === "none" ? "No buzz." : "Background noise — buzz not judged.", dead.length ? `${dead.join(", ")} sounded dead.` : "Every note you can tell apart rang."].join(" ");

  // ---------------- timing
  const off = m.offsetMs;
  const timingVerdict: Verdict = off === null || tooQuiet ? "unsure" : Math.abs(off) <= T.timingOkMs ? "good" : "fix";
  const timingSummary =
    off === null
      ? "Play along with the sequencer or the click to get timing."
      : Math.abs(off) <= T.timingGoodMs
        ? `On the beat (${off >= 0 ? "+" : ""}${Math.round(off)} ms).`
        : `${Math.abs(Math.round(off))} ms ${off > 0 ? "late" : "early"}${Math.abs(off) <= T.timingOkMs ? " — close" : ""}.`;

  return {
    level: { peakDb, tooQuiet },
    tuningCents: tuning,
    accuracy: { score: accScore, verdict: accVerdict, notes, extras, summary: accSummary },
    clarity: { score: clarScore, verdict: clarVerdict, buzz, dead, summary: clarSummary },
    ringOut: { seconds: ring.seconds, untilNext, verdict: ringVerdict, short: shortNotes, summary: ringSummary },
    timing: { offsetMs: off, verdict: timingVerdict, summary: timingSummary },
  };
}

/** Room-noise reference from a quiet stretch of audio (call between strums / before playing). */
export function roomFloorOf(audio: Float32Array, sr: number, from: number): number {
  const w = new Float32Array(16384);
  w.set(audio.subarray(from, from + 16384));
  return hfFloor(spectrumOf(w, sr));
}
