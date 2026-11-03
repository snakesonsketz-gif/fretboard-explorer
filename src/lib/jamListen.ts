/**
 * Hearing a strummed progression: given the microphone samples and the beat times of the click
 * the player strummed along to, name the chord on every beat and join them into a progression.
 * Pure (sample arrays in, chords out) so it can be tested with synthetic guitar sounds.
 */
import { detectNotes, rms, spectrumOf } from "@/lib/listen/dsp";
import { chordDef, makeChord, type JamChord } from "@/lib/jam";
import { ROOTS } from "@/lib/theory";

/** Chord types the listener chooses between (common strummed chords), with their pitch-class intervals. */
const QUALITIES: { id: string; iv: number[]; extra: number }[] = [
  { id: "maj", iv: [0, 4, 7], extra: 0 },
  { id: "min", iv: [0, 3, 7], extra: 0 },
  { id: "7", iv: [0, 4, 7, 10], extra: 0.06 },
  { id: "maj7", iv: [0, 4, 7, 11], extra: 0.06 },
  { id: "m7", iv: [0, 3, 7, 10], extra: 0.06 },
  { id: "sus4", iv: [0, 5, 7], extra: 0.04 },
  { id: "sus2", iv: [0, 2, 7], extra: 0.04 },
  { id: "5", iv: [0, 7], extra: 0.02 },
  { id: "dim", iv: [0, 3, 6], extra: 0.08 },
  { id: "m7b5", iv: [0, 3, 6, 10], extra: 0.1 },
  { id: "6", iv: [0, 4, 7, 9], extra: 0.1 },
  { id: "add9", iv: [0, 2, 4, 7], extra: 0.1 },
];
/** Root names as a guitarist writes them. */
const NAME = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export interface BeatChord {
  /** null = nothing (or too quiet) on this beat. */
  rootPc: number | null;
  chordId: string;
  bassPc: number | null;
  /** 0..1 how well the best chord explains what was heard. */
  confidence: number;
  pcs: number[];
}

/** Best chord for a pitch-class strength profile (0..1 per pitch class) and the bass note heard. */
export function chordFromProfile(pcs: number[], bassPc: number | null): Omit<BeatChord, "pcs"> {
  const max = Math.max(...pcs, 1e-9);
  const s = pcs.map((v) => v / max);
  let best = { rootPc: 0, chordId: "maj", score: -Infinity };
  for (let r = 0; r < 12; r++)
    for (const q of QUALITIES) {
      const tones = new Set(q.iv.map((i) => (r + i) % 12));
      let score = 0;
      for (let pc = 0; pc < 12; pc++) {
        const v = s[pc]!;
        if (tones.has(pc)) score += pc === r ? 1.25 * v : v;
        else score -= 0.9 * v;
      }
      for (const t of tones) if (s[t]! < 0.12) score -= 0.55; // a chord tone that isn't there
      if (bassPc === r) score += 0.35; // the root in the bass is the usual case
      score -= q.extra;
      if (score > best.score) best = { rootPc: r, chordId: q.id, score };
    }
  const tones = chordDef(best.chordId).degrees.length;
  const confidence = Math.max(0, Math.min(1, best.score / (tones * 0.9 + 0.35)));
  // The lowest note only helps pick the root: a guitar's low fundamentals are often too weak to
  // trust for naming a slash chord, so those are left for the player to add.
  return { rootPc: best.rootPc, chordId: best.chordId, bassPc: null, confidence };
}

/**
 * Name the chord on each beat. `startFrame` is the absolute frame of samples[0]; `beats` are the
 * beat times in frames (same clock), and `beatFrames` the length of one beat.
 */
export function chordsPerBeat(samples: Float32Array, sr: number, startFrame: number, beats: number[], beatFrames: number): BeatChord[] {
  const N = sr > 60000 ? 16384 : 8192;
  const quiet = 0.004;
  return beats.map((b) => {
    // Skip the first ~60 ms (the pick attack and the click), then look at up to 3 frames.
    const from = Math.round(b - startFrame + 0.06 * sr);
    const to = Math.round(b - startFrame + beatFrames * 0.95);
    if (from < 0 || from + N / 2 > samples.length || to - from < N / 4) return { rootPc: null, chordId: "maj", bassPc: null, confidence: 0, pcs: [] };
    if (rms(samples, from, to) < quiet) return { rootPc: null, chordId: "maj", bassPc: null, confidence: 0, pcs: [] };
    const pcs = new Array<number>(12).fill(0);
    const bassVotes = new Array<number>(12).fill(0);
    const steps = Math.max(1, Math.min(3, Math.floor((to - from) / (N / 2))));
    for (let k = 0; k < steps; k++) {
      const at = from + Math.round(((to - from - N) * k) / Math.max(1, steps - 1 || 1));
      const frame = new Float32Array(N);
      frame.set(samples.subarray(Math.max(0, at), Math.min(samples.length, Math.max(0, at) + N)));
      const det = detectNotes(spectrumOf(frame, sr), { maxNotes: 6, minRelative: 0.12 });
      for (let pc = 0; pc < 12; pc++) pcs[pc]! += det.pcs[pc]!;
      const strong = det.notes.filter((n) => n.strength >= 0.25).sort((a, b) => a.midi - b.midi);
      if (strong[0]) bassVotes[strong[0].pc]! += 1;
    }
    if (Math.max(...pcs) <= 0) return { rootPc: null, chordId: "maj", bassPc: null, confidence: 0, pcs };
    const topBass = bassVotes.indexOf(Math.max(...bassVotes));
    const bassPc = bassVotes[topBass]! > 0 ? topBass : null;
    return { ...chordFromProfile(pcs, bassPc), pcs };
  });
}

const same = (a: BeatChord, b: BeatChord) => a.rootPc === b.rootPc && a.chordId === b.chordId && a.bassPc === b.bassPc;

/**
 * Join beats into a progression: smooth one-beat blips between two equal chords, drop silence at
 * the start and end, and give each chord its length in beats.
 */
export function beatsToProgression(beats: BeatChord[]): JamChord[] {
  const b = beats.map((x) => ({ ...x }));
  for (let i = 1; i < b.length - 1; i++) if (!same(b[i]!, b[i - 1]!) && same(b[i - 1]!, b[i + 1]!)) b[i] = { ...b[i - 1]! };
  // A silent beat inside a chord keeps the chord ringing.
  for (let i = 1; i < b.length; i++) if (b[i]!.rootPc === null && b[i - 1]!.rootPc !== null) b[i] = { ...b[i - 1]! };
  let start = b.findIndex((x) => x.rootPc !== null);
  if (start < 0) return [];
  let end = b.length - 1;
  while (end > start && beats[end]!.rootPc === null) end--;
  const out: JamChord[] = [];
  for (let i = start; i <= end; i++) {
    const x = b[i]!;
    const last = out[out.length - 1];
    const prev = i > start ? b[i - 1]! : null;
    if (last && prev && same(prev, x)) {
      last.beats += 1;
      continue;
    }
    out.push(makeChord(NAME[x.rootPc!]!, x.chordId, 1, x.bassPc !== null ? NAME[x.bassPc] : undefined));
  }
  start = 0;
  return out.filter((c) => ROOTS.some((r) => r.name === c.rootName));
}
