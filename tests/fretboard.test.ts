import { describe, expect, test } from "bun:test";
import { TUNINGS, buildFretboard, orderedPathway } from "../src/lib/fretboard";
import { ROOTS, SCALES, degreesToPitchClasses, rootByName } from "../src/lib/theory";

const roots = ROOTS.filter((r, i, a) => a.findIndex((x) => x.pc === r.pc) === i);
const tuning = (id: string) => TUNINGS.find((t) => t.id === id)!;
const openMidi = (t: (typeof TUNINGS)[number], si: number) => t.strings[si]!.pc + (t.strings[si]!.octave + 1) * 12;

describe("fretboard note math", () => {
  test("standard tuning landmarks", () => {
    const rows = buildFretboard({ tuning: tuning("standard"), fretFrom: 0, fretTo: 12, root: rootByName("C"), degrees: ["1"], preferFlats: false });
    expect(rows[0]![0]!.noteName).toBe("E"); // low E open
    expect(rows[0]![5]!.noteName).toBe("A"); // 5th fret = next string
    expect(rows[4]![1]!.noteName).toBe("C"); // B string 1st fret
    expect(rows[1]![3]!.isRoot).toBe(true); // A string 3rd fret is C
  });
  test("every tuning: fret f is open + f semitones, octave repeats at 12", () => {
    for (const t of TUNINGS) {
      const rows = buildFretboard({ tuning: t, fretFrom: 0, fretTo: 24, root: rootByName("C"), degrees: ["1"], preferFlats: false });
      rows.forEach((row, si) => row.forEach((n) => {
        expect(n.pc).toBe((t.strings[si]!.pc + n.fret) % 12);
        if (n.fret >= 12) expect(n.pc).toBe(row[n.fret - 12]!.pc);
      }));
    }
  });
  test("tunings are listed low string first and climb in pitch", () => {
    for (const t of TUNINGS)
      for (let si = 1; si < t.strings.length; si++) expect(openMidi(t, si)).toBeGreaterThan(openMidi(t, si - 1));
  });
});

describe("diagonal pathway (3 notes per string)", () => {
  const sets = SCALES.filter((s) => s.degrees.length >= 5 && s.degrees.length <= 8);
  const windows = [[0, 0, 15], [0, 0, 24], [0, 5, 15], [0, 7, 19], [3, 3, 15], [5, 10, 22]] as const;
  const cases = ["standard", "drop-d", "seven", "bass4"].map(tuning);

  test("never skips a scale tone, keeps 3 per string on the chosen strings, stays on the board", () => {
    let checked = 0;
    for (const t of cases)
      for (const r of roots)
        for (const s of sets) {
          const pcs = new Set(degreesToPitchClasses(s.degrees).map((p) => (p + r.pc) % 12));
          for (const d of s.degrees) {
            const startPc = (r.pc + degreesToPitchClasses([d])[0]!) % 12;
            for (let pair = 0; pair <= t.strings.length - 3; pair++)
              for (const [lo, from, to] of windows) {
                const steps = orderedPathway({ kind: "diagonal", tuning: t, pcs, startPc, from, to, stringPair: pair, minFret: lo });
                checked++;
                if (!steps.length) continue;
                expect(steps[0]!.pc).toBe(startPc);
                steps.forEach((st, i) => {
                  expect(st.string).toBe(pair + Math.floor(i / 3));
                  expect(st.fret).toBeGreaterThanOrEqual(lo);
                  expect(st.fret).toBeLessThanOrEqual(to);
                  expect(st.midi).toBe(openMidi(t, st.string) + st.fret);
                  if (i) for (let m = steps[i - 1]!.midi + 1; m < st.midi; m++) expect(pcs.has(m % 12)).toBe(false);
                  if (i) expect(st.midi).toBeGreaterThan(steps[i - 1]!.midi);
                });
              }
          }
        }
    expect(checked).toBeGreaterThan(100_000);
  });

  test("every major mode completes 3x3 on a full 0-24 neck in standard tuning", () => {
    for (const r of roots)
      for (const id of ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian", "harmonic-minor", "melodic-minor"]) {
        const degs = SCALES.find((s) => s.id === id)!.degrees;
        const pcs = new Set(degreesToPitchClasses(degs).map((p) => (p + r.pc) % 12));
        for (const d of degs)
          for (let pair = 0; pair <= 3; pair++) {
            const startPc = (r.pc + degreesToPitchClasses([d])[0]!) % 12;
            const steps = orderedPathway({ kind: "diagonal", tuning: tuning("standard"), pcs, startPc, from: 0, to: 24, stringPair: pair, minFret: 0 });
            expect(steps.length).toBe(9);
          }
      }
  });
});

describe("vertical / horizontal pathways", () => {
  test("ascend in pitch from the start degree, inside the window, each pitch once", () => {
    const t = tuning("standard");
    for (const r of roots)
      for (const id of ["ionian", "aeolian", "minor-pentatonic"]) {
        const s = SCALES.find((x) => x.id === id);
        if (!s) continue;
        const pcs = new Set(degreesToPitchClasses(s.degrees).map((p) => (p + r.pc) % 12));
        for (const kind of ["vertical", "horizontal"] as const)
          for (const [from, to] of [[0, 4], [5, 9], [0, 15]] as const) {
            const steps = orderedPathway({ kind, tuning: t, pcs, startPc: r.pc, from, to, stringPair: 1 });
            const midis = steps.map((x) => x.midi);
            expect(new Set(midis).size).toBe(midis.length);
            steps.forEach((x, i) => {
              expect(x.fret).toBeGreaterThanOrEqual(from);
              expect(x.fret).toBeLessThanOrEqual(to);
              if (i) expect(x.midi).toBeGreaterThan(steps[i - 1]!.midi);
            });
            if (steps.length) expect(steps[0]!.pc).toBe(r.pc);
          }
      }
  });
});
