/**
 * Synthetic guitar for testing Listen mode: Karplus-Strong plucked strings (with a fractional
 * all-pass delay so pitch is accurate), strummed low→high in real chord shapes, plus optional
 * noise, detuning, wrong notes, muted strings and buzz. Deterministic (seeded).
 */
export const SR = 48000;
const OPEN = [40, 45, 50, 55, 59, 64]; // standard tuning E2 A2 D3 G3 B3 E4

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

/** "x32010" → MIDI notes per string (null = not played). */
export function shape(tab: string): (number | null)[] {
  return [...tab].map((c, i) => (c === "x" ? null : OPEN[i]! + parseInt(c, 36)));
}

export interface PluckOpts {
  seconds?: number;
  /** Fraction of energy kept per period (higher = longer ring). */
  decay?: number;
  /** 0..1 initial brightness of the pick. */
  bright?: number;
  amp?: number;
  cents?: number;
  /** Damp hard after this many seconds (a finger touching the string). */
  muteAfter?: number;
  /** Add fret-buzz: a rattling nonlinearity. */
  buzz?: number;
}

export function pluck(midi: number, rand: () => number, o: PluckOpts = {}): Float32Array {
  const seconds = o.seconds ?? 2;
  const out = new Float32Array(Math.round(seconds * SR));
  const f = 440 * 2 ** ((midi - 69 + (o.cents ?? 0) / 100) / 12);
  // Total loop delay = N + 0.5 (averaging filter) + all-pass fractional delay d.
  const P = SR / f;
  const N = Math.floor(P - 0.5 - 0.1);
  const d = P - 0.5 - N;
  const C = (1 - d) / (1 + d);
  const buf = new Float32Array(N);
  const bright = o.bright ?? 0.6;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp = lp + bright * (rand() - lp); // brightness: low-passed noise burst
    buf[i] = lp;
  }
  const loss = o.decay ?? 0.9965 ** (220 / f) ** 0.15; // higher notes die a bit faster
  let idx = 0, apX = 0, apY = 0, hpX = 0, hpPrev = 0;
  const amp = o.amp ?? 0.25;
  for (let n = 0; n < out.length; n++) {
    const a = buf[idx]!;
    const b = buf[(idx + 1) % N]!;
    const avg = 0.5 * (a + b);
    const y = C * avg + apX - C * apY; // all-pass for fractional delay
    apX = avg;
    apY = y;
    let g = loss;
    if (o.muteAfter !== undefined && n > o.muteAfter * SR) g = 0.93;
    buf[idx] = y * g;
    // Fret buzz: the string slaps the fret on big swings, adding a rattling high-frequency
    // sizzle that scales with how hard the string is vibrating (and fades as it decays).
    let buzzOut = 0;
    if (o.buzz) {
      hpPrev = hpX; hpX = rand() * Math.max(0, Math.abs(a) - 0.05);
      buzzOut = o.buzz * (hpX - hpPrev);
    }
    out[n] = (a + buzzOut) * amp;
    idx = (idx + 1) % N;
  }
  return out;
}

export interface StrumOpts extends PluckOpts {
  /** Seconds between strings in the strum (down-strum low→high). */
  spread?: number;
  /** Up-strum: high string first, and only the top `upStrings` strings (default all). */
  up?: boolean;
  upStrings?: number;
  /** Per-string overrides by string index (0 = low E). */
  strings?: Record<number, PluckOpts>;
  noise?: number;
  seed?: number;
  startAt?: number;
}

/** Strum a shape into a buffer (returns the buffer and the exact onset sample of the first string). */
export function strum(tab: string, o: StrumOpts = {}): { audio: Float32Array; onset: number } {
  const rand = rng(o.seed ?? 7);
  const seconds = o.seconds ?? 2;
  const start = Math.round((o.startAt ?? 0.1) * SR);
  const audio = new Float32Array(Math.round(seconds * SR) + start);
  const notes = shape(tab);
  let k = 0;
  const order = notes.map((m, si) => ({ m, si }));
  if (o.up) order.reverse();
  const played = o.up ? order.filter((n) => n.m !== null).slice(0, o.upStrings ?? 6).map((n) => n.si) : null;
  order.forEach(({ m, si }) => {
    if (m === null || (played && !played.includes(si))) return;
    const off = start + Math.round(k++ * (o.spread ?? 0.012) * SR);
    const s = pluck(m, rand, { ...o, ...(o.strings?.[si] ?? {}), seconds: seconds - (off - start) / SR });
    for (let i = 0; i < s.length && off + i < audio.length; i++) audio[off + i]! += s[i]!;
  });
  if (o.noise) for (let i = 0; i < audio.length; i++) audio[i]! += o.noise * rand();
  return { audio, onset: start };
}

/**
 * A take on one guitar: strums at given times. Like real playing, each chord change stops the
 * previous chord (strings are re-struck or damped by the fretting hand) over ~25 ms — unless
 * `letRing` is set on the earlier part, which imitates a sloppy change where it keeps sounding.
 */
export function take(parts: { tab: string; at: number; opts?: StrumOpts & { letRing?: boolean } }[], seconds: number, noise = 0.002, seed = 3) {
  const audio = new Float32Array(Math.round(seconds * SR));
  const onsets: number[] = [];
  const fade = Math.round(0.025 * SR);
  parts.forEach((p, i) => {
    const { audio: a } = strum(p.tab, { seed: seed + i * 17, ...p.opts, startAt: 0, seconds: Math.max(0.2, seconds - p.at) });
    const off = Math.round(p.at * SR);
    const next = parts[i + 1];
    const stop = next && !p.opts?.letRing ? Math.round(next.at * SR) - off : Infinity;
    onsets.push(off);
    for (let j = 0; j < a.length && off + j < audio.length; j++) {
      if (j >= stop + fade) break;
      const g = j < stop ? 1 : 1 - (j - stop) / fade;
      audio[off + j]! += a[j]! * g;
    }
  });
  const rand = rng(seed);
  for (let i = 0; i < audio.length; i++) audio[i]! += noise * rand();
  return { audio, onsets };
}
