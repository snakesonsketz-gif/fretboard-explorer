import { describe as group, expect, test } from "bun:test";
import { compare, COMPARE_PRESETS, resolve } from "../src/lib/compare";
import { findChords } from "../src/lib/finder";

const std = [40, 45, 50, 55, 59, 64];
const read = (shape: string) => findChords([...shape].map((c, s) => (c === "x" ? null : { s, fret: Number(c), midi: std[s]! + Number(c) })).filter((x): x is { s: number; fret: number; midi: number } => !!x));

group("chord finder", () => {
  test("names everyday shapes first", () => {
    const cases: [string, string][] = [
      ["x32010", "C"], ["320003", "G"], ["x02210", "Am"], ["022000", "Em"], ["xx0232", "D"], ["x02010", "Am7"], ["x32000", "Cmaj7"],
      ["x02020", "A7"], ["022xxx", "E5"], ["x20003", "G/B"], ["xx0211", "Dm7"], ["x5453x", "D7 (no 5th)"], ["3x343x", "G7"], ["1x2210", "Fmaj7"],
    ];
    for (const [shape, name] of cases) expect(read(shape)[0]?.name, shape).toBe(name);
  });
  test("lists the other possible names, most likely first, with likelihoods adding to 100%", () => {
    const r = read("xx5555");
    expect(r.map((c) => c.name).slice(0, 2).sort()).toEqual(["Am7/G", "C6/G"]);
    const sum = r.reduce((a, c) => a + c.likelihood, 0);
    expect(sum).toBeGreaterThan(0.98);
    for (let i = 1; i < r.length; i++) expect(r[i]!.likelihood).toBeLessThanOrEqual(r[i - 1]!.likelihood + 1e-12);
  });
  test("labels each fretted note with its degree, and explains the guess", () => {
    const top = read("x02010")[0]!;
    expect(top.degrees).toEqual(["1", "5", "b7", "b3", "5"]);
    expect(top.position).toBe("root position");
    expect(top.why.length).toBeGreaterThan(0);
  });
  test("needs at least two different notes", () => {
    expect(read("x0xxxx")).toEqual([]);
  });
});

group("compare", () => {
  test("every preset resolves and compares", () => {
    for (const p of COMPARE_PRESETS) {
      const c = compare(resolve(p.a)!, resolve(p.b)!);
      expect(c.summary.length, p.label).toBeGreaterThan(0);
    }
  });
  test("C vs Cm: one note moves down a half step", () => {
    const c = compare(resolve({ kind: "chord", rootPc: 0, id: "maj" })!, resolve({ kind: "chord", rootPc: 0, id: "min" })!);
    expect(c.onlyA.map((x) => x.name)).toEqual(["E"]);
    expect(c.onlyB.map((x) => x.name)).toEqual(["Eb"]);
    expect(c.moves!.filter((m) => m.by !== 0)).toEqual([{ from: "E", to: "Eb", by: -1 }]);
    expect(c.formula[0]!.text).toContain("major 3rd → minor 3rd");
  });
  test("relative major and minor share every note", () => {
    const c = compare(resolve({ kind: "scale", rootPc: 0, id: "ionian" })!, resolve({ kind: "scale", rootPc: 9, id: "aeolian" })!);
    expect(c.onlyA.length + c.onlyB.length).toBe(0);
    expect(c.summary[0]).toContain("same notes");
  });
  test("pentatonic fits inside the blues scale", () => {
    const c = compare(resolve({ kind: "scale", rootPc: 9, id: "minor-pentatonic" })!, resolve({ kind: "scale", rootPc: 9, id: "blues" })!);
    expect(c.summary[0]).toContain("Every note of A is inside B");
    expect(c.onlyB.map((x) => x.name)).toEqual(["Eb"]);
  });
});
