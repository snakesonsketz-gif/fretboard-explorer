import { describe, expect, test } from "bun:test";
import { TUNINGS } from "../src/lib/fretboard";
import { cagedPositions, connection, formShapeFor, mapSetInWindow, modeInfo, parentKeyPc, tonicsInWindow, CAGED_ORDER } from "../src/lib/caged";

const std = TUNINGS[0]!;
const pcsOf = (root: number, iv: number[]) => new Set(iv.map((i) => (root + i) % 12));

describe("CAGED chord forms", () => {
  test("open forms come back exactly as the book shapes", () => {
    const at = (rootPc: number, form: string) => cagedPositions(std, rootPc).find((p) => p.form === form && p.from === 0 || (p.form === form && p.rootFret < 12))!;
    expect(formShapeFor(std, at(0, "C"), new Set([0, 4, 7]))!.shape).toEqual([null, 3, 2, 0, 1, 0]);
    expect(formShapeFor(std, at(4, "E"), new Set([0, 3, 7]))!.shape).toEqual([0, 2, 2, 0, 0, 0]);
    expect(formShapeFor(std, at(9, "A"), new Set([0, 3, 7, 10]))!.shape).toEqual([null, 0, 2, 0, 1, 0]);
    expect(formShapeFor(std, at(7, "G"), new Set([0, 4, 7, 10]))!.shape).toEqual([3, 2, 0, 0, 0, 1]);
  });

  test("every form's chord tones really are the chord, wherever it slides to", () => {
    const qualities = [[0, 4, 7], [0, 3, 7], [0, 4, 7, 10], [0, 4, 7, 11], [0, 3, 7, 10], [0, 5, 7]];
    for (let root = 0; root < 12; root++)
      for (const iv of qualities)
        for (const p of cagedPositions(std, root)) {
          const f = formShapeFor(std, p, new Set(iv));
          if (!f) continue;
          const want = pcsOf(root, iv);
          f.shape.forEach((fr, si) => {
            if (fr === null) return;
            expect(want.has((std.strings[si]!.pc + fr) % 12)).toBe(true);
          });
          // the form sits inside its position window
          const frets = f.shape.filter((x): x is number => x !== null);
          expect(Math.min(...frets)).toBeGreaterThanOrEqual(p.from);
          expect(Math.max(...frets)).toBeLessThanOrEqual(p.to);
        }
  });

  test("no everyday C-shaped minor chord, and other tunings don't get standard shapes", () => {
    const c = cagedPositions(std, 0).find((p) => p.form === "C")!;
    expect(formShapeFor(std, c, new Set([0, 3, 7]))).toBeNull();
    expect(formShapeFor(TUNINGS.find((t) => t.id === "drop-d")!, cagedPositions(std, 0)[0]!, new Set([0, 4, 7]))).toBeNull();
  });
});

describe("shape-to-shape connections", () => {
  test("neighbouring shapes share frets and notes, and the shared notes are in both windows", () => {
    const major = pcsOf(0, [0, 2, 4, 5, 7, 9, 11]);
    const all = cagedPositions(std, 0);
    for (let i = 0; i < all.length - 1; i++) {
      const c = connection(std, major, all[i]!, all[i + 1]!);
      if (c.overlap) {
        expect(c.shared.length).toBeGreaterThan(0);
        expect(c.shared.every((m) => m.fret >= c.overlap!.from && m.fret <= c.overlap!.to && major.has(m.pc))).toBe(true);
      }
    }
  });

  test("going up the neck follows C A G E D", () => {
    const forms = cagedPositions(std, 0).map((p) => p.form);
    for (let i = 0; i < forms.length - 1; i++) {
      const next = CAGED_ORDER[(CAGED_ORDER.indexOf(forms[i]!) + 1) % 5];
      expect(forms[i + 1]).toBe(next);
    }
  });
});

describe("modes on CAGED", () => {
  test("D dorian lives in C major's shapes", () => {
    const d = modeInfo("dorian")!;
    expect(parentKeyPc(2, d.step)).toBe(0);
    for (const m of ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"]) {
      const info = modeInfo(m)!;
      // the mode's notes are the parent major's notes
      expect(parentKeyPc((0 + info.step) % 12, info.step)).toBe(0);
    }
  });

  test("the mode's home note shows up in every position window", () => {
    for (const p of cagedPositions(std, 0)) {
      const w = { from: p.from - 1, to: p.to + 1 };
      expect(tonicsInWindow(std, 2, Math.max(0, w.from), w.to).length).toBeGreaterThan(0);
    }
    expect(mapSetInWindow(std, new Set([2]), 0, 3)[1]!.map((m) => m.fret)).toEqual([]);
  });
});
