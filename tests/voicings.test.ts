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

import { everyVoicing, voicingLevel } from "../src/lib/voicings";
import { neckPatterns } from "../src/lib/patterns";

describe("every way to play it", () => {
  const C = [0, 4, 7];
  test("every chord shape on the neck, impossible ones last", () => {
    const vs = everyVoicing({ tuning: std, rootPc: 0, pcs: C, fretFrom: 0, fretTo: 24, bass: "any" });
    expect(vs.length).toBeGreaterThan(200);
    const order = { easy: 0, stretch: 1, impossible: 2 } as const;
    for (let i = 1; i < vs.length; i++) expect(order[vs[i]!.level]).toBeGreaterThanOrEqual(order[vs[i - 1]!.level]);
    expect(vs.some((v) => v.level === "impossible")).toBe(true);
    expect(vs.some((v) => v.shape.join(",") === ",3,2,0,1,0")).toBe(true); // open C
    expect(vs.some((v) => v.shape.join(",") === "8,10,10,9,8,8")).toBe(true); // E-shape barre at 8
    expect(vs.slice(0, 5).some((v) => v.shape.join(",") === ",3,2,0,1,0")).toBe(true);
    for (const v of vs) {
      if (v.level !== "impossible") expect(fingersNeeded(v.shape)).toBeLessThanOrEqual(4);
      expect(v.level).toBe(voicingLevel(v));
    }
    // a 6-fret reach is never called playable
    expect(vs.filter((v) => v.span >= 5).every((v) => v.level === "impossible")).toBe(true);
  });
  test("scales and arpeggios: position boxes and per-string patterns all over the neck", () => {
    const major = [0, 2, 4, 5, 7, 9, 11];
    const ps = neckPatterns(std, 0, major, 24);
    expect(ps.filter((p) => p.kind === "position").length).toBeGreaterThanOrEqual(5);
    const nps = ps.filter((p) => p.kind === "per-string");
    expect(nps.length).toBeGreaterThanOrEqual(7);
    for (const p of nps) {
      expect(p.notes.length).toBe(18);
      for (let s = 0; s < 6; s++) expect(p.notes.filter((x) => x.string === s).length).toBe(3);
      for (const x of p.notes) expect(major).toContain(x.pc);
    }
    const arp = neckPatterns(std, 0, [0, 4, 7, 11], 24).filter((p) => p.kind === "per-string");
    for (const p of arp) expect(p.notes.length).toBe(12);
    const order = { easy: 0, stretch: 1, impossible: 2 } as const;
    for (let i = 1; i < ps.length; i++) expect(order[ps[i]!.level]).toBeGreaterThanOrEqual(order[ps[i - 1]!.level]);
  });
});

import { inversionName, inversionOrder } from "../src/lib/voicings";
describe("inversions", () => {
  test("names the inversion from the bass note", () => {
    expect(inversionName("1").short).toBe("root position");
    expect(inversionName("3").short).toBe("1st inversion");
    expect(inversionName("b3").short).toBe("1st inversion");
    expect(inversionName("5").short).toBe("2nd inversion");
    expect(inversionName("b7").short).toBe("3rd inversion");
    expect(inversionName("9").short).toBe("9 in the bass");
  });
  test("explains how the note order changed", () => {
    expect(inversionOrder(["3", "5", "1", "3"])).toContain("3–5–1");
    expect(inversionOrder(["3", "5", "1", "3"])).toContain("The 1 has moved up above the 3 and 5");
    expect(inversionOrder(["5", "1", "3"])).toContain("above the 5");
  });
});

import { fingering } from "../src/lib/voicings";
describe("finger placement", () => {
  const t = (s: string) => [...s].map((c) => (c === "x" ? null : parseInt(c, 16)));
  const f = (s: string) => fingering(t(s)).fingers.map((x) => (x === null ? "x" : x)).join("");
  test("standard fingerings for common shapes", () => {
    expect(f("x32010")).toBe("x32010"); // open C
    expect(f("x02210")).toBe("x02310"); // Am
    expect(f("022100")).toBe("023100"); // E
    expect(f("xx0232")).toBe("xx0132"); // D
    expect(f("133211")).toBe("134211"); // F barre
    expect(f("x24432")).toBe("x13421"); // Bm barre
    expect(fingering(t("133211")).barres).toEqual([{ finger: 1, fret: 1, from: 0, to: 5 }]);
  });
  test("impossible shapes show the fingers they'd need", () => {
    const g = fingering(t("875587"));
    expect(g.count).toBe(5);
    expect(Math.max(...g.fingers.map((x) => x ?? 0))).toBe(5);
  });
});
