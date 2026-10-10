/**
 * Listen-mode signal analysis (pure functions on sample arrays, no browser APIs).
 *
 * - spectrumOf: windowed magnitude spectrum via Meyda.
 * - detectNotes: which notes are sounding, by iterative harmonic subtraction (pick the note whose
 *   harmonic series best explains the spectrum, remove that series, repeat) — more robust than a
 *   raw chroma, where a C's 3rd harmonic reads as a G.
 * - detectOnsets: strum times from spectral flux, refined on the waveform.
 * - ringProfile: how long the chord and each of its notes keep sounding.
 * - harmonicRatio: how much of the sound is explained by the notes (clarity vs buzz/noise).
 */
import Meyda from "meyda";

type MeydaLike = { bufferSize: number; sampleRate: number; windowingFunction: string; extract: (f: string | string[], s: Float32Array) => unknown };
const M = Meyda as unknown as MeydaLike;

export const LOWEST_MIDI = 38; // D2 (drop D)
export const HIGHEST_MIDI = 88; // E6

export interface Spectrum {
  mags: Float32Array;
  sr: number;
  n: number;
}

export const midiToHz = (m: number, cents = 0) => 440 * 2 ** ((m - 69 + cents / 100) / 12);
export const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/** Magnitude spectrum of `frame` (length must be a power of two). */
export function spectrumOf(frame: Float32Array, sr: number): Spectrum {
  if (!isPow2(frame.length)) throw new Error("frame length must be a power of two");
  M.bufferSize = frame.length;
  M.sampleRate = sr;
  M.windowingFunction = "blackman";
  const mags = M.extract("amplitudeSpectrum", frame.slice()) as Float32Array;
  return { mags: Float32Array.from(mags), sr, n: frame.length };
}

export function rms(x: Float32Array, from = 0, to = x.length): number {
  let s = 0;
  const a = Math.max(0, from), b = Math.min(x.length, to);
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return b > a ? Math.sqrt(s / (b - a)) : 0;
}
export const dbfs = (v: number) => 20 * Math.log10(Math.max(v, 1e-9));

/** Largest magnitude within ±tol cents of `hz` (at least ±1 bin). */
function peakNear(s: Spectrum, hz: number, tolCents: number): { mag: number; bin: number } {
  const binHz = s.sr / s.n;
  const lo = Math.max(1, Math.floor(Math.min(hz * 2 ** (-tolCents / 1200), hz - binHz) / binHz));
  const hi = Math.min(s.mags.length - 2, Math.ceil(Math.max(hz * 2 ** (tolCents / 1200), hz + binHz) / binHz));
  let bin = lo, mag = 0;
  for (let k = lo; k <= hi; k++)
    if (s.mags[k]! > mag) {
      mag = s.mags[k]!;
      bin = k;
    }
  return { mag, bin };
}

/** Parabolic interpolation of a spectral peak → precise frequency. */
function refine(s: Spectrum, bin: number): number {
  const a = s.mags[bin - 1] ?? 0, b = s.mags[bin]!, c = s.mags[bin + 1] ?? 0;
  const den = a - 2 * b + c;
  const p = den === 0 ? 0 : (0.5 * (a - c)) / den;
  return ((bin + Math.max(-0.5, Math.min(0.5, p))) * s.sr) / s.n;
}

export interface DetectedNote {
  midi: number;
  pc: number;
  /** Salience relative to the strongest note (1 = strongest). */
  strength: number;
  /** Measured deviation from equal temperament (cents). */
  cents: number;
}

export interface NoteDetection {
  notes: DetectedNote[];
  /** Strength per pitch class (0..1, max over octaves). */
  pcs: number[];
  /** Overall tuning offset of the instrument in cents (median of the strongest partials). */
  tuningCents: number;
  /** Raw salience of the strongest note (for loudness/confidence gates). */
  topSalience: number;
}

/** Partials are considered up to this frequency for every candidate note. */
const F_MAX = 4500;
/**
 * Partial weight (Klapuri 2006): g = (f0 + a) / (h·f0 + b). Summing all partials up to F_MAX with
 * this weight lets a real low note's full harmonic series outscore the octave above it, which
 * only owns the even partials.
 */
const weight = (f0: number, h: number) => (f0 + 27) / (h * f0 + 320);

interface Explained {
  notes: DetectedNote[];
  top: number;
}

