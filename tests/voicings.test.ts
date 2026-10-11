import { describe, expect, test } from "bun:test";
import { TUNINGS } from "../src/lib/fretboard";
import { findVoicings, fingersNeeded } from "../src/lib/voicings";

const std = TUNINGS[0]!;
const F = 5;

describe("shape finder: only shapes a hand can hold", () => {
  test("a barre can't leave an open or muted string under it", () => {
    expect(fingersNeeded([1, 3, 3, 2, 0, 1])).toBeGreaterThan(4); // F barre with the B string open
    expect(fingersNeeded([1, 3, 3, 2, null, 1])).toBeGreaterThan(4); // ...or muted
    expect(fingersNeeded([1, 3, 3, 2, 1, 1])).toBeLessThanOrEqual(4); // the real F barre
    expect(fingersNeeded([1, 3, 3, 2, 1, 0])).toBeLessThanOrEqual(4); // barre stops before the open top string
    expect(fingersNeeded([null, 0, 2, 2, 2, 0])).toBe(1); // A: one finger across three strings
    expect(fingersNeeded([null, 3, 2, 0, 1, 0])).toBe(3); // open C
    expect(fingersNeeded([3, 2, 0, 0, 0, 3])).toBe(3); // open G: two fingers on the 3rd fret, far apart, fine
    expect(fingersNeeded([0, 2, 0, 0, 0, 2])).toBe(2); // Em9: nothing pressed between them
    expect(fingersNeeded([null, null, 0, 2, 3, 2])).toBeLessThanOrEqual(3); // D
    expect(fingersNeeded([null, 3, 2, 3, 3, 3])).toBe(3); // C9: the top three barred at the 3rd fret
  });

  test("every chord shape the app teaches — games and the guided recordings — is playable", async () => {
    const { CHORDS } = await import("../src/lib/games");
    const { PLAN } = await import("../src/lib/listen/collectPlan");
    const parse = (t: string) => [...t].map((c) => (c === "x" ? null : Number(c)));
    for (const [name, c] of Object.entries(CHORDS)) expect([name, fingersNeeded(parse(c.tab)) <= 4]).toEqual([name, true]);
    for (const s of PLAN) if (s.tab) expect([s.id, fingersNeeded(parse(s.tab)) <= 4]).toEqual([s.id, true]);
  });

  test("F with B: 1 3 3 2 0 1 is still shown on Explore, but flagged and listed last", () => {
    const pcs = [F, F + 4, F + 7, F + 6].map((p) => p % 12);
    const vs = findVoicings({ tuning: std, rootPc: F, pcs, fretFrom: 0, fretTo: 5, bass: "root", maxSpan: 3, limit: 200 });
    const v = vs.find((x) => x.shape.join(",") === [1, 3, 3, 2, 0, 1].join(","));
    expect(v?.doubtful).toBe(true);
    const firstDoubtful = vs.findIndex((x) => x.doubtful);
    expect(vs.slice(firstDoubtful).every((x) => x.doubtful)).toBe(true);
  });

  test("every suggested shape not flagged doubtful needs at most 4 fingers", () => {
    for (let root = 0; root < 12; root++)
      for (const ivs of [[0, 4, 7], [0, 3, 7], [0, 4, 7, 11], [0, 3, 7, 10], [0, 4, 7, 10]])
        for (const v of findVoicings({ tuning: std, rootPc: root, pcs: ivs.map((i) => (root + i) % 12), fretFrom: 0, fretTo: 12, bass: "root", maxSpan: 3, limit: 60 }))
          expect(v.doubtful || fingersNeeded(v.shape) <= 4).toBe(true);
  });
});
