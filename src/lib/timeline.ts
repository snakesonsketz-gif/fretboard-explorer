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

/** Grid resolution as divisions of one beat: 1 = beats, 2 = halves, 3 = triplets, 4 = quarters of a beat. */
export type Grid = 1 | 2 | 3 | 4;
export const gridTicks = (ts: TimeSig, grid: Grid) => beatTicks(ts) / grid;

export const snap = (ticks: number, step: number) => Math.round(ticks / step) * step;
export const snapDown = (ticks: number, step: number) => Math.floor(ticks / step) * step;

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
  const bars = Math.floor(ticks / m);
  const beats = (ticks - bars * m) / b;
  const beatStr = beats === 0 ? "" : `${Number.isInteger(beats) ? beats : fmtFraction(beats)} beat${beats === 1 ? "" : "s"}`;
  const barStr = bars ? `${bars} bar${bars === 1 ? "" : "s"}` : "";
  return [barStr, beatStr].filter(Boolean).join(" ") || "0 beats";
}
function fmtFraction(x: number): string {
  const whole = Math.floor(x);
  const frac = x - whole;
  const map: [number, string][] = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
  const hit = map.find(([v]) => Math.abs(v - frac) < 1e-6);
  return hit ? `${whole || ""}${hit[1]}` : x.toFixed(2);
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
export function retimeChords(chords: ChordEvent[], from: TimeSig, to: TimeSig, grid: Grid, newLengthTicks: number): ChordEvent[] {
  const mFrom = measureTicks(from);
  const mTo = measureTicks(to);
  const step = gridTicks(to, grid);
  const out: ChordEvent[] = [];
  for (const c of [...chords].sort((a, b) => a.start - b.start)) {
    const start = snap((c.start / mFrom) * mTo, step);
    const end = snap(((c.start + c.duration) / mFrom) * mTo, step);
    const prevEnd = out.length ? out[out.length - 1]!.start + out[out.length - 1]!.duration : 0;
    const s = Math.max(start, prevEnd);
    const e = Math.min(newLengthTicks, Math.max(end, s + step));
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
