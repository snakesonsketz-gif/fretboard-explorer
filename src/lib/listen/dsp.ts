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
  /**
   * Per target pitch class: strength relative to the strongest chord note (0 = not heard).
   * weak: the note was found but far too quiet to be a sounding string (muted or deadened).
   */
  target: { pc: number; strength: number; octaves: number[]; weak?: boolean }[];
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
/** A chord note this far under the loudest (−27 dB, raw spectrum) isn't sounding — muted or deadened. */
const WEAK_RATIO = 10 ** (-27 / 20);
/** Fundamental this far under its own octave (−15 dB) and under the loudest note (−24 dB) marks a sub-octave phantom. */
const PHANTOM_RATIO = 10 ** (-15 / 20);
const PHANTOM_ABSENT = 10 ** (-24 / 20);

export function checkChord(s: Spectrum, targetPcs: number[], opts: { tolCents?: number; late?: Spectrum } = {}): ChordCheck {
  const tol = opts.tolCents ?? 35;
  const tuningCents = estimateTuning(s);
  const work = whiten(s);
  const want = new Set(targetPcs.map((p) => ((p % 12) + 12) % 12));
  const found = explain(work, s, tuningCents, tol, (m) => want.has(m % 12), 14, 0.08);
  // A chord note "heard" an octave below where it was played (G2 for a G3) is a phantom: it takes
  // its octave's partials as its even ones, and its odd partials are someone else's — cancelling
  // them hid real wrong notes (a D4 played in C read as G2's 3rd partial; Bradley's iPhone, Oct
  // 2026). A real low string's fundamental is within ~8 dB of its octave even on a phone mic;
  // a phantom's is 19+ dB under it. So phantoms are dropped and the spectrum explained again
  // without them (their octave-up note stands in for them).
  // (Its fundamental must also be nearly absent overall: a played low string whose octave is
  // also played on another string can sit 15 dB under that octave, but not 24 dB under the
  // loudest note — phantoms sat 26–55 dB under it.)
  const loudFund = Math.max(1e-12, ...found.notes.map((n) => peakNear(s, midiToHz(n.midi, tuningCents), tol).mag));
  const phantom = (m: number) => {
    const f0 = midiToHz(m, tuningCents);
    const fund = peakNear(s, f0, tol).mag;
    return fund < PHANTOM_RATIO * peakNear(s, 2 * f0, tol).mag && fund < PHANTOM_ABSENT * loudFund;
  };
  let chord = found;
  if (found.notes.some((n) => phantom(n.midi))) {
    const keep = found.notes.filter((n) => !phantom(n.midi)).map((n) => n.midi);
    const ups = found.notes.filter((n) => phantom(n.midi)).map((n) => n.midi + 12);
    work.set(whiten(s));
    const allowed = new Set([...keep, ...ups]);
    chord = explain(work, s, tuningCents, tol, (m) => allowed.has(m), allowed.size, 0.08, found.top);
  }
  const W: Spectrum = { ...s, mags: work };
  // Whitening evens out levels so a dull guitar is judged like a bright one, but it also lifts a
  // deadened string's faint thud to look "heard". On the raw spectrum a muted string is 30–68 dB
  // under the loudest string, a played one within ~24 dB (Bradley's iPhone, Oct 2026); such a
  // note is dropped and, if it was its pitch's only octave, reported as not sounding.
  // Judged a little later in the ring when that view is given: a muted string's thud is gone by
  // then, while a ringing string is still there (Bradley's round 2: muted strings read -9 to -18
  // dB at 0.08 s but -23 to -48 dB from 0.15 s on).
  const L = opts.late ?? s;
  const rawOf = (m: number) => peakNear(L, midiToHz(m, tuningCents), tol).mag;
  const loudest = Math.max(1e-12, ...chord.notes.map((n) => rawOf(n.midi)));
  const sounding = chord.notes.filter((n) => rawOf(n.midi) >= WEAK_RATIO * loudest);
  const target = [...want].map((pc) => {
    const picked = chord.notes.filter((n) => n.pc === pc);
    const heard = sounding.filter((n) => n.pc === pc);
    if (picked.length && !heard.length) return { pc, strength: 0, octaves: [], weak: true };
    // Not found at all: if no octave of it is anywhere near sounding level on the raw spectrum
    // either, it isn't faint — it isn't there (a muted string, not a quiet one).
    if (!picked.length) {
      let raw = 0;
      for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) if (m % 12 === pc) raw = Math.max(raw, rawOf(m));
      if (raw < WEAK_RATIO * loudest) return { pc, strength: 0, octaves: [], weak: true };
    }
    // Faint evidence left in the residual (a weak or half-muted string) still counts as "some".
    let faint = 0;
    if (!heard.length && chord.top)
      // Tight 20-cent window: faint evidence must sit on the note itself, not on a neighbour's
      // overtone (G's 7th partial is 31 cents from F).
      for (let m = LOWEST_MIDI; m <= HIGHEST_MIDI; m++) if (m % 12 === pc) faint = Math.max(faint, salience(W, m, tuningCents, 20) / chord.top);
    return { pc, strength: heard.length ? Math.max(...heard.map((n) => n.strength)) : Math.min(faint, 0.079), octaves: heard.map((n) => n.midi) };
  });
  const rest = chord.top ? explain(work, s, tuningCents, tol, (m) => !want.has(m % 12), 4, 0.04, chord.top) : { notes: [] };
  // A wrong note's own overtones aren't more wrong notes: an extra that sits on a partial (2nd–6th)
  // of a lower extra is folded into it (a slipped F#3 was reported as C#5, its 3rd partial).
  const found2 = rest.notes.map((n) => ({ pc: n.pc, midi: n.midi, strength: n.strength })).sort((a, b) => a.midi - b.midi);
  const extras: typeof found2 = [];
  for (const e of found2) {
    const base = extras.find((o) => [2, 3, 4, 5, 6].some((h) => Math.abs(e.midi - o.midi - 12 * Math.log2(h)) < 0.2));
    if (base) base.strength = Math.max(base.strength, e.strength);
    else extras.push({ ...e });
  }
  extras.sort((a, b) => b.strength - a.strength);
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

