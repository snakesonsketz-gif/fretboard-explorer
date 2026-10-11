/**
 * Shared musical time model for the sequencers, playback and MIDI export.
 *
 * Everything is positioned in ticks (PPQ ticks per quarter note, the MIDI convention), so
 * tempo can change without moving any event. A chord's `start` and `duration` are separate:
 * the next chord change is simply the next event's start, gaps are rests, and a chord may
 * end before (or, in data, after) the next one begins.
 *
 * This module is pure (no audio, no DOM) so it can be tested and reused by MIDI export.
 */
import { degreeToSemitones, rootByName, type Degree } from "./theory";

export const PPQ = 480;

export interface TimeSig {
  /** Beats per measure (numerator). */
  beats: number;
  /** Note value of one beat (denominator): 2, 4, 8 or 16. */
  unit: 2 | 4 | 8 | 16;
}

export const beatTicks = (ts: TimeSig) => (PPQ * 4) / ts.unit;
export const measureTicks = (ts: TimeSig) => ts.beats * beatTicks(ts);

/**
 * Drum-grid steps per beat: 1 = beats, 2 = halves (8ths in 4/4), 3 = triplets, 4 = quarters
 * (16ths), 5 = quintuplets, 6 = sextuplets (16th triplets), 8 = 32nds, 12 = 32nd triplets.
 */
export type Grid = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
export const GRIDS: Grid[] = [1, 2, 3, 4, 5, 6, 8, 12];
export const gridTicks = (ts: TimeSig, grid: Grid) => beatTicks(ts) / grid;
/** Drum-grid name in this time signature: in 4/4, 2 → "1/8 notes", 3 → "1/8 triplets", 6 → "1/16 triplets". */
export function gridName(ts: TimeSig, grid: Grid): string {
  if (grid === 1) return `Beats (1/${ts.unit})`;
  if (grid === 5) return "Quintuplets (5 per beat)";
  const triplet = grid % 3 === 0;
  const div = triplet ? (grid / 3) * 2 : grid; // 3 in the space of 2
  return `1/${ts.unit * div} ${triplet ? "triplets" : "notes"}`;
}

/** Snap to a step, landing on whole ticks (a septuplet step isn't a whole number of ticks). */
export const snap = (ticks: number, step: number) => Math.round(Math.round(ticks / step) * step);
export const snapDown = (ticks: number, step: number) => Math.round(Math.floor(ticks / step + 1e-9) * step);

/* ------------------------------------------------------------------ snap to */

/** Step for buttons, arrow keys and minimum lengths: the snap, but never finer than 1/16 beat. */
export const nudgeTicks = (ts: TimeSig, id: SnapId) => Math.max(snapTicks(ts, id), beatTicks(ts) / 16);