/**
 * Iterative estimation and cancellation: repeatedly take the candidate note whose harmonic series
 * best explains the (whitened) spectrum, record it, then remove its whole series. `allow` limits
 * which notes may be chosen; `ref` is the salience that counts as strength 1.
 */
function explain(work: Float32Array, s: Spectrum, tuningCents: number, tol: number, allow: (m: number) => boolean, maxNotes: number, minRel: number, ref?: number): Explained {
  const W: Spectrum = { ...s, mags: work };
  const notes: DetectedNote[] = [];
  let top = ref ?? 0;
  for (let it = 0; it < maxNotes; it++) {
    let best = -1, bestSal = 0;
    for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) {
      if (!allow(m)) continue;
      const sal = salience(W, m, tuningCents, tol);
      if (sal > bestSal) {
        bestSal = sal;
        best = m;
      }
    }
    if (best < 0 || bestSal <= 0) break;
    if (!top) top = bestSal;
    if (bestSal < minRel * top) break;
    const f0 = midiToHz(best, tuningCents);
    const fund = peakNear(s, f0, tol);
    const cents = fund.mag > 0 ? 1200 * Math.log2(refine(s, fund.bin) / midiToHz(best)) : tuningCents;
    notes.push({ midi: best, pc: best % 12, strength: bestSal / top, cents });
    cancel(W, best, tuningCents, tol);
  }
  return { notes, top };
}

/** Weighted sum of a candidate's partials; 0 if it has no fundamental / 2nd partial of its own. */
function salience(W: Spectrum, m: number, tuningCents: number, tol: number): number {
  const f0 = midiToHz(m, tuningCents);
  let sal = 0;
  for (let h = 1; h * f0 < Math.min(F_MAX, W.sr * 0.45); h++) sal += weight(f0, h) * peakNear(W, h * f0, tol).mag;
  // A real note needs its own fundamental (or 2nd partial) — rejects "ghost" notes built only
  // from other notes' upper harmonics.
  const own = Math.max(peakNear(W, f0, tol).mag, peakNear(W, 2 * f0, tol).mag);
  return own < 0.12 * sal ? 0 : sal;
}

/** Remove a note's harmonic series (±4 bins: the Blackman main lobe is ±3). */
function cancel(W: Spectrum, m: number, tuningCents: number, tol: number) {
  const f0 = midiToHz(m, tuningCents);
  for (let h = 1; h * f0 < Math.min(F_MAX * 1.3, W.sr * 0.45); h++) {
    const { bin } = peakNear(W, h * f0, tol);
    for (let k = Math.max(1, bin - 4); k <= Math.min(W.mags.length - 1, bin + 4); k++) W.mags[k]! *= 0.05;
  }
}

/**
 * Blind detection (no target): what notes are sounding? Used for the live "you're playing" view.
 * Less certain than checkChord — overtones can look like notes — so callers should treat weak
 * results as a guess.
 */
export function detectNotes(s: Spectrum, opts: { maxNotes?: number; minRelative?: number; tolCents?: number } = {}): NoteDetection {
  const tol = opts.tolCents ?? 35;
  const tuningCents = estimateTuning(s);
  const { notes, top } = explain(whiten(s), s, tuningCents, tol, () => true, opts.maxNotes ?? 7, opts.minRelative ?? 0.1);
  const pcs = new Array<number>(12).fill(0);
  for (const n of notes) pcs[n.pc] = Math.max(pcs[n.pc]!, n.strength);
  return { notes, pcs, tuningCents, topSalience: top };
}

export interface ChordCheck {
  /** Per target pitch class: strength relative to the strongest chord note (0 = not heard). */
  target: { pc: number; strength: number; octaves: number[] }[];
  /** Notes heard that are not in the chord, after the chord's own overtones were removed. */
  extras: { pc: number; midi: number; strength: number }[];
  tuningCents: number;
  /** Raw salience of the strongest chord note (0 = nothing recognisable). */
  topSalience: number;
}

/**
 * Check a strum against an intended chord. The chord's notes are explained first (strongest
 * first, each removing its whole overtone series), and only what is left over is searched for
 * wrong notes — so a chord note's overtones are not reported as mistakes.
 */