/** Band where fret buzz shows (measured on a real guitar through a phone mic, Oct 2026). */
export const BUZZ_BAND: [number, number] = [3000, 10000];

/**
 * Absolute noise floor in the buzz band: the median power between 3 and 10 kHz. A clean chord
 * there is a few sharp overtone peaks over a low floor; fret buzz fills in between them.
 * Compare a strum's floor with the room's (same function) to tell buzz from room noise.
 */
export function hfFloor(s: Spectrum): number {
  const binHz = s.sr / s.n;
  const lo = Math.ceil(BUZZ_BAND[0] / binHz), hi = Math.min(s.mags.length - 1, Math.floor(BUZZ_BAND[1] / binHz));
  const p: number[] = [];
  for (let k = lo; k <= hi; k++) p.push(s.mags[k]! * s.mags[k]!);
  p.sort((a, b) => a - b);
  return (p[Math.floor(p.length / 2)] ?? 0) + 1e-20;
}

/**
 * Buzz measure that doesn't depend on how hard the strum was: the buzz-band floor (hfFloor)
 * relative to the strongest note (peak power between 70 Hz and 1 kHz), in dB. Bradley's guitar,
 * iPhone: clean strums -87 to -70 dB, buzzing strums -71 to -63 dB.
 */
export function hfRelDb(s: Spectrum): number {
  const binHz = s.sr / s.n;
  let peak = 0;
  for (let k = Math.ceil(70 / binHz); k <= Math.min(s.mags.length - 1, Math.floor(1000 / binHz)); k++) peak = Math.max(peak, s.mags[k]! * s.mags[k]!);
  return 10 * Math.log10(hfFloor(s) / (peak + 1e-20));
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
export interface OnsetOptions {
  minGap?: number;
  floorDb?: number;
  jump?: number;
  /**
   * Only count sounds that ring like a strum (default true). A tap on the phone, a button click,
   * a knock or a pop dies away within a few tens of ms; a strummed chord is still sounding a
   * quarter of a second later. Off for timing calibration, where muted strums or taps are asked for.
   */
  strumsOnly?: boolean;
  /** Seconds after a strum in which a new onset must also be clearly louder to count (default 0.2). */
  mergeWindow?: number;
  /** Position of the previous strum (sample index in `x`'s frame of reference, may be negative). */
  prev?: number;
  /**
   * `x` is the whole recording (nothing more will come): a sound too close to the end for the
   * strum check is kept. Otherwise it is left out, to be judged when more audio has arrived.
   */
  atEnd?: boolean;
  /**
   * The player was asked to let each strum ring out before the next (guided steps). A real strum
   * then always leaves the guitar clearly louder than it was just before (measured: ≥ 1.48× even
   * for a soft strum 1.5 s after a loud one); a knock or bump on the guitar while the last chord
   * is still ringing leaves it no louder (measured ≤ 1.0×). Minimum ratio of the level 0.12-0.25 s
   * after the onset to the level just before it. Off (undefined) for normal playing.
   */
  minRise?: number;
}

/**
 * Quietest sound that can start a strum (dBFS). Tried -56 on Bradley's round 2 (iPhone Safari,
 * soft strums at -50 to -47): it caught the one soft strum missed at -50 but added four false
 * strums, so it stays at -50.
 */
export const FLOOR_DB = -50;
/** Seconds of audio a candidate onset needs after it for the strum (sustain) check. */
export const ONSET_LOOKAHEAD = 0.25;
/**
 * With `minRise` (strums let ring out, so at least ~0.8 s apart): sounds this close together are
 * one strum. A clearly louder attack inside it (the real strum after a knock, or the bulk of a
 * slow strum) moves the strum to that attack instead of adding one.
 */
export const SPACED_MERGE = 0.6;
/** Seconds of audio a candidate needs after it before it can be decided, given the options. */
export const onsetLookahead = (minRise: number | undefined) => (minRise ? SPACED_MERGE + ONSET_LOOKAHEAD : ONSET_LOOKAHEAD);

export function detectOnsets(x: Float32Array, sr: number, opts: OnsetOptions = {}): number[] {
  const hop = Math.round(sr * 0.005); // 5 ms frames
  const minGap = Math.round((opts.minGap ?? 0.1) * sr);
  const strumsOnly = opts.strumsOnly ?? true;
  const mergeWindow = Math.round((opts.mergeWindow ?? 0.2) * sr);
  const spacedMerge = opts.minRise ? Math.round(SPACED_MERGE * sr) : 0;
  const floor = 10 ** ((opts.floorDb ?? FLOOR_DB) / 20);
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
    const prev = onsets.length ? onsets[onsets.length - 1]! : opts.prev;
    // A strum crosses the strings in ~10-75 ms; later strings of the same strum are not new strums.
    if (prev !== undefined && t - prev < minGap) continue;
    // A slow strum (a quarter second or more across the strings) adds one string at a time, each
    // barely louder than what's already ringing; a new strum is a clear jump in level.
    let replace = false;
    if (prev !== undefined && t - prev < Math.max(mergeWindow, spacedMerge)) {
      const before = rms(x, Math.max(0, t - Math.round(0.06 * sr)), Math.max(1, t - Math.round(0.01 * sr)));
      const after = rms(x, t, Math.min(x.length, t + Math.round(0.03 * sr)));
      if (after < 1.5 * before) continue;
      if (t - prev < spacedMerge) {
        if (!onsets.length) continue; // the previous strum was already counted; it stays
        replace = true;
      }
    }
    // Must ring on like a strum: taps, clicks and knocks are gone within ~50 ms. And a strum
    // re-strikes the strings, so for the next ~150 ms the sound is brighter (fresh high partials)
    // than what was ringing just before; a knock or bump on top of a ringing chord is gone within
    // ~40 ms and leaves the old, duller ring (measured: knocks 0.89-0.98×, real strums ≥ 1.03×).
    if (strumsOnly && t + Math.round(ONSET_LOOKAHEAD * sr) > x.length && !opts.atEnd) continue;
    if (strumsOnly && opts.minRise) {
      const before = rms(x, Math.max(0, t - Math.round(0.06 * sr)), Math.max(1, t - Math.round(0.01 * sr)));
      const from = t + Math.round(0.12 * sr), to = Math.min(x.length, t + Math.round(ONSET_LOOKAHEAD * sr));
      // Right at the very end of a recording there may be too little left to tell; a real strum
      // there would be cut off anyway (the recording keeps going while a strum rings).
      if (to - from < Math.round(0.03 * sr)) continue;
      if (rms(x, from, to) < opts.minRise * before) continue;
    }
    if (strumsOnly && t + Math.round(ONSET_LOOKAHEAD * sr) <= x.length) {
      const attack = rms(x, t, t + Math.round(0.04 * sr));
      const ring = rms(x, t + Math.round(0.12 * sr), t + Math.round(ONSET_LOOKAHEAD * sr));
      if (ring < 0.3 * attack) continue;
      const brightAfter = rms(hp, t + Math.round(0.06 * sr), t + Math.round(0.15 * sr));
      const brightBefore = rms(hp, Math.max(0, t - Math.round(0.06 * sr)), Math.max(1, t - Math.round(0.01 * sr)));
      if (brightAfter < 0.95 * brightBefore) continue;
      // Only slightly brighter than before AND fading fast: a knock riding on a ringing chord
      // (measured: knocks ≈ 0.3 of their attack level 0.12-0.25 s later; real strums ≥ 0.5).
      if (brightAfter < 1.3 * brightBefore && ring < 0.42 * attack) continue;
    }
    if (replace) onsets[onsets.length - 1] = t;
    else onsets.push(t);
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
  notes: { midi: number; seconds: number; stillRinging: boolean; separable: boolean; early: number; lateDb: number }[];
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
  // Zero-padded: when the next strum (or the end of the audio) comes within 0.2 s there is less
  // than a full window to look at, and the spectrum needs exactly N samples.
  const firstWin = new Float32Array(N);
  firstWin.set(x.subarray(onset + Math.round(0.03 * sr), Math.min(end, x.length, onset + Math.round(0.03 * sr) + N)));
  const first = spectrumOf(firstWin, sr);
  const fund = midis.map((m) => peakNear(first, midiToHz(m, tuningCents), 25).mag);
  const loud = Math.max(1e-12, ...fund);
  // A sub-octave phantom (fundamental far under its own octave, see checkChord) would claim every
  // partial of the note above it as its own, leaving that note impossible to follow.
  const sounding = new Set(midis.filter((m, j) => fund[j]! >= 0.08 * loud && fund[j]! >= PHANTOM_RATIO * peakNear(first, 2 * midiToHz(m, tuningCents), 25).mag));
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
  // Each note's own level 0.3 s in, against the loudest note then (raw spectrum): a deadened
  // string is 23–57 dB down by then, a ringing one within ~20 dB (Bradley's iPhone).
  const lateWin = new Float32Array(N);
  const l0 = onset + Math.round(0.3 * sr);
  if (l0 < Math.min(end, x.length)) lateWin.set(x.subarray(l0, Math.min(end, x.length, l0 + N)));
  const late = spectrumOf(lateWin, sr);
  const lateFund = midis.map((m) => peakNear(late, midiToHz(m, tuningCents), 25).mag);
  const lateLoud = Math.max(1e-12, ...midis.filter((m) => sounding.has(m)).map((m) => lateFund[midis.indexOf(m)]!));
  const lateDb = (j: number) => 20 * Math.log10(Math.max(1e-12, lateFund[j]!) / lateLoud);
  const track = midis.map(() => [] as number[]);
  for (let i = onset + Math.round(0.03 * sr); i + N <= Math.min(end, x.length); i += step) {
    const s = spectrumOf(x.slice(i, i + N), sr);
    midis.forEach((m, j) => {
      const f0 = midiToHz(m, tuningCents);
      track[j]!.push(own[j]!.reduce((a, h) => a + peakNear(s, h * f0, 30).mag, 0));
    });
  }
  const notes = midis.map((midi, j) => {
    if (!own[j]!.length) return { midi, seconds: NaN, stillRinging: false, separable: false, early: 0, lateDb: lateDb(j) };
    const t = track[j]!;
    const early = Math.max(1e-9, ...t.slice(0, 3));
    const d = t.findIndex((v, i) => i >= 1 && v < early * 0.1);
    return { midi, seconds: d < 0 ? (t.length * step) / sr : (d * step) / sr + 0.03, stillRinging: d < 0, separable: true, early, lateDb: lateDb(j) };
  });
  return { seconds: (dropAt * hop) / sr, stillRinging, peakDb: dbfs(peak), notes };
}
