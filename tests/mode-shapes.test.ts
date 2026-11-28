import { describe, expect, test } from "bun:test";
import { TUNINGS } from "../src/lib/fretboard";
import { CAGED_ORDER, FORMS, MODE_INFO, cagedPositions } from "../src/lib/caged";
import { CLAIMED, DEFAULT_ANCHOR, anchorsSupporting, checkClaim, modeFormula, modeRelations, modeShapeNotes, shapeSignature, STD_OPEN_PCS, PATTERN_ORDER, PENTATONIC_STEPS, inCagedPattern } from "../src/lib/modeShapes";

const std = TUNINGS[0]!;
const MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
const ALL = Array.from({ length: 12 }, (_, t) => t).flatMap((t) => MODE_INFO.map((m) => [t, m.id] as const));

// Measured on the D-string anchor (see modeShapes.ts): the claimed shape's offset per mode.
const EXPECT_D: Record<string, { status: "exact" | "approx" | "no"; offset: number; best: string }> = {
  ionian: { status: "exact", offset: 0, best: "D" },
  dorian: { status: "exact", offset: 0, best: "C" },
  phrygian: { status: "approx", offset: 1, best: "A" },
  lydian: { status: "no", offset: 2, best: "A" },
  mixolydian: { status: "exact", offset: 0, best: "G" },
  aeolian: { status: "approx", offset: 1, best: "E" },
  locrian: { status: "no", offset: 3, best: "E" },
};

describe("parallel modes vs CAGED — all 84 tonic × mode combinations", () => {
  test("there are 84 combinations and each has five form relations", () => {
    expect(ALL.length).toBe(84);
    for (const [t, m] of ALL) expect(modeRelations(t, m)!.rels.map((r) => r.form)).toEqual(CAGED_ORDER);
  });

  test("the claimed shape's offset is the same in every key (D-string anchor)", () => {
    for (const [t, m] of ALL) {
      const c = checkClaim(t, m)!;
      const want = EXPECT_D[m]!;
      expect({ m, status: c.status, offset: c.offset }).toEqual({ m, status: want.status, offset: want.offset });
      expect(CLAIMED[m]).toBe(c.claimed);
    }
  });

  test("the closest shape to the tonic is the same in every key", () => {
    for (const [t, m] of ALL) expect(checkClaim(t, m)!.best).toBe(EXPECT_D[m]!.best);
  });

  test("offsets never depend on the key, for any anchor string", () => {
    for (const a of [0, 1, 2, 3, 4, 5])
      for (const m of MODE_INFO) {
        const base = modeRelations(0, m.id, a)!.rels.map((r) => r.offset);
        for (let t = 1; t < 12; t++) expect(modeRelations(t, m.id, a)!.rels.map((r) => r.offset)).toEqual(base);
      }
  });

  test("offsets are short-way-round distances", () => {
    for (const [t, m] of ALL) for (const r of modeRelations(t, m)!.rels) { expect(r.offset).toBeGreaterThanOrEqual(-6); expect(r.offset).toBeLessThanOrEqual(5); }
  });
});

describe("each correspondence, measured", () => {
  const E = 4;
  test("E Mixolydian: G shape of A major starts at fret 2 (exact, as observed)", () => {
    const g = modeRelations(E, "mixolydian")!.rels.find((r) => r.form === "G")!;
    expect(g).toMatchObject({ from: 2, to: 5, rootFret: 5, offset: 0, exact: true });
  });
  test("E Lydian: the G shape of B major sits at fret 4 (+2), not one fret off", () => {
    const g = modeRelations(E, "lydian")!.rels.find((r) => r.form === "G")!;
    expect(g).toMatchObject({ from: 4, to: 7, offset: 2, exact: false, approx: false });
  });
  test("E Lydian: the A shape of B major is the exact match on the D string", () => {
    const a = modeRelations(E, "lydian")!.rels.find((r) => r.form === "A")!;
    expect(a).toMatchObject({ from: 2, to: 5, offset: 0, exact: true });
  });
  test("Lydian's claimed G shape is within one fret only on the B string (−1)", () => {
    expect(anchorsSupporting("lydian")).toEqual([{ anchor: 4, offset: -1 }]);
  });
  test("Locrian's claimed C shape is exact only on the B string", () => {
    expect(anchorsSupporting("locrian")).toEqual([{ anchor: 4, offset: 0 }]);
  });
  test("Ionian D / Dorian C / Mixolydian G are exact and Phrygian A / Aeolian E are +1 on the D string", () => {
    const at = (m: string, f: string) => modeRelations(E, m, DEFAULT_ANCHOR)!.rels.find((r) => r.form === f)!.offset;
    expect([at("ionian", "D"), at("dorian", "C"), at("mixolydian", "G"), at("phrygian", "A"), at("aeolian", "E")]).toEqual([0, 0, 0, 1, 1]);
  });
  test("every mode has exactly one shape per form, so the 'match' always needs an anchor", () => {
    for (const m of MODE_INFO) expect(new Set(modeRelations(E, m.id)!.rels.map((r) => r.form)).size).toBe(5);
  });
});

