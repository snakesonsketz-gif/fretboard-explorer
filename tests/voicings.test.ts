import { describe, expect, test } from "bun:test";
import { TUNINGS } from "../src/lib/fretboard";
import { findVoicings, fingersNeeded } from "../src/lib/voicings";

const std = TUNINGS[0]!;
const F = 5;

describe("shape finder: only shapes a hand can hold", () => {
  test("a barre can't leave an open or muted string under it", () => {
    expect(fingersNeeded([1, 3, 3, 2, 0, 1])).toBeGreaterThan(4); // F barre with the B string open
    expect(fingersNeeded([1, 3, 3, 2, null, 1])).toBeGreaterThan(4); // ...or muted
    expect(fingersNeeded([1, 3, 3, 2, 1, 1])).toBe(4); // the real F barre
    expect(fingersNeeded([1, 3, 3, 2, 1, 0])).toBe(4); // barre stops before the open top string
    expect(fingersNeeded([null, 0, 2, 2, 2, 0])).toBe(1); // A: one finger across three strings
    expect(fingersNeeded([null, 3, 2, 0, 1, 0])).toBe(3); // open C
  });

  test("F with B (F lydian colour) never comes back as 1 3 3 2 0 1", () => {
    const pcs = [F, F + 4, F + 7, F + 6].map((p) => p % 12);
    const shapes = findVoicings({ tuning: std, rootPc: F, pcs, fretFrom: 0, fretTo: 5, bass: "root", maxSpan: 3, limit: 200 }).map((v) => v.shape.join(","));
    expect(shapes).not.toContain([1, 3, 3, 2, 0, 1].join(","));
  });

  test("every suggested shape, for every major and minor 7th chord on every root, needs at most 4 fingers", () => {
    for (let root = 0; root < 12; root++)
      for (const ivs of [[0, 4, 7], [0, 3, 7], [0, 4, 7, 11], [0, 3, 7, 10], [0, 4, 7, 10]])
        for (const v of findVoicings({ tuning: std, rootPc: root, pcs: ivs.map((i) => (root + i) % 12), fretFrom: 0, fretTo: 12, bass: "root", maxSpan: 3, limit: 60 }))
          expect(fingersNeeded(v.shape)).toBeLessThanOrEqual(4);
  });
});