/** The next (dir 1) or previous (dir -1) snap point from a tick, in whole ticks. */
export function stepTo(tick: number, step: number, dir: 1 | -1): number {
  const x = tick / step;
  const tol = 0.5 / step;
  const i = dir > 0 ? Math.floor(x + tol) + 1 : Math.ceil(x - tol) - 1;
  return Math.round(i * step);
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** A tick offset inside a beat as a fraction of the beat ("1/2", "2/3", "3/7"), or ticks if none fits. */
export function beatFraction(tick: number, ts: TimeSig): string {
  const beat = beatTicks(ts);
  if (tick <= 0) return "";
  for (const d of [2, 3, 4, 5, 6, 7, 8, 12, 16]) {
    const n = Math.round((tick / beat) * d);
    if (n > 0 && n < d && Math.abs((n * beat) / d - tick) <= 0.5) {
      const g = gcd(n, d);
      return `${n / g}/${d / g}`;
    }
  }
  return `${tick} ticks`;
}

/**
 * Where chords snap to on the timeline: every common note value, its dotted value and its
 * triplet, plus quintuplets and septuplets, a whole bar, half a bar, and free (no snap).
 * `beats` is the step in beats (the time signature's beat).
 */
export const SNAPS = [
  { id: "free", kind: "free" },
  { id: "bar", kind: "bar" },
  { id: "half-bar", kind: "half-bar" },
  { id: "d1", beats: 1.5, kind: "dotted" },
  { id: "1", beats: 1, kind: "plain" },
  { id: "t1", beats: 2 / 3, kind: "triplet" },
  { id: "d1/2", beats: 0.75, kind: "dotted" },
  { id: "1/2", beats: 0.5, kind: "plain" },
  { id: "t1/2", beats: 1 / 3, kind: "triplet" },
  { id: "d1/4", beats: 0.375, kind: "dotted" },
  { id: "1/4", beats: 0.25, kind: "plain" },
  { id: "q5", beats: 1 / 5, kind: "tuplet" },
  { id: "t1/4", beats: 1 / 6, kind: "triplet" },
  { id: "q7", beats: 1 / 7, kind: "tuplet" },
  { id: "1/8", beats: 0.125, kind: "plain" },
  { id: "t1/8", beats: 1 / 12, kind: "triplet" },
  { id: "1/16", beats: 0.0625, kind: "plain" },
] as const;
export type SnapId = (typeof SNAPS)[number]["id"];
export const isSnapId = (v: unknown): v is SnapId => SNAPS.some((s) => s.id === v);

/** The snap step in ticks (free = 1 tick). */
export function snapTicks(ts: TimeSig, id: SnapId): number {
  const s = SNAPS.find((x) => x.id === id) ?? SNAPS[4];
  if (s.kind === "free") return 1;
  if (s.kind === "bar") return measureTicks(ts);
  if (s.kind === "half-bar") return measureTicks(ts) / 2;
  return beatTicks(ts) * s.beats;
}

/** The note value a step is, in this time signature: "1/8", "dotted 1/4", "1/8 triplet"… */
export function snapName(ts: TimeSig, id: SnapId): string {
  const s = SNAPS.find((x) => x.id === id) ?? SNAPS[4];
  if (s.kind === "free") return "Free (no snap)";
  if (s.kind === "bar") return "Bar";
  if (s.kind === "half-bar") return "Half bar";
  const note = (beats: number) => `1/${Math.round(ts.unit / beats)}`;
  const beatsText = (b: number) => (b === 1 ? "1 beat" : b === 1.5 ? "1½ beats" : b === 0.5 ? "½ beat" : b === 0.25 ? "¼ beat" : b === 0.75 ? "¾ beat" : b === 0.125 ? "⅛ beat" : b === 0.375 ? "⅜ beat" : b === 0.0625 ? "1/16 beat" : `${+b.toFixed(3)} beat`);
  switch (s.kind) {
    case "plain":
      return `${note(s.beats)} · ${beatsText(s.beats)}`;
    case "dotted":
      return `Dotted ${note(s.beats / 1.5)} · ${beatsText(s.beats)}`;
    case "triplet":
      return `${note(s.beats * 1.5)} triplet · ${s.beats > 0.5 ? "3 per 2 beats" : `${Math.round(1 / s.beats)} per beat`}`;
    case "tuplet":
      return `${Math.round(1 / s.beats) === 5 ? "Quintuplet" : "Septuplet"} · ${Math.round(1 / s.beats)} per beat`;
  }
}

/** 1-based bar / beat and 0-based tick-within-beat, the way a DAW counter reads. */
export function toBarBeat(ticks: number, ts: TimeSig) {
  const m = measureTicks(ts);
  const b = beatTicks(ts);
  const bar = Math.floor(ticks / m);
  const inBar = ticks - bar * m;
  const beat = Math.floor(inBar / b);
  return { bar: bar + 1, beat: beat + 1, tick: inBar - beat * b };
}

export const fromBarBeat = (bar: number, beat: number, ts: TimeSig, tick = 0) =>
  (bar - 1) * measureTicks(ts) + (beat - 1) * beatTicks(ts) + tick;

/** Human-readable length: "2 bars", "1 bar 2 beats", "3 beats", "1½ beats". */
export function describeLength(ticks: number, ts: TimeSig): string {
  const m = measureTicks(ts);
  const b = beatTicks(ts);
  const bars = Math.floor((ticks + 0.5) / m);
  const rest = Math.max(0, ticks - bars * m);
  const whole = Math.floor((rest + 0.5) / b);
  const frac = beatFraction(Math.max(0, Math.round(rest - whole * b)), ts);
  const pretty: Record<string, string> = { "1/4": "¼", "1/3": "⅓", "1/2": "½", "2/3": "⅔", "3/4": "¾", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞", "1/5": "⅕", "1/6": "⅙", "5/6": "⅚" };
  let beatStr = "";
  if (frac.endsWith("ticks")) beatStr = whole ? `${whole} beat${whole === 1 ? "" : "s"} + ${frac}` : frac;
  else if (whole || frac) beatStr = `${whole || ""}${frac ? (pretty[frac] ?? (whole ? ` ${frac}` : frac)) : ""} beat${whole === 1 && !frac ? "" : "s"}`;
  const barStr = bars ? `${bars} bar${bars === 1 ? "" : "s"}` : "";
  return [barStr, beatStr].filter(Boolean).join(" ") || "0 beats";
}

/* ------------------------------------------------------------------ chords */

export interface ChordEvent {
  id: string;
  start: number;
  duration: number;
  rootName: string;
  degrees: Degree[];
  /** Display name, e.g. "Cmaj7". */
  label: string;
  /** Optional explicit pitches (e.g. a fretboard voicing); otherwise a close voicing is built. */
  midis?: number[];
}

/** Default close-position voicing: root around C3, chord tones stacked above it. */
export function chordMidis(c: Pick<ChordEvent, "rootName" | "degrees" | "midis">): number[] {
  if (c.midis?.length) return [...c.midis];
  const base = 48 + rootByName(c.rootName).pc;
  return [...new Set(c.degrees.map((d) => base + degreeToSemitones(d)))].sort((a, b) => a - b);
}

/** Sort by start and clip each chord so it never runs past the arrangement end. */
export function normalizeChords(chords: ChordEvent[], lengthTicks: number): ChordEvent[] {
  return chords
    .filter((c) => c.start < lengthTicks && c.duration > 0)
    .map((c) => ({ ...c, duration: Math.min(c.duration, lengthTicks - c.start) }))
    .sort((a, b) => a.start - b.start);
}

/**
 * Re-time chords for a new time signature keeping their place in the bar: a chord on bar 3,
 * halfway through, stays on bar 3 halfway through; a 1-bar chord stays 1 bar. Results snap to
 * the new grid and never overlap or run past `newLengthTicks`.
 */
export function retimeChords(chords: ChordEvent[], from: TimeSig, to: TimeSig, snapTo: SnapId, newLengthTicks: number): ChordEvent[] {
  const mFrom = measureTicks(from);
  const mTo = measureTicks(to);
  // Re-timing never goes finer than a 16th of a beat (free snap would keep odd ticks).
  const step = Math.max(snapTicks(to, snapTo), beatTicks(to) / 16);
  const out: ChordEvent[] = [];
  for (const c of [...chords].sort((a, b) => a.start - b.start)) {
    const start = snap((c.start / mFrom) * mTo, step);
    const end = snap(((c.start + c.duration) / mFrom) * mTo, step);
    const prevEnd = out.length ? out[out.length - 1]!.start + out[out.length - 1]!.duration : 0;
    const s = Math.max(start, prevEnd);
    const e = Math.min(newLengthTicks, Math.max(end, Math.round(s + step)));
    if (s < newLengthTicks && e > s) out.push({ ...c, start: s, duration: e - s });
  }
  return out;
}

/** The chord sounding at a tick (latest-starting one if they overlap), or null in a rest. */
export function chordAt(chords: ChordEvent[], tick: number): ChordEvent | null {
  let hit: ChordEvent | null = null;
  for (const c of chords) if (c.start <= tick && tick < c.start + c.duration && (!hit || c.start >= hit.start)) hit = c;
  return hit;
}

/**
 * Longest a chord at `start` can be without running into the next chord or the end.
 * Used by the editor so placing/resizing never silently overlaps a neighbour.
 */
export function roomAfter(chords: ChordEvent[], start: number, lengthTicks: number, ignoreId?: string): number {
  const next = chords.filter((c) => c.id !== ignoreId && c.start > start).reduce((m, c) => Math.min(m, c.start), lengthTicks);
  return Math.max(0, next - start);
}

/** True when a span would overlap another chord (other than `ignoreId`). */
export function overlaps(chords: ChordEvent[], start: number, duration: number, ignoreId?: string): boolean {
  return chords.some((c) => c.id !== ignoreId && start < c.start + c.duration && c.start < start + duration);
}

/* ------------------------------------------------------------------ drums */

export type DrumVoice = "kick" | "snare" | "closedHat" | "openHat" | "clap" | "lowTom" | "highTom" | "rim" | "crash" | "ride";

export interface DrumHit {
  step: number;
  /** 0..1 */
  velocity: number;
}

export interface DrumLane {
  id: string;
  voice: DrumVoice;
  name: string;
  hits: DrumHit[];
  muted: boolean;
  solo: boolean;
  /** 0..1 lane volume. */
  gain: number;
  /** Id of a user sample in the sample store; when set it replaces the built-in sound. */
  sampleId?: string;
  sampleName?: string;
}

export interface DrumPattern {
  measures: number;
  /** Grid steps per beat (2 = 8ths in 4/4, 3 = triplets, 4 = 16ths). */
  stepsPerBeat: Grid;
  lanes: DrumLane[];
}

export const stepTicks = (ts: TimeSig, p: Pick<DrumPattern, "stepsPerBeat">) => beatTicks(ts) / p.stepsPerBeat;
export const patternSteps = (ts: TimeSig, p: Pick<DrumPattern, "measures" | "stepsPerBeat">) => p.measures * ts.beats * p.stepsPerBeat;

/**
 * Change a pattern's grid or length keeping every hit at the same musical time (a 16th-note
 * hit on beat 2 stays on beat 2 on an 8th grid); hits that no longer land on the grid snap to
 * the nearest step (first one wins), and hits past a shortened pattern are dropped.
 */
export function resizePattern(p: DrumPattern, ts: TimeSig, next: { measures?: number; stepsPerBeat?: Grid }): DrumPattern {
  const spb = next.stepsPerBeat ?? p.stepsPerBeat;
  const measures = next.measures ?? p.measures;
  const total = measures * ts.beats * spb;
  const lanes = p.lanes.map((l) => {
    const byStep = new Map<number, DrumHit>();
    for (const h of [...l.hits].sort((a, b) => a.step - b.step)) {
      const step = Math.round((h.step * spb) / p.stepsPerBeat);
      if (step < total && !byStep.has(step)) byStep.set(step, { ...h, step });
    }
    return { ...l, hits: [...byStep.values()] };
  });
  return { ...p, measures, stepsPerBeat: spb, lanes };
}

/** Lanes that should sound: solo wins over everything, otherwise every unmuted lane. */
export function audibleLanes(p: DrumPattern): DrumLane[] {
  const soloed = p.lanes.filter((l) => l.solo);
  return soloed.length ? soloed : p.lanes.filter((l) => !l.muted);
}

/* ------------------------------------------------------------------ arrangement */

export interface Arrangement {
  bpm: number;
  ts: TimeSig;
  /** Length of the arrangement (and of the chord lane) in measures. */
  measures: number;
  chords: ChordEvent[];
  drums: DrumPattern;
  /** Bars of count-in clicks before the first downbeat. */
  countIn: 0 | 1 | 2;
  metronome: boolean;
  loop: boolean;
  /** Chord playback: strum the notes low→high by this many ms (0 = block chord). */
  strumMs: number;
}

export const arrangementTicks = (a: Pick<Arrangement, "measures" | "ts">) => a.measures * measureTicks(a.ts);

/** Just the drum pattern, looping on its own (no chords, no count-in): the drum section's Play. */
export const drumsOnly = (a: Arrangement): Arrangement => ({ ...a, chords: [], measures: Math.max(1, a.drums.measures), countIn: 0, loop: true });

export type ScheduledEvent =
  | { kind: "chord"; tick: number; duration: number; midis: number[]; velocity: number; chordId: string }
  | { kind: "drum"; tick: number; duration: number; laneId: string; voice: DrumVoice; velocity: number }
  | { kind: "click"; tick: number; duration: number; accent: boolean; countIn: boolean };

/**
 * Every event of one pass through the arrangement, in ticks from the first downbeat
 * (count-in clicks have negative ticks). The single source for playback and MIDI export.
 *
 * Length rule: the arrangement is `measures` long. A shorter drum pattern repeats to fill it
 * (4 bars of drums under 8 bars of chords plays twice); a longer one is cut at the end.
 */
export function scheduleArrangement(a: Arrangement, opts: { metronome?: boolean; countIn?: boolean } = {}): ScheduledEvent[] {
  const len = arrangementTicks(a);
  const out: ScheduledEvent[] = [];
  const beat = beatTicks(a.ts);
  const clickLen = Math.min(beat / 4, PPQ / 8);

  if (opts.countIn ?? true) {
    const ci = a.countIn * measureTicks(a.ts);
    for (let t = 0; t < ci; t += beat)
      out.push({ kind: "click", tick: t - ci, duration: clickLen, accent: t % measureTicks(a.ts) === 0, countIn: true });
  }
  if (opts.metronome ?? a.metronome)
    for (let t = 0; t < len; t += beat)
      out.push({ kind: "click", tick: t, duration: clickLen, accent: t % measureTicks(a.ts) === 0, countIn: false });

  for (const c of normalizeChords(a.chords, len))
    out.push({ kind: "chord", tick: c.start, duration: c.duration, midis: chordMidis(c), velocity: 0.8, chordId: c.id });

  const p = a.drums;
  const st = stepTicks(a.ts, p);
  const patLen = patternSteps(a.ts, p) * st;
  if (patLen > 0)
    for (const lane of audibleLanes(p))
      for (let rep = 0; rep * patLen < len; rep++)
        for (const h of lane.hits) {
          const tick = rep * patLen + h.step * st;
          if (h.step < patternSteps(a.ts, p) && tick < len)
            out.push({ kind: "drum", tick, duration: st, laneId: lane.id, voice: lane.voice, velocity: Math.max(0, Math.min(1, h.velocity * lane.gain)) });
        }

  return out.sort((x, y) => x.tick - y.tick);
}

export const ticksToSeconds = (ticks: number, bpm: number) => (ticks / PPQ) * (60 / bpm);

/* ------------------------------------------------------------------ defaults */

export const newId = () => Math.random().toString(36).slice(2, 10);

export const DRUM_VOICES: { voice: DrumVoice; name: string; midi: number }[] = [
  // midi = General MIDI drum note, used by MIDI export so GarageBand maps each lane to the right drum.
  { voice: "kick", name: "Kick", midi: 36 },
  { voice: "snare", name: "Snare", midi: 38 },
  { voice: "closedHat", name: "Closed hat", midi: 42 },
  { voice: "openHat", name: "Open hat", midi: 46 },
  { voice: "clap", name: "Clap", midi: 39 },
  { voice: "rim", name: "Rim", midi: 37 },
  { voice: "lowTom", name: "Low tom", midi: 45 },
  { voice: "highTom", name: "High tom", midi: 50 },
  { voice: "crash", name: "Crash", midi: 49 },
  { voice: "ride", name: "Ride", midi: 51 },
];

export function emptyLanes(): DrumLane[] {
  return DRUM_VOICES.slice(0, 7).map((v) => ({ id: newId(), voice: v.voice, name: v.name, hits: [], muted: false, solo: false, gain: 0.9 }));
}

export function emptyArrangement(): Arrangement {
  return {
    bpm: 90,
    ts: { beats: 4, unit: 4 },
    measures: 4,
    chords: [],
    drums: { measures: 1, stepsPerBeat: 4, lanes: emptyLanes() },
    countIn: 1,
    metronome: false,
    loop: true,
    strumMs: 18,
  };
}