describe("transposition, open strings and the neck's edges", () => {
  test("D Mixolydian: G shape of G major at the nut uses open strings", () => {
    const r = modeRelations(2, "mixolydian")!;
    const g = r.rels.find((x) => x.form === "G")!;
    expect(g).toMatchObject({ from: 0, to: 3, rootFret: 3, offset: 0, usesOpen: true, wrapped: false });
    const notes = modeShapeNotes(std, 2, "mixolydian", g);
    expect(notes.some((n) => n.fret === 0)).toBe(true);
  });
  test("a window that would start below the nut is shown an octave up and flagged", () => {
    const c = modeRelations(2, "phrygian")!.rels.find((r) => r.form === "C")!; // D Phrygian, C shape: −2 from the D string's open D
    expect(c.offset).toBe(-2);
    expect(c).toMatchObject({ wrapped: true, from: 10 });
  });
  test("no window ever leaves the 24-fret neck, for any anchor", () => {
    for (const a of [0, 1, 2, 3, 4, 5]) for (const [t, m] of ALL) for (const r of modeRelations(t, m, a)!.rels) { expect(r.from).toBeGreaterThanOrEqual(0); expect(r.to).toBeLessThanOrEqual(24); }
  });
  test("away from the nut the pattern is the same shape in every key (pure sliding)", () => {
    for (const m of MODE_INFO) for (const form of CAGED_ORDER) {
      const sigs = new Set<string>();
      for (let t = 0; t < 12; t++) {
        const r = modeRelations(t, m.id)!.rels.find((x) => x.form === form)!;
        if (r.from < 1) continue; // open strings / nut change what fits in the box
        sigs.add(shapeSignature(modeShapeNotes(std, t, m.id, r), r.from));
      }
      expect(sigs.size).toBe(1);
    }
  });
});

describe("note and interval identification", () => {
  test("mode formulas", () => {
    const f = (id: string) => modeFormula(id).map((x) => x.label).join(" ");
    expect(f("ionian")).toBe("1 2 3 4 5 6 7");
    expect(f("dorian")).toBe("1 2 b3 4 5 6 b7");
    expect(f("phrygian")).toBe("1 b2 b3 4 5 b6 b7");
    expect(f("lydian")).toBe("1 2 3 #4 5 6 7");
    expect(f("mixolydian")).toBe("1 2 3 4 5 6 b7");
    expect(f("aeolian")).toBe("1 2 b3 4 5 b6 b7");
    expect(f("locrian")).toBe("1 b2 b3 4 b5 b6 b7");
  });
  test("every note in every box belongs to the parent major key and is labelled from the tonic", () => {
    for (const [t, m] of ALL) {
      const r = modeRelations(t, m)!;
      const formula = modeFormula(m);
      for (const rel of r.rels) for (const n of modeShapeNotes(std, t, m, rel)) {
        expect(MAJOR.has((n.pc - r.parentPc + 12) % 12)).toBe(true);
        expect(n.label).toBe(formula.find((x) => x.semis === (n.pc - t + 12) % 12)!.label);
        expect(n.isTonic).toBe(n.pc === t);
      }
    }
  });
  test("each box holds the tonic and all seven degrees", () => {
    for (const [t, m] of ALL) for (const rel of modeRelations(t, m)!.rels) {
      const notes = modeShapeNotes(std, t, m, rel);
      expect(notes.some((n) => n.isTonic)).toBe(true);
      expect(new Set(notes.map((n) => n.degree)).size).toBe(7);
    }
  });
});

describe("compatibility with the existing CAGED system", () => {
  test("form definitions are untouched", () => {
    expect(FORMS).toEqual({
      C: { rootString: 1, lo: -3, hi: 0 }, A: { rootString: 1, lo: 0, hi: 3 }, G: { rootString: 0, lo: -3, hi: 0 }, E: { rootString: 0, lo: 0, hi: 3 }, D: { rootString: 2, lo: 0, hi: 3 },
    });
    expect(STD_OPEN_PCS).toEqual(std.strings.map((s) => s.pc));
  });
  test("every window agrees with cagedPositions() of the parent key", () => {
    for (const [t, m] of ALL) {
      const r = modeRelations(t, m)!;
      const all = cagedPositions(std, r.parentPc);
      for (const rel of r.rels) expect(all.some((p) => p.form === rel.form && p.from === rel.from && p.to === rel.to && p.rootFret === rel.rootFret)).toBe(true);
    }
  });
});

describe("the five-mode CAGED pattern (Lydian and Locrian excluded)", () => {
  test("sorted by step, the five pentatonic-start modes claim C, A, G, E, D in order", () => {
    expect(PATTERN_ORDER.map((m) => CLAIMED[m])).toEqual(["C", "A", "G", "E", "D"]);
    expect(PATTERN_ORDER.map((m) => MODE_INFO.find((x) => x.id === m)!.step)).toEqual([2, 4, 7, 9, 0]);
    expect(PENTATONIC_STEPS.sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 9]);
  });
  test("those five hold (exact or ±1) in all 60 keys × modes; Lydian and Locrian never do", () => {
    for (let t = 0; t < 12; t++) for (const m of MODE_INFO) {
      const c = checkClaim(t, m.id)!;
      expect(inCagedPattern(m.id)).toBe(c.status !== "no");
    }
  });
  test("offsets run 0, +1, 0, +1, 0 along the pattern", () => {
    expect(PATTERN_ORDER.map((m) => checkClaim(4, m)!.offset)).toEqual([0, 1, 0, 1, 0]);
  });
});