export function checkChord(s: Spectrum, targetPcs: number[], opts: { tolCents?: number } = {}): ChordCheck {
  const tol = opts.tolCents ?? 35;
  const tuningCents = estimateTuning(s);
  const work = whiten(s);
  const want = new Set(targetPcs.map((p) => ((p % 12) + 12) % 12));
  const chord = explain(work, s, tuningCents, tol, (m) => want.has(m % 12), 14, 0.08);
  const W: Spectrum = { ...s, mags: work };
  const target = [...want].map((pc) => {
    const heard = chord.notes.filter((n) => n.pc === pc);
    // Faint evidence left in the residual (a weak or half-muted string) still counts as "some".
    let faint = 0;
    if (!heard.length && chord.top)
      // Tight 20-cent window: faint evidence must sit on the note itself, not on a neighbour's
      // overtone (G's 7th partial is 31 cents from F).
      for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) if (m % 12 === pc) faint = Math.max(faint, salience(W, m, tuningCents, 20) / chord.top);
    return { pc, strength: heard.length ? Math.max(...heard.map((n) => n.strength)) : Math.min(faint, 0.079), octaves: heard.map((n) => n.midi) };
  });
  const rest = chord.top ? explain(work, s, tuningCents, tol, (m) => !want.has(m % 12), 4, 0.04, chord.top) : { notes: [] };
  const extras = rest.notes.map((n) => ({ pc: n.pc, midi: n.midi, strength: n.strength }));
  return { target, extras, tuningCents, topSalience: chord.top };
}

/**
 * Spectral whitening (Klapuri 2006): divide by a smoothed spectral envelope (±1/3 octave) raised to
 * 0.67, so quiet upper partials count and a dull or bright guitar is judged the same way.
 */
export function whiten(s: Spectrum): Float32Array {
  const n = s.mags.length;
  const pow = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) pow[k + 1] = pow[k]! + s.mags[k]! * s.mags[k]!;
  const out = new Float32Array(n);
  const r = 2 ** (1 / 6);
  for (let k = 1; k < n; k++) {
    const lo = Math.max(1, Math.floor(k / r)), hi = Math.min(n - 1, Math.max(lo + 2, Math.ceil(k * r)));
    const env = Math.sqrt((pow[hi + 1]! - pow[lo]!) / (hi - lo + 1));
    out[k] = s.mags[k]! / (env ** 0.67 + 1e-6);
  }
  return out;
}

/** Median cents deviation of the strongest spectral peaks from the nearest equal-tempered pitch. */
export function estimateTuning(s: Spectrum): number {
  const lo = Math.ceil((70 * s.n) / s.sr), hi = Math.floor((1400 * s.n) / s.sr);
  const peaks: { bin: number; mag: number }[] = [];
  for (let k = lo; k <= hi; k++) {
    const v = s.mags[k]!;
    if (v > s.mags[k - 1]! && v >= s.mags[k + 1]!) peaks.push({ bin: k, mag: v });
  }
  peaks.sort((a, b) => b.mag - a.mag);
  const devs = peaks.slice(0, 8).map((p) => {
    const midi = 69 + 12 * Math.log2(refine(s, p.bin) / 440);
    return (midi - Math.round(midi)) * 100;
  });
  if (!devs.length) return 0;
  devs.sort((a, b) => a - b);
  return devs[Math.floor(devs.length / 2)]!;
}

/**
 * Fraction of spectral energy (70 Hz–5 kHz) that sits on the harmonics of the given notes.
 * Clean ringing strings score high; fret buzz, muted thuds and noise score lower.
 */
export function harmonicRatio(s: Spectrum, midis: number[], tuningCents = 0, tolCents = 30): number {
  const binHz = s.sr / s.n;
  const lo = Math.ceil(70 / binHz), hi = Math.min(s.mags.length - 1, Math.floor(5000 / binHz));
  const on = new Uint8Array(s.mags.length);
  for (const m of midis) {
    const f0 = midiToHz(m, tuningCents);
    for (let h = 1; h <= 12 && h * f0 < 5000; h++) {
      const c = (h * f0) / binHz, w = Math.max(2, (c * (2 ** (tolCents / 1200) - 1)));
      for (let k = Math.max(lo, Math.floor(c - w)); k <= Math.min(hi, Math.ceil(c + w)); k++) on[k] = 1;
    }
  }
  let total = 0, explained = 0;
  for (let k = lo; k <= hi; k++) {
    const e = s.mags[k]! * s.mags[k]!;
    total += e;
    if (on[k]) explained += e;
  }
  return total > 0 ? explained / total : 0;
}

