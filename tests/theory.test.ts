import { describe, expect, test } from "bun:test";
import {
  CHORDS,
  ROOTS,
  SCALES,
  degreeToSemitones,
  degreesToPitchClasses,
  identify,
  parseDegree,
  rootByName,
  spellDegree,
} from "../src/lib/theory";

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Pitch class of a spelled note name like "F#", "Bb", "Cbb", "E#". */
function pcOfName(name: string): number {
  let pc = LETTER_PC[name[0]!]!;
  for (const ch of name.slice(1)) pc += ch === "#" || ch === "♯" ? 1 : ch === "x" ? 2 : ch === "b" || ch === "♭" ? -1 : 0;
  return ((pc % 12) + 12) % 12;
}
const scale = (id: string) => SCALES.find((s) => s.id === id)!;

describe("degree math", () => {
  test.each([
    ["1", 0], ["b2", 1], ["2", 2], ["#2", 3], ["b3", 3], ["3", 4], ["4", 5], ["#4", 6], ["b5", 6],
    ["5", 7], ["#5", 8], ["b6", 8], ["6", 9], ["bb7", 9], ["b7", 10], ["7", 11],
    ["b9", 13], ["9", 14], ["#9", 15], ["11", 17], ["#11", 18], ["b13", 20], ["13", 21],
  ])("%s = %i semitones", (d, s) => expect(degreeToSemitones(d)).toBe(s));

  test("unicode accidentals parse the same", () => {
    expect(parseDegree("♭3")).toEqual(parseDegree("b3"));
    expect(parseDegree("♯11")).toEqual(parseDegree("#11"));
  });
});

describe("spelling", () => {
  test.each([
    ["C", "ionian", "C D E F G A B"],
    ["Eb", "ionian", "Eb F G Ab Bb C D"],
    ["F#", "ionian", "F# G# A# B C# D# E#"],
    ["Db", "ionian", "Db Eb F Gb Ab Bb C"],
    ["D", "dorian", "D E F G A B C"],
    ["E", "phrygian", "E F G A B C D"],
    ["Bb", "lydian", "Bb C D E F G A"],
    ["A", "harmonic-minor", "A B C D E F G#"],
    ["G#", "aeolian", "G# A# B C# D# E F#"],
  ])("%s %s", (root, id, expected) => {
    expect(scale(id).degrees.map((d) => spellDegree(rootByName(root), d)).join(" ")).toBe(expected);
  });

  test("every spelled note sounds the right pitch, for every root and every scale/chord", () => {
    for (const r of ROOTS)
      for (const set of [...SCALES.map((s) => s.degrees), ...CHORDS.map((c) => c.degrees)])
        for (const d of set) expect(pcOfName(spellDegree(r, d))).toBe((r.pc + degreeToSemitones(d) + 1200) % 12);
  });

  test("7-note scales built on 1..7 use each letter exactly once", () => {
    for (const s of SCALES) {
      const numbers = s.degrees.map((d) => parseDegree(d).number).join();
      if (numbers !== "1,2,3,4,5,6,7") continue;
      for (const r of ROOTS) expect(new Set(s.degrees.map((d) => spellDegree(r, d)[0])).size).toBe(7);
    }
  });
});

describe("library formulas", () => {
  test.each([
    ["ionian", "1 2 3 4 5 6 7"],
    ["dorian", "1 2 b3 4 5 6 b7"],
    ["phrygian", "1 b2 b3 4 5 b6 b7"],
    ["lydian", "1 2 3 #4 5 6 7"],
    ["mixolydian", "1 2 3 4 5 6 b7"],
    ["aeolian", "1 2 b3 4 5 b6 b7"],
    ["locrian", "1 b2 b3 4 b5 b6 b7"],
    ["harmonic-minor", "1 2 b3 4 5 b6 7"],
  ])("%s", (id, formula) => expect(scale(id).degrees.join(" ")).toBe(formula));

  test("the seven modes are rotations of one major-scale collection", () => {
    const steps = [0, 2, 4, 5, 7, 9, 11];
    ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"].forEach((id, i) => {
      const rotated = steps.map((s) => (s - steps[i]! + 12) % 12).sort((a, b) => a - b);
      expect(degreesToPitchClasses(scale(id).degrees)).toEqual(rotated);
    });
  });

  test("every chord and scale has unique degrees with no duplicate pitch", () => {
    for (const set of [...SCALES, ...CHORDS]) {
      expect(new Set(set.degrees).size).toBe(set.degrees.length);
      expect(degreesToPitchClasses(set.degrees).length).toBe(set.degrees.length);
    }
  });
});

describe("identify", () => {
  test("every library chord is named back as a chord with the same notes (chord context)", () => {
    for (const c of CHORDS) {
      const det = identify(rootByName("C"), degreesToPitchClasses(c.degrees), "chord");
      expect(det.known?.kind).toBe("chord");
      const named = CHORDS.find((x) => x.suffix === det.known?.suffix)!;
      expect(degreesToPitchClasses(named.degrees)).toEqual(degreesToPitchClasses(c.degrees));
    }
  });
  test("a set that is both: chord name on the Chords tab, scale name on the Scales tab", () => {
    const m13 = degreesToPitchClasses(["1", "b3", "5", "b7", "9", "11", "13"]);
    expect(identify(rootByName("C"), m13, "chord").known?.name).toBe("Cm13");
    expect(identify(rootByName("C"), m13, "scale").known?.name).toBe("C Dorian");
    expect(identify(rootByName("C"), m13).known?.kind).toBe("scale"); // unchanged default for 7 notes
  });
  test("every library scale is named back as a scale with the same notes (scale context)", () => {
    for (const s of SCALES) {
      const det = identify(rootByName("C"), degreesToPitchClasses(s.degrees), "scale");
      expect(det.known?.kind).toBe("scale");
      const named = SCALES.find((x) => det.known?.name === `C ${x.name}`)!;
      expect(degreesToPitchClasses(named.degrees)).toEqual(degreesToPitchClasses(s.degrees));
    }
  });
  test("common names", () => {
    const name = (root: string, ds: string[]) => identify(rootByName(root), degreesToPitchClasses(ds)).known?.name;
    expect(name("C", ["1", "3", "5", "7"])).toBe("Cmaj7");
    expect(name("A", ["1", "b3", "5", "b7"])).toBe("Am7");
    expect(name("G", ["1", "3", "5", "b7"])).toBe("G7");
  });
  test("an unrecognised set falls back to a custom formula, never a wrong name", () => {
    const det = identify(rootByName("C"), [0, 1, 2, 3, 4, 5, 6, 7]);
    expect(det.known).toBeUndefined();
    expect(det.formula).toBe("1 b2 2 b3 3 4 b5 5");
  });
});
