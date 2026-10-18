/**
 * Single-note pitch detection for the tuner: YIN (de Cheveigné & Kawahara, 2002) with the
 * difference function computed by FFT, so a 8192-sample window costs a few milliseconds.
 *
 * Plain functions on sample arrays (no browser APIs), so they are tested on synthetic plucks.
 */

/** In-place radix-2 complex FFT (re/im of power-of-two length). `inverse` scales by 1/n. */
export function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b]! * cr - im[b]! * ci;
        const xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n;
      im[i] = im[i]! / n;
    }
}

export interface Pitch {
  /** Fundamental in Hz. */
  hz: number;
  /** 0..1, how periodic the sound is (1 = a pure, steady note). */
  clarity: number;
  /** RMS level of the window, 0..1. */
  level: number;
}

export interface PitchOptions {
  /** Lowest pitch to look for (Hz). */
  minHz?: number;
  /** Highest pitch to look for (Hz). */
  maxHz?: number;
  /** YIN threshold: lower is stricter. */
  threshold?: number;
  /** Below this RMS the window is treated as silence. */
  minLevel?: number;
}

/**
 * The pitch of the single note in `x` (any length; at least ~3 periods of the lowest note), or
 * null if it's silent or not a clear note.
 */
export function detectPitch(x: Float32Array, sr: number, o: PitchOptions = {}): Pitch | null {
  const minHz = o.minHz ?? 27;
  const maxHz = o.maxHz ?? 1400;
  const threshold = o.threshold ?? 0.15;
  const N = x.length;
  let mean = 0;
  for (let i = 0; i < N; i++) mean += x[i]!;
  mean /= N;
  let e = 0;
  for (let i = 0; i < N; i++) e += (x[i]! - mean) ** 2;
  const level = Math.sqrt(e / N);
  if (level < (o.minLevel ?? 0.002)) return null;

  const maxTau = Math.min(Math.floor(sr / minHz), Math.floor(N / 2));
  const minTau = Math.max(2, Math.floor(sr / maxHz));
  const W = N - maxTau;
  if (maxTau <= minTau + 2 || W < 16) return null;

  // r(τ) = Σ_{j<W} x_j·x_{j+τ}, by FFT cross-correlation.
  let size = 1;
  while (size < N + W) size <<= 1;
  const ar = new Float64Array(size), ai = new Float64Array(size);
  const br = new Float64Array(size), bi = new Float64Array(size);
  for (let i = 0; i < W; i++) ar[i] = x[i]! - mean;
  for (let i = 0; i < N; i++) br[i] = x[i]! - mean;
  fft(ar, ai);
  fft(br, bi);
  for (let k = 0; k < size; k++) {
    // conj(A)·B
    const r = ar[k]! * br[k]! + ai[k]! * bi[k]!;
    const i = ar[k]! * bi[k]! - ai[k]! * br[k]!;
    ar[k] = r;
    ai[k] = i;
  }
  fft(ar, ai, true);

  // Energy of each window position from prefix sums of x².
  const pre = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) pre[i + 1] = pre[i]! + (x[i]! - mean) ** 2;
  const e0 = pre[W]!;
  // d(τ) = e0 + eτ − 2r(τ); then the cumulative-mean-normalised d'(τ).
  const dn = new Float64Array(maxTau + 1);
  dn[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    const d = Math.max(0, e0 + (pre[tau + W]! - pre[tau]!) - 2 * ar[tau]!);
    run += d;
    dn[tau] = run > 0 ? (d * tau) / run : 1;
  }

  // First dip under the threshold (then down to its bottom); otherwise the deepest dip.
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (dn[t]! < threshold) {
      while (t + 1 <= maxTau && dn[t + 1]! < dn[t]!) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) {
    let best = minTau;
    for (let t = minTau; t <= maxTau; t++) if (dn[t]! < dn[best]!) best = t;
    if (dn[best]! > 0.35) return null;
    tau = best;
  }
  // Parabolic interpolation around the dip for sub-sample accuracy.
  let better = tau;
  if (tau > 1 && tau < maxTau) {
    const a = dn[tau - 1]!, b = dn[tau]!, c = dn[tau + 1]!;
    const den = a - 2 * b + c;
    if (den > 0) better = tau + (0.5 * (a - c)) / den;
  }
  const hz = sr / better;
  if (hz < minHz || hz > maxHz) return null;
  return { hz, clarity: Math.max(0, Math.min(1, 1 - dn[tau]!)), level };
}

/** Cents from `ref` Hz to `hz` (positive = sharp). */
export const centsOff = (hz: number, ref: number) => 1200 * Math.log2(hz / ref);

/** Window length (power of two) holding at least ~4 periods of the lowest note. */
export function windowFor(lowestHz: number, sr: number): number {
  const want = (4 * sr) / Math.max(20, lowestHz);
  let n = 2048;
  while (n < want && n < 16384) n <<= 1;
  return n;
}