/** Absolute noise floor (median power, 1.5–6 kHz). Compare a strum's sustain against the room. */
export function bandFloor(s: Spectrum): number {
  const binHz = s.sr / s.n;
  const lo = Math.ceil(1500 / binHz), hi = Math.min(s.mags.length - 1, Math.floor(6000 / binHz));
  const p: number[] = [];
  for (let k = lo; k <= hi; k++) p.push(s.mags[k]! * s.mags[k]!);
  p.sort((a, b) => a - b);
  return p[Math.floor(p.length / 2)]! + 1e-20;
}

/**
 * Buzz / noise floor in 1.5–6 kHz, measured in the sustain (after the pick noise has died away).
 * A clean chord there is a set of sharp overtone peaks over a low floor; fret buzz, rattles and
 * room noise fill in between them. Returns the floor (median power) relative to the peaks
 * (top 2% power) in dB: very negative = clean, closer to 0 = noisy.
 */
export function noiseFloorDb(s: Spectrum): number {
  const binHz = s.sr / s.n;
  const lo = Math.ceil(1500 / binHz), hi = Math.min(s.mags.length - 1, Math.floor(6000 / binHz));
  const p: number[] = [];
  for (let k = lo; k <= hi; k++) p.push(s.mags[k]! * s.mags[k]!);
  p.sort((a, b) => a - b);
  const floor = p[Math.floor(p.length / 2)]! + 1e-20;
  const peaks = p.slice(Math.floor(p.length * 0.98)).reduce((a, b) => a + b, 0) / Math.max(1, p.length - Math.floor(p.length * 0.98)) + 1e-20;
  return 10 * Math.log10(floor / peaks);
}

/**
 * Strum onsets (sample indices). A pick attack is a burst of high-frequency energy, while a chord
 * that is still ringing has lost most of its highs, so the detector looks for a jump in
 * high-passed energy relative to the previous ~40 ms. Each onset is then refined on the waveform.
 */
export function detectOnsets(x: Float32Array, sr: number, opts: { minGap?: number; floorDb?: number; jump?: number } = {}): number[] {
  const hop = Math.round(sr * 0.005); // 5 ms frames
  const minGap = Math.round((opts.minGap ?? 0.1) * sr);
  const floor = 10 ** ((opts.floorDb ?? -50) / 20);
  const jump = opts.jump ?? 1.0; // natural-log ratio: e^1 ≈ 2.7× more high-frequency energy
  // Second difference ≈ high-pass (rises 12 dB/octave), enough to separate attacks from ring.
  const hp = new Float32Array(x.length);
  for (let i = 2; i < x.length; i++) hp[i] = x[i]! - 2 * x[i - 1]! + x[i - 2]!;
  const n = Math.floor(x.length / hop);
  const e = new Float32Array(n), lvl = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    e[f] = rms(hp, f * hop, (f + 1) * hop) + 1e-7;
    lvl[f] = rms(x, f * hop, (f + 1) * hop);
  }
  const d = new Float32Array(n);
  for (let f = 8; f < n; f++) {
    let past = 0;
    for (let j = f - 8; j < f - 1; j++) past += e[j]!;
    d[f] = Math.max(0, Math.log(e[f]! / (past / 7)));
  }
  const onsets: number[] = [];
  for (let f = 8; f < n - 2; f++) {
    if (d[f]! < jump || d[f]! < d[f - 1]! || d[f]! < d[f + 1]!) continue;
    if (Math.max(lvl[f]!, lvl[f + 1]!, lvl[f + 2]!) < floor) continue;
    const t = refineOnset(x, hp, sr, Math.max(0, (f - 4) * hop), Math.min(x.length, (f + 6) * hop));
    // A strum crosses the strings in ~10-75 ms; later strings of the same strum are not new strums.
    if (onsets.length && t - onsets[onsets.length - 1]! < minGap) continue;
    onsets.push(t);
  }
  return onsets;
}

