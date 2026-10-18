import { describe, expect, test } from "bun:test";
import { NoteGate, type GateVerdict } from "../src/lib/tuner/gate";
import { centsOff, detectPitch } from "../src/lib/tuner/pitch";
import { midiHz } from "../src/lib/tuner/tunings";
import { pluck, rng, SR } from "./helpers/guitar";

const HOP = 2400; // 50 ms, like the live tuner
const N = 4096;

/** Run audio through the tuner's analysis like the live loop does; returns each frame's verdict and pitch. */
function run(x: Float32Array, pluckedOnly = true) {
  const gate = new NoteGate({ pluckedOnly });
  const out: { t: number; v: GateVerdict; hz: number | null }[] = [];
  for (let s = 0; s + N <= x.length; s += HOP) {
    const w = x.subarray(s, s + N);
    let e = 0;
    for (let i = 0; i < N; i++) e += w[i]! * w[i]!;
    const db = 10 * Math.log10(e / N + 1e-12);
    const p = detectPitch(w, SR, { minHz: 25, maxHz: 1400, minLevel: 0.0005 });
    const t = (s + N) / SR;
    out.push({ t, v: gate.push({ t, db, hz: p?.hz ?? null, clarity: p?.clarity ?? 0 }), hz: p?.hz ?? null });
  }
  return out;
}

function room(seconds: number, seed: number, amp = 0.0008) {
  const r = rng(seed);
  return Float32Array.from({ length: Math.round(seconds * SR) }, () => amp * (r() - 0.5));
}
function mix(base: Float32Array, add: Float32Array, at: number) {
  const o = Math.round(at * SR);
  for (let i = 0; i < add.length && o + i < base.length; i++) base[o + i]! += add[i]!;
  return base;
}

/** A voice: harmonic sound with gliding pitch, syllable-rate loudness and vibrato. */
function voice(seconds: number, f0: number, opts: { glide?: number; vibrato?: number; syllables?: boolean; seed?: number } = {}) {
  const r = rng(opts.seed ?? 7);
  const n = Math.round(seconds * SR);
  const x = new Float32Array(n);
  let phase = 0;
  let target = f0;
  let f = f0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (opts.glide && i % 4800 === 0) target = f0 * 2 ** ((r() - 0.5) * opts.glide / 1200); // new pitch target every 100 ms
    f += (target - f) * 0.0006;
    const vib = opts.vibrato ? 2 ** ((opts.vibrato * Math.sin(2 * Math.PI * 5.5 * t)) / 1200) : 1;
    phase += (2 * Math.PI * f * vib) / SR;
    let v = 0;
    for (let h = 1; h <= 8; h++) v += (h <= 3 ? 1 : 0.5 / h) * Math.sin(h * phase);
    const env = opts.syllables ? 0.55 + 0.45 * Math.sin(2 * Math.PI * 4.5 * t) ** 2 : 1;
    const fade = Math.min(1, t / 0.08);
    x[i] = 0.05 * v * env * fade;
  }
  return x;
}

const accepted = (frames: ReturnType<typeof run>) => frames.filter((f) => f.v === "accept");

describe("tuner gate: plucked strings get through", () => {
  for (const [name, midi] of [["Drop C low C2", 36], ["low E2", 40], ["A2", 45], ["G3", 55], ["high E4", 64], ["bass E1", 28]] as const)
    test(`${name}: reads for over a second, at the right pitch`, () => {
      const x = mix(room(3, 1), pluck(midi, rng(3), { seconds: 2.5, amp: 0.3 }), 0.4);
      const ok = accepted(run(x));
      expect(ok.length).toBeGreaterThan(15); // > 0.75 s of readings
      for (const f of ok) expect(Math.abs(centsOff(f.hz!, midiHz(midi)))).toBeLessThan(60); // right note (the synth is only roughly in tune)
    });

  test("a soft pluck still reads, and a second pluck while the first rings starts a new note", () => {
    const x = room(4, 2);
    mix(x, pluck(40, rng(4), { seconds: 2, amp: 0.06 }), 0.3);
    mix(x, pluck(40, rng(5), { seconds: 2, amp: 0.3 }), 1.6);
    const ok = accepted(run(x));
    expect(ok.some((f) => f.t < 1.5)).toBe(true);
    expect(ok.some((f) => f.t > 1.7)).toBe(true);
  });

  test("tuning the peg while the string rings (pitch sliding 40 cents a second) keeps reading", () => {
    const n = 2.5 * SR;
    const x = room(3, 3);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = midiHz(36, 440, -40 + 40 * t);
      ph += (2 * Math.PI * f) / SR;
      let v = 0;
      for (let h = 1; h <= 8; h++) v += (1 / h) * Math.sin(h * ph);
      x[i + 0.3 * SR]! += 0.2 * v * Math.exp(-1.2 * t) * Math.min(1, t / 0.005);
    }
    expect(accepted(run(x)).length).toBeGreaterThan(20);
  });
});

describe("tuner gate: voices and noise are ignored", () => {
  test("talking (gliding pitch, syllables)", () => {
    const x = mix(room(4, 4), voice(3.5, 140, { glide: 500, syllables: true }), 0.2);
    expect(accepted(run(x)).length).toBeLessThanOrEqual(1);
  });
  test("singing with vibrato", () => {
    const x = mix(room(4, 5), voice(3.5, 220, { vibrato: 40 }), 0.2);
    expect(accepted(run(x)).length).toBeLessThanOrEqual(1);
  });
  test("a steady hum is dropped once it's clear it isn't fading", () => {
    const x = mix(room(4, 6), voice(3.5, 196), 0.2);
    const frames = run(x);
    expect(accepted(frames).length).toBeLessThanOrEqual(8); // at most its first half second
    expect(accepted(frames).filter((f) => f.t > 1.0).length).toBe(0);
  });
  test("room noise and a clap give nothing", () => {
    const x = room(3, 7, 0.004);
    const r = rng(8);
    for (let i = 0; i < 0.03 * SR; i++) x[SR + i]! += 0.6 * (r() - 0.5) * Math.exp(-i / (0.005 * SR));
    expect(accepted(run(x)).length).toBe(0);
  });
  test("with 'guitar only' off, a steady sound reads (for violin, cello or a sung note)", () => {
    const x = mix(room(3, 9), voice(2.5, 196), 0.2);
    expect(accepted(run(x, false)).length).toBeGreaterThan(30);
  });
});
