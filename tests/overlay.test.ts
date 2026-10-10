import { describe, expect, test } from "bun:test";
import { SCALES, chordScaleOverlay, ownChord, tensionLabel, type Degree } from "../src/lib/theory";

const scale = (id: string) => SCALES.find((s) => s.id === id)!.degrees;

/** Overlay grouped by role, labels in the order they appear in the scale. */
function groups(set: Degree[], chord: Degree[]) {
  const ov = chordScaleOverlay(set, chord);
  const g: Record<string, string[]> = { chord: [], extension: [], other: [] };
  for (const v of ov.values()) g[v.role]!.push(v.label);
  return g;
}

describe("tensionLabel", () => {
  test("2/4/6 read as 9/11/13 with accidentals kept", () => {
    expect(["2", "b2", "#2", "4", "#4", "6", "b6"].map(tensionLabel)).toEqual(["9", "b9", "#9", "11", "#11", "13", "b13"]);
  });
  test("other degrees are unchanged", () => {
    expect(["1", "b3", "3", "5", "b5", "#5", "b7", "7"].map(tensionLabel)).toEqual(["1", "b3", "3", "5", "b5", "#5", "b7", "7"]);
  });
});

describe("ownChord (the scale's own chord on its root)", () => {
  test.each([
    ["ionian", ["1", "3", "5", "7"]],
    ["dorian", ["1", "b3", "5", "b7"]],
    ["phrygian", ["1", "b3", "5", "b7"]],
    ["lydian", ["1", "3", "5", "7"]],
    ["mixolydian", ["1", "3", "5", "b7"]],
    ["aeolian", ["1", "b3", "5", "b7"]],
    ["locrian", ["1", "b3", "b5", "b7"]],
    ["harmonic-minor", ["1", "b3", "5", "7"]],
    ["melodic-minor", ["1", "b3", "5", "7"]],
  ])("%s", (id, expected) => expect(ownChord(scale(id))).toEqual(expected));

  test("a scale with no 7th gives a triad", () => {
    expect(ownChord(["1", "2", "3", "5", "6"])).toEqual(["1", "3", "5"]);
  });
  test("the unaltered 5th wins when a scale has two (blues)", () => {
    expect(ownChord(["1", "b3", "4", "b5", "5", "b7"])).toEqual(["1", "b3", "5", "b7"]);
  });
  test("whole tone builds its augmented 7th (1 3 #5 b7)", () => {
    expect(ownChord(["1", "2", "3", "#4", "#5", "b7"])).toEqual(["1", "3", "#5", "b7"]);
  });
  test("no chord when there is no 3rd to build on (suspended pentatonic)", () => {
    expect(ownChord(["1", "2", "4", "5", "b7"])).toBeNull();
  });
});

describe("chordScaleOverlay", () => {
  test("Dorian over its own m7: 9 11 13 are all extensions", () => {
    expect(groups(scale("dorian"), ["1", "b3", "5", "b7"])).toEqual({
      chord: ["1", "b3", "5", "b7"],
      extension: ["9", "11", "13"],
      other: [],
    });
  });
  test("Ionian over maj7: the 4 sits a half step above the 3rd", () => {
    expect(groups(scale("ionian"), ["1", "3", "5", "7"])).toEqual({
      chord: ["1", "3", "5", "7"],
      extension: ["9", "13"],
      other: ["11"],
    });
  });
  test("Lydian over maj7: #11 is an extension", () => {
    expect(groups(scale("lydian"), ["1", "3", "5", "7"]).extension).toEqual(["9", "#11", "13"]);
  });
  test("Mixolydian over 7: 11 is the other tone", () => {
    expect(groups(scale("mixolydian"), ["1", "3", "5", "b7"]).other).toEqual(["11"]);
  });
  test("b3 over a major-3rd chord is named #9, b5 over a 5th is #11", () => {
    const ov = chordScaleOverlay(["1", "b3", "3", "b5", "5", "b7"], ["1", "3", "5", "b7"]);
    expect(ov.get(3)?.label).toBe("#9");
    expect(ov.get(6)?.label).toBe("#11");
  });
  test("every note of the set gets exactly one role", () => {
    for (const s of SCALES) {
      const own = ownChord(s.degrees);
      if (!own) continue;
      const ov = chordScaleOverlay(s.degrees, own);
      expect(ov.size).toBe(new Set(s.degrees.map((d) => d)).size);
      for (const d of own) expect([...ov.values()].some((v) => v.role === "chord" && v.label === d)).toBe(true);
    }
  });
});