/** Rise of the high-passed envelope above its floor: first point 15% of the way to the peak. */
function refineOnset(x: Float32Array, hp: Float32Array, sr: number, a: number, b: number): number {
  const w = Math.round(sr / 500), stp = Math.max(1, Math.round(sr / 2000));
  const env: number[] = [];
  for (let i = a; i < b; i += stp) env.push(rms(hp, i, i + w));
  let pk = 0;
  for (let j = 1; j < env.length; j++) if (env[j]! > env[pk]!) pk = j;
  let lo = 0;
  for (let j = 1; j < pk; j++) if (env[j]! < env[lo]!) lo = j;
  const thr = env[lo]! + 0.15 * (env[pk]! - env[lo]!);
  for (let j = lo; j <= pk; j++) if (env[j]! >= thr) return a + j * stp + Math.round(w / 2);
  return a;
}

export interface RingProfile {
  /** Seconds until the overall level fell 20 dB below its peak (or `end` was reached). */
  seconds: number;
  /** True if it was still ringing when the next strum / end came. */
  stillRinging: boolean;
  peakDb: number;
  /** Per note: seconds until that note fell 20 dB below its own early level. */
  /** separable=false: the note shares all its partials with another chord note (e.g. an octave double). */
  notes: { midi: number; seconds: number; stillRinging: boolean; separable: boolean; early: number }[];
}

/** How long the strum starting at `onset` keeps sounding, overall and per note, up to `end`. */
export function ringProfile(x: Float32Array, sr: number, onset: number, end: number, midis: number[], tuningCents = 0): RingProfile {
  const hop = Math.round(0.02 * sr);
  const env: number[] = [];
  for (let i = onset; i + hop <= Math.min(end, x.length); i += hop) env.push(rms(x, i, i + hop));
  const peak = Math.max(1e-9, ...env.slice(0, 10));
  const peakIdx = env.indexOf(peak);
  let dropAt = env.findIndex((v, i) => i > peakIdx && v < peak * 0.1);
  const stillRinging = dropAt < 0;
  if (dropAt < 0) dropAt = env.length;

  // Per note: follow only partials no other chord note shares (D3's 2nd partial is G2's 3rd, so
  // it keeps "ringing" after a choked D string). A note with no partial of its own — e.g. one
  // doubled an octave lower — can't be separated, and says so.
  const N = 8192, step = Math.round(0.05 * sr);
  const binHz = sr / N;
  // Only notes that actually sound at the start count when deciding which partials are a note's
  // own (an unplayed D2 candidate must not "own" every partial of the D3 that was played).
  const first = spectrumOf(x.slice(onset + Math.round(0.03 * sr), onset + Math.round(0.03 * sr) + N), sr);
  const fund = midis.map((m) => peakNear(first, midiToHz(m, tuningCents), 25).mag);
  const loud = Math.max(1e-12, ...fund);
  const sounding = new Set(midis.filter((_, j) => fund[j]! >= 0.08 * loud));
  const own = midis.map((m) => {
    if (!sounding.has(m)) return [];
    const f0 = midiToHz(m, tuningCents);
    const hs: number[] = [];
    for (let h = 1; h <= 6 && h * f0 < 5000; h++) {
      const f = h * f0;
      const clash = [...sounding].some((o) => {
        if (o === m) return false;
        const g0 = midiToHz(o, tuningCents);
        for (let k = 1; k * g0 < 5200; k++) if (Math.abs(k * g0 - f) < Math.max(3 * binHz, f * (2 ** (40 / 1200) - 1))) return true;
        return false;
      });
      if (!clash) hs.push(h);
    }
    return hs;
  });
  const track = midis.map(() => [] as number[]);
  for (let i = onset + Math.round(0.03 * sr); i + N <= Math.min(end, x.length); i += step) {
    const s = spectrumOf(x.slice(i, i + N), sr);
    midis.forEach((m, j) => {
      const f0 = midiToHz(m, tuningCents);
      track[j]!.push(own[j]!.reduce((a, h) => a + peakNear(s, h * f0, 30).mag, 0));
    });
  }
  const notes = midis.map((midi, j) => {
    if (!own[j]!.length) return { midi, seconds: NaN, stillRinging: false, separable: false, early: 0 };
    const t = track[j]!;
    const early = Math.max(1e-9, ...t.slice(0, 3));
    const d = t.findIndex((v, i) => i >= 1 && v < early * 0.1);
    return { midi, seconds: d < 0 ? (t.length * step) / sr : (d * step) / sr + 0.03, stillRinging: d < 0, separable: true, early };
  });
  return { seconds: (dropAt * hop) / sr, stillRinging, peakDb: dbfs(peak), notes };
}
