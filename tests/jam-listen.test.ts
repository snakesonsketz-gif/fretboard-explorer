import { describe, expect, test } from "bun:test";
import { beatsToProgression, chordFromProfile, chordsPerBeat } from "../src/lib/jamListen";

const SR = 44100;
/** A strummed guitar-ish chord: each string a decaying harmonic tone, strummed 12 ms apart. */
function strum(out: Float32Array, at: number, midis: number[], seconds: number) {
  midis.forEach((m, k) => {
    const f0 = 440 * 2 ** ((m - 69) / 12);
    const start = at + Math.round(k * 0.012 * SR);
    for (let i = 0; i < seconds * SR && start + i < out.length; i++) {
      const t = i / SR;
      let v = 0;
      for (let h = 1; h <= 8; h++) v += (Math.sin(2 * Math.PI * f0 * h * t) / h ** 1.3) * Math.exp(-t * (1.2 + h * 0.4));
      out[start + i]! += 0.08 * v;
    }
  });
}

describe("hearing a strummed progression", () => {
  test("names chords from pitch-class profiles", () => {
    const p = (xs: number[]) => xs.reduce((a, pc) => ((a[pc] = 1), a), new Array<number>(12).fill(0));
    expect(chordFromProfile(p([7, 11, 2]), 7)).toMatchObject({ rootPc: 7, chordId: "maj", bassPc: null });
    expect(chordFromProfile(p([9, 0, 4]), 9)).toMatchObject({ rootPc: 9, chordId: "min" });
    expect(chordFromProfile(p([2, 6, 9, 0]), 2)).toMatchObject({ rootPc: 2, chordId: "7" });
    expect(chordFromProfile(p([7, 11, 2]), 11)).toMatchObject({ rootPc: 7, chordId: "maj" }); // G/B still reads as G
  });
  test("a strummed G – Em – C – D, one bar each at 100 bpm", () => {
    const bpm = 100;
    const beat = (60 / bpm) * SR;
    const shapes = [
      [43, 47, 50, 55, 59, 67], // G  320003
      [40, 47, 52, 55, 59, 64], // Em 022000
      [48, 52, 55, 60, 64], // C  x32010
      [50, 57, 62, 66], // D  xx0232
    ];
    const lead = Math.round(0.3 * SR);
    const audio = new Float32Array(lead + Math.round(beat * 16) + SR);
    const beats: number[] = [];
    shapes.forEach((sh, bar) => {
      for (let b = 0; b < 4; b++) {
        const at = lead + Math.round((bar * 4 + b) * beat);
        beats.push(at);
        strum(audio, at, sh, (beat / SR) * 1.1);
      }
    });
    const per = chordsPerBeat(audio, SR, 0, beats, beat);
    const prog = beatsToProgression(per);
    expect(prog.map((c) => `${c.label}:${c.beats}`)).toEqual(["G:4", "Em:4", "C:4", "D:4"]);
  }, 30000);
  test("changes every 2 beats and 7th chords, at 120 bpm", () => {
    const beat = 0.5 * SR;
    const plan: [number[], number][] = [
      [[45, 52, 57, 60, 64], 2], // Am x02210
      [[41, 48, 53, 57, 60, 65], 2], // F 133211
      [[45, 52, 55, 61, 64], 4], // A7 x02020
      [[50, 57, 60, 66], 4], // D7 xx0212
    ];
    const audio = new Float32Array(Math.round(beat * 13) + SR);
    const beats: number[] = [];
    let n = 0;
    for (const [sh, len] of plan)
      for (let b = 0; b < len; b++) {
        const at = Math.round(0.2 * SR + n++ * beat);
        beats.push(at);
        strum(audio, at, sh, 0.55);
      }
    const prog = beatsToProgression(chordsPerBeat(audio, SR, 0, beats, beat));
    expect(prog.map((c) => `${c.label}:${c.beats}`)).toEqual(["Am:2", "F:2", "A7:4", "D7:4"]);
  }, 30000);
  test("silence gives nothing", () => {
    const audio = new Float32Array(SR * 3);
    const per = chordsPerBeat(audio, SR, 0, [0, SR / 2, SR], SR / 2);
    expect(beatsToProgression(per)).toEqual([]);
  });
});
