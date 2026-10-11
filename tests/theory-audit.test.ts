/**
 * Music-theory audit: locks in the theory the app teaches — chord formulas against their names,
 * scale formulas and mode families, spelling, the harmoniser, Nashville numbers, the games' chord
 * shapes and ear-trainer answers, the guided recording plan and the Grimoire page's scale table.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ARPEGGIO_VARIANTS,
  CHORDS,
  ROOTS,
  SCALES,
  bestRootFor,
  degreeToSemitones,
  degreesToPitchClasses,
  harmonize,
  identify,
  majorModeViews,
  parentMajorOf,
  parseDegree,
  pretty,
  rootByName,
  spellDegree,
  type ChordDef,
  type Degree,
} from "../src/lib/theory";
import { FLAVORS, KEYS, NUMBERS, buildChord, chordName, keyPc, noteIn } from "../src/lib/nashville";
import { CHORDS as GAME_CHORDS, EAR_ANSWERS } from "../src/lib/games";
import { arpeggioTier, chordTier, scaleTier } from "../src/lib/levels";
import { PLAN, tabMidis } from "../src/lib/listen/collectPlan";
import { TUNINGS } from "../src/lib/fretboard";
import { analyzeShape } from "../src/lib/voicings";
import { readings } from "../src/lib/identifier";

const pc12 = (n: number) => ((n % 12) + 12) % 12;
const pcSet = (ds: readonly Degree[]) => new Set(ds.map((d) => pc12(degreeToSemitones(d))));
const sorted = (s: Iterable<number>) => [...s].sort((a, b) => a - b);
const scale = (id: string) => SCALES.find((s) => s.id === id)!;
const chord = (id: string) => CHORDS.find((c) => c.id === id)!;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Pitch class of a note name, reading only its leading accidentals ("Bbm7b5" is Bb). */
const pcOfName = (name: string) => {
  const m = /^([A-G])([#♯b♭x]*)/.exec(name)!;
  return pc12([...m[2]!].reduce((a, ch) => a + (ch === "#" || ch === "♯" ? 1 : ch === "x" ? 2 : -1), LETTER_PC[m[1]!]!));
};

/* ================================================================== scales */

/** Every scale's formula, checked against standard definitions. */
const SCALE_FORMULAS: Record<string, string> = {
  ionian: "1 2 3 4 5 6 7",
  dorian: "1 2 b3 4 5 6 b7",
  phrygian: "1 b2 b3 4 5 b6 b7",
  lydian: "1 2 3 #4 5 6 7",
  mixolydian: "1 2 3 4 5 6 b7",
  aeolian: "1 2 b3 4 5 b6 b7",
  locrian: "1 b2 b3 4 b5 b6 b7",
  "harmonic-minor": "1 2 b3 4 5 b6 7",
  "melodic-minor": "1 2 b3 4 5 6 7",
  "phrygian-dominant": "1 b2 3 4 5 b6 b7",
  "lydian-dominant": "1 2 3 #4 5 6 b7",
  altered: "1 b2 b3 b4 b5 b6 b7",
  "major-pentatonic": "1 2 3 5 6",
  "minor-pentatonic": "1 b3 4 5 b7",
  blues: "1 b3 4 b5 5 b7",
  "major-blues": "1 2 b3 3 5 6",
  "whole-tone": "1 2 3 #4 #5 b7",
  "dim-whole-half": "1 2 b3 4 b5 b6 6 7",
  "dim-half-whole": "1 b2 #2 3 #4 5 6 b7",
  chromatic: "1 b2 2 b3 3 4 b5 5 b6 6 b7 7",
  augmented: "1 b3 3 5 #5 7",
  "harmonic-major": "1 2 3 4 5 b6 7",
  "hungarian-minor": "1 2 b3 #4 5 b6 7",
  "double-harmonic": "1 b2 3 4 5 b6 7",
  "japanese-insen": "1 b2 4 5 b7",
  "dorian-b2": "1 b2 b3 4 5 6 b7",
  "lydian-augmented": "1 2 3 #4 #5 6 7",
  "mixolydian-b6": "1 2 3 4 5 b6 b7",
  "locrian-nat2": "1 2 b3 4 b5 b6 b7",
  "locrian-nat6": "1 b2 b3 4 b5 6 b7",
  "ionian-s5": "1 2 3 4 #5 6 7",
  "dorian-s4": "1 2 b3 #4 5 6 b7",
  "lydian-s2": "1 #2 3 #4 5 6 7",
  ultralocrian: "1 b2 b3 b4 b5 b6 bb7",
  "dorian-b5": "1 2 b3 4 b5 6 b7",
  "phrygian-b4": "1 b2 b3 b4 5 b6 b7",
  "lydian-b3": "1 2 b3 #4 5 6 7",
  "mixolydian-b2": "1 b2 3 4 5 6 b7",
  "lydian-aug-s2": "1 #2 3 #4 #5 6 7",
  "locrian-bb7": "1 b2 b3 4 b5 b6 bb7",
  "neapolitan-minor": "1 b2 b3 4 5 b6 7",
  "neapolitan-major": "1 b2 b3 4 5 6 7",
  "hungarian-major": "1 #2 3 #4 5 6 b7",
  enigmatic: "1 b2 3 #4 #5 #6 7",
  persian: "1 b2 3 4 b5 b6 7",
  "major-locrian": "1 2 3 4 b5 b6 b7",
  "gypsy-minor": "1 2 b3 #4 5 b6 b7",
  "dominant-pentatonic": "1 2 3 5 b7",
  "minor6-pentatonic": "1 b3 4 5 6",
  egyptian: "1 2 4 5 b7",
  "blues-minor-pent": "1 b3 4 b6 b7",
  "lydian-pentatonic": "1 3 #4 5 7",
  hirajoshi: "1 2 b3 5 b6",
  iwato: "1 b2 4 b5 b7",
  kumoi: "1 2 b3 5 6",
  pelog: "1 b2 b3 5 b6",
  prometheus: "1 2 3 #4 6 b7",
  "tritone-scale": "1 b2 3 b5 5 b7",
  "bebop-dominant": "1 2 3 4 5 6 b7 7",
  "bebop-major": "1 2 3 4 5 #5 6 7",
  "bebop-dorian": "1 2 b3 3 4 5 6 b7",
  "bebop-melodic-minor": "1 2 b3 4 5 #5 6 7",
  "spanish-8": "1 b2 #2 3 4 b5 b6 b7",
  "messiaen-3": "1 2 b3 3 #4 5 #5 #6 7",
  "messiaen-4": "1 b2 2 4 #4 5 b6 7",
  "major-hexatonic": "1 2 3 4 5 6",
  "minor-hexatonic": "1 2 b3 4 5 b7",
  oriental: "1 b2 3 4 b5 6 b7",
  "leading-whole-tone": "1 2 3 #4 #5 #6 7",
  "six-tone-symmetric": "1 b2 3 4 #5 6",
};

describe("scales: formulas", () => {
  test("every scale in the library has a checked formula, and matches it", () => {
    expect(SCALES.map((s) => s.id).sort()).toEqual(Object.keys(SCALE_FORMULAS).sort());
    for (const s of SCALES) expect([s.id, s.degrees.join(" ")]).toEqual([s.id, SCALE_FORMULAS[s.id]!]);
  });

  test("degree labels ascend in pitch and use the right letter count", () => {
    for (const s of SCALES) {
      const semis = s.degrees.map(degreeToSemitones);
      for (let i = 1; i < semis.length; i++) expect([s.id, semis[i]! > semis[i - 1]!]).toEqual([s.id, true]);
      expect(s.degrees[0]).toBe("1");
    }
  });

  test("scale ids are unique", () => expect(new Set(SCALES.map((s) => s.id)).size).toBe(SCALES.length));
});

describe("scales: mode families (modeOf)", () => {
  const families = new Map<string, Map<number, string>>();
  for (const s of SCALES)
    if (s.modeOf) {
      const f = families.get(s.modeOf.family) ?? new Map<number, string>();
      expect([s.id, f.has(s.modeOf.index)]).toEqual([s.id, false]); // one scale per (family, index)
      f.set(s.modeOf.index, s.id);
      families.set(s.modeOf.family, f);
    }

  test("every family has its parent at index 0", () => {
    for (const [fam, f] of families) expect([fam, f.has(0)]).toEqual([fam, true]);
    expect(sorted(families.get("major")!.keys())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sorted(families.get("melodic-minor")!.keys())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sorted(families.get("harmonic-minor")!.keys())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sorted(families.get("harmonic-major")!.keys())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test("rotating the parent's notes to mode N gives exactly that mode's notes", () => {
    for (const s of SCALES) {
      if (!s.modeOf) continue;
      const parent = scale(families.get(s.modeOf.family)!.get(0)!);
      const semis = parent.degrees.map((d) => pc12(degreeToSemitones(d)));
      const start = semis[s.modeOf.index]!;
      expect([s.id, sorted(semis.map((x) => pc12(x - start)))]).toEqual([s.id, degreesToPitchClasses(s.degrees)]);
    }
  });

  test("a scale filed under '<parent> modes' says which mode it is", () => {
    const famOf: Record<string, string> = { "Melodic minor modes": "melodic-minor", "Harmonic minor modes": "harmonic-minor", "Harmonic major modes": "harmonic-major", "Major modes": "major" };
    for (const s of SCALES) if (famOf[s.family]) expect([s.id, s.modeOf?.family]).toEqual([s.id, famOf[s.family]!]);
  });

  test("'Mode N of X' / 'Nth mode of X' in the text agrees with modeOf", () => {
    const ord = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
    const fam: Record<string, string> = { "melodic minor": "melodic-minor", "harmonic minor": "harmonic-minor", "harmonic major": "harmonic-major", "major pentatonic": "pentatonic" };
    let checked = 0;
    for (const s of SCALES)
      for (const text of [s.theory, ...(s.aliases ?? [])]) {
        const m = /\b(?:mode (\d)|(first|second|third|fourth|fifth|sixth|seventh) mode) of (melodic minor|harmonic minor|harmonic major|major pentatonic)/i.exec(text);
        if (!m) continue;
        const index = m[1] ? Number(m[1]) - 1 : ord.indexOf(m[2]!.toLowerCase());
        expect([s.id, s.modeOf]).toEqual([s.id, { family: fam[m[3]!.toLowerCase()]!, index }]);
        checked++;
      }
    expect(checked).toBeGreaterThanOrEqual(20);
  });
});

describe("scales: bebop, symmetric and named facts", () => {
  test("bebop scales: 8 notes = the parent scale plus one chromatic passing tone between neighbours", () => {
    const parents: Record<string, string> = { "bebop-dominant": "mixolydian", "bebop-major": "ionian", "bebop-dorian": "dorian", "bebop-melodic-minor": "melodic-minor" };
    for (const s of SCALES.filter((x) => x.family === "Bebop")) {
      expect(s.degrees).toHaveLength(8);
      const parent = pcSet(scale(parents[s.id]!).degrees);
      const own = sorted(pcSet(s.degrees));
      for (const p of parent) expect(own).toContain(p);
      const extra = own.filter((p) => !parent.has(p));
      expect(extra).toHaveLength(1);
      expect(parent.has(pc12(extra[0]! - 1)) && parent.has(pc12(extra[0]! + 1))).toBe(true);
    }
  });

  test("everything filed as Symmetric repeats at a transposition (mode of limited transposition)", () => {
    const period = (ds: Degree[]) => {
      const set = pcSet(ds);
      for (let t = 1; t < 12; t++) if ([...set].every((p) => set.has(pc12(p + t)))) return t;
      return 12;
    };
    const expected: Record<string, number> = { "whole-tone": 2, "dim-whole-half": 3, "dim-half-whole": 3, chromatic: 1, augmented: 4, "tritone-scale": 6, "messiaen-3": 4, "messiaen-4": 6, "six-tone-symmetric": 4 };
    for (const s of SCALES.filter((x) => x.family === "Symmetric")) expect([s.id, period(s.degrees)]).toEqual([s.id, expected[s.id]!]);
    expect(period(scale("prometheus").degrees)).toBe(12); // not symmetric, so not filed there
    expect(period(scale("leading-whole-tone").degrees)).toBe(12);
  });

  test("the diminished scales: whole-half fits dim7, half-whole fits 7b9 (and contains 13, #11)", () => {
    for (const d of chord("dim7").degrees) expect(pcSet(scale("dim-whole-half").degrees).has(pc12(degreeToSemitones(d)))).toBe(true);
    for (const d of ["1", "3", "5", "b7", "b9", "#9", "#11", "13"]) expect(pcSet(scale("dim-half-whole").degrees).has(pc12(degreeToSemitones(d)))).toBe(true);
  });

  test("altered = melodic minor from its 7th = every dominant alteration", () => {
    expect(sorted(pcSet(scale("altered").degrees))).toEqual(sorted(pcSet(["1", "b9", "#9", "3", "b5", "#5", "b7"])));
  });

  test("diatonic chord-quality lines match the harmoniser (accidentals aside)", () => {
    for (const s of SCALES.filter((x) => x.chordScale)) {
      const romans = harmonize(rootByName("C"), s, true).map((h) => h.roman.replace(/^[b#]+/, ""));
      expect([s.id, romans.join(" ")]).toEqual([s.id, s.chordScale!]);
    }
  });

  test("harmonised 7th chords: C major and A harmonic minor", () => {
    const h = (r: string, id: string) => harmonize(rootByName(r), scale(id), true).map((c) => `${c.roman}:${c.name}`).join(" ");
    expect(h("C", "ionian")).toBe("Imaj7:Cmaj7 ii7:Dm7 iii7:Em7 IVmaj7:Fmaj7 V7:G7 vi7:Am7 viiø:Bm7b5");
    expect(h("A", "harmonic-minor")).toBe("i(maj7):Am(maj7) iiø:Bm7b5 bIII+maj7:Cmaj7#5 iv7:Dm7 V7:E7 bVImaj7:Fmaj7 vii°7:G#dim7");
    expect(harmonize(rootByName("C"), scale("ionian"), false).map((c) => c.roman).join(" ")).toBe("I ii iii IV V vi vii°");
  });
});

/* ================================================================== chords */

/** Intervals a chord symbol spells: required tones, and tones it may leave out (the 5th, etc.). */
interface Spec { req: Set<number>; opt: Set<number> }
const NATURAL: Record<number, number> = { 9: 14, 11: 17, 13: 21 };

/** Parse the common chord-suffix grammar (m, dim/°, aug/+, 5, 6, 6/9, (maj)7/9/11/13, sus2/4, add, alterations, (…) lists). */
function parseSuffix(sfx: string): Spec | null {
  if (/\s/.test(sfx.replace(/\([^)]*\)/g, ""))) return null; // a description, not a symbol
  let s = sfx;
  let third: number | null = 4, thirdOpt = false, fifth: number | null = 7, seventh: number | null = null, ext = 0, minor = false, alt = false;
  const adds: number[] = [], alters: [number, number][] = [], drop = new Set<number>();
  const take = (re: RegExp) => {
    const m = re.exec(s);
    if (m) s = s.slice(m[0].length);
    return m;
  };
  const alter = (acc: string, n: number) => {
    if (n === 5) fifth = acc === "b" ? 6 : 8;
    else alters.push([n, NATURAL[n]! + (acc === "b" ? -1 : 1)]);
  };
  let m: RegExpExecArray | null;
  if (take(/^5/)) third = null;
  else if ((m = take(/^m\(maj(7|9|11|13)\)/))) (third = 3), (minor = true), (seventh = 11), (ext = Number(m[1]));
  else if (take(/^dim\(maj7\)/)) (third = 3), (fifth = 6), (seventh = 11);
  else if (take(/^(dim|°)/)) {
    third = 3;
    fifth = 6;
    if (take(/^7/)) seventh = 9;
    else if (take(/^9/)) (seventh = 9), (ext = 9);
  } else if (take(/^(aug|\+)/)) fifth = 8;
  else if (take(/^m(?!aj)/)) (third = 3), (minor = true);
  if (take(/^6\/9/)) adds.push(9, 14);
  else if (take(/^6/)) adds.push(9);
  if ((m = take(/^(maj)?(7|9|11|13)/))) (seventh = m[1] ? 11 : 10), (ext = Number(m[2]));
  if (take(/^\/6/)) adds.push(9);
  if (take(/^alt/)) alt = true;
  while ((m = take(/^(b|#)(5|9|11|13)/))) alter(m[1]!, Number(m[2]));
  if ((m = take(/^sus(2|4)/))) third = m[1] === "2" ? 2 : 5;
  if ((m = take(/^add(b|#)?(\d+)/))) adds.push(degreeToSemitones(`${m[1] ?? ""}${m[2]}`));
  while ((m = take(/^\(([^)]*)\)/)))
    for (const raw of m[1]!.split(",")) {
      const item = raw.trim();
      let k: RegExpExecArray | null;
      if (item === "no5") fifth = null;
      else if (item === "no3") third = null;
      else if (item === "no11") drop.add(17);
      else if (item === "maj7" || item === "add maj7") adds.push(11);
      else if ((k = /^(b|#)(5|9|11|13)$/.exec(item))) alter(k[1]!, Number(k[2]));
      else if ((k = /^(9|11|13)$/.exec(item))) adds.push(NATURAL[Number(k[1])]!);
      else if ((k = /^add(b|#)?(\d+)$/.exec(item))) adds.push(degreeToSemitones(`${k[1] ?? ""}${k[2]}`));
      else return null;
    }
  if (s.length) return null;

  const req = new Set<number>([0]), opt = new Set<number>();
  // The dominant 11th leaves its 3rd out (it clashes with the 11).
  if (ext === 11 && seventh === 10 && third === 4) thirdOpt = true;
  if (third !== null) (thirdOpt ? opt : req).add(third);
  if (fifth !== null) (fifth === 7 ? opt : req).add(fifth); // a perfect 5th may always be left out
  if (seventh !== null) req.add(seventh);
  if (ext >= 9) req.add(14);
  if (ext >= 11 && ext !== 13) req.add(17);
  if (ext === 13) {
    req.add(21);
    if (minor) opt.add(17); // the 11 is optional on a minor 13th (no avoid note there)
  }
  for (const [n, semi] of alters) req.delete(NATURAL[n]!), req.add(semi);
  for (const d of drop) req.delete(d), opt.delete(d);
  for (const a of adds) req.add(a);
  if (alt) {
    req.add(13).add(15).add(20);
    req.delete(7);
    opt.delete(7);
    opt.add(18); // b5/#11 also belongs to the altered scale
  }
  return { req: new Set([...req].map(pc12)), opt: new Set([...opt].map(pc12)) };
}

const fits = (spec: Spec, pcs: Set<number>) => [...spec.req].every((p) => pcs.has(p)) && [...pcs].every((p) => spec.req.has(p) || spec.opt.has(p));

const ROMAN: Record<string, number> = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
/** "bVI", "IIm" → the triad's pitch classes over the root. */
function triadOn(numeral: string): Set<number> {
  const m = /^(b?)(I|II|III|IV|V|VI|VII)(m?)$/.exec(numeral)!;
  const r = ROMAN[m[2]!]! - (m[1] ? 1 : 0);
  return new Set([r, r + (m[3] ? 3 : 4), r + 7].map(pc12));
}

/** Chords whose suffix is a description, each checked by its own structure. */
function structural(c: ChordDef): boolean {
  const pcs = pcSet(c.degrees);
  const eq = (set: Iterable<number>) => expect([c.id, sorted(pcs)]).toEqual([c.id, sorted(new Set([...set].map(pc12)))]);
  let m: RegExpExecArray | null;
  if ((m = /^(.*) \(rootless.*\)$/.exec(c.suffix))) {
    const base = parseSuffix(m[1]!)!;
    expect([c.id, c.degrees.includes("1")]).toEqual([c.id, false]);
    for (const p of pcs) expect([c.id, p, base.req.has(p) || base.opt.has(p)]).toEqual([c.id, p, true]);
    for (const p of base.req) if ([3, 4, 9, 10, 11].includes(p)) expect([c.id, p, pcs.has(p)]).toEqual([c.id, p, true]); // keeps the 3rd and 7th
    return true;
  }
  if ((m = /^(.*) \((.*) & (.*) only\)$/.exec(c.suffix))) {
    eq([m[2]!, m[3]!].map(degreeToSemitones));
    return true;
  }
  if ((m = /^(.*) UST (b?[IV]+m?)$/.exec(c.suffix))) {
    const name = parseSuffix(m[1]!)!;
    expect([c.id, fits(name, pcs)]).toEqual([c.id, true]);
    eq([0, 4, 10, ...triadOn(m[2]!)]); // dominant shell + the upper triad, nothing else
    return true;
  }
  if ((m = /^(b?[IV]+m?)\/I$/.exec(c.suffix))) {
    eq([0, ...triadOn(m[1]!)]);
    return true;
  }
  if ((m = /^\((4|5)ths ×(\d)\)$/.exec(c.suffix))) {
    eq(Array.from({ length: Number(m[2]) }, (_, k) => k * (m![1] === "4" ? 5 : 7)));
    return true;
  }
  if ((m = /^\(cluster (.*)\)$/.exec(c.suffix))) {
    eq(m[1] === "b2" ? [0, 1, 2] : m[1]!.split("-").map(degreeToSemitones));
    return true;
  }
  const fixed: Record<string, number[]> = {
    "(no3 no5)": [0],
    "m11 (So What)": [0, 5, 10, 15, 19], // three 4ths and a major 3rd
    "(mystic)": [0, 6, 10, 16, 21, 26], // C F# Bb E A D
    "(Petrushka)": [0, 4, 7, 6, 10, 13], // C major + F# major
    "(4th + aug4th)": [0, 5, 11],
    "(0-1-6)": [0, 1, 6],
  };
  if (fixed[c.suffix]) {
    eq(fixed[c.suffix]!);
    if (c.suffix === "m11 (So What)") {
      const m11 = parseSuffix("m11")!; // every note belongs to m11 (the voicing leaves the 9 out)
      for (const p of pcs) expect(m11.req.has(p) || m11.opt.has(p)).toBe(true);
    }
    return true;
  }
  return false;
}

describe("chords: every formula matches its name", () => {
  test("each chord's degrees spell its suffix (or its described structure)", () => {
    const unchecked: string[] = [];
    for (const c of CHORDS) {
      const spec = parseSuffix(c.suffix);
      if (spec) expect([c.id, c.suffix, fits(spec, pcSet(c.degrees))]).toEqual([c.id, c.suffix, true]);
      else if (!structural(c)) unchecked.push(c.id);
    }
    expect(unchecked).toEqual([]);
  });

  test("the suffix checker itself rejects wrong formulas", () => {
    const ok = (sfx: string, f: string) => fits(parseSuffix(sfx)!, pcSet(f.split(" ")));
    expect(ok("m7b5", "1 b3 5 b7")).toBe(false);
    expect(ok("13", "1 3 5 b7 9 11 13")).toBe(false);
    expect(ok("add9", "1 3 5 b7 9")).toBe(false);
    expect(ok("7#9", "1 3 5 7 #9")).toBe(false);
    expect(ok("dim7", "1 b3 b5 b7")).toBe(false);
    expect(ok("6/9", "1 3 5 6")).toBe(false);
    expect(ok("7(b9,#9)", "1 3 5 b7 b9")).toBe(false);
    expect(ok("maj7#5", "1 3 #5 7")).toBe(true);
    expect(ok("11", "1 5 b7 9 11")).toBe(true);
  });

  test("the textbook ones, exactly", () => {
    const f = (id: string) => chord(id).degrees.join(" ");
    expect(f("m7b5")).toBe("1 b3 b5 b7");
    expect(f("7s9")).toBe("1 3 5 b7 #9");
    expect(f("13")).toBe("1 3 5 b7 9 13"); // 11 left out to protect the 3rd
    expect(chord("13").theory).toMatch(/11 is left out/);
    expect(f("add9")).toBe("1 3 5 9"); // no 7th
    expect(f("69")).toBe("1 3 5 6 9");
    expect(f("sus2")).toBe("1 2 5");
    expect(f("sus4")).toBe("1 4 5");
    expect(f("dim7")).toBe("1 b3 b5 bb7");
    expect(f("aug")).toBe("1 3 #5");
    expect(f("ust-bVI")).toBe("1 3 b7 #9 b13"); // Ab/C7 = C7(#9,b13)
    expect(chord("ust-bVI").suffix).toMatch(/^7\(#9,b13\)/);
    expect(f("quartal3")).toBe("1 4 b7");
    expect(f("quintal3")).toBe("1 5 9");
  });

  test("ids and suffixes are unique", () => {
    expect(new Set(CHORDS.map((c) => c.id)).size).toBe(CHORDS.length);
    expect(new Set(CHORDS.map((c) => c.suffix)).size).toBe(CHORDS.length);
  });

  test("families: triads have ≤3 notes, sevenths a 7th, extensions a 9/11/13, rootless/guide shells no root or ≤3 notes", () => {
    const has = (c: ChordDef, n: number[]) => c.degrees.some((d) => n.includes(parseDegree(d).number));
    for (const c of CHORDS) {
      if (c.family === "Triads") expect([c.id, c.degrees.length <= 3]).toEqual([c.id, true]);
      if (c.family === "Sevenths") expect([c.id, has(c, [7])]).toEqual([c.id, true]);
      if (c.family === "Extensions") expect([c.id, has(c, [9, 11, 13])]).toEqual([c.id, true]);
      if (c.family === "Shell & rootless") expect([c.id, !c.degrees.includes("1") || c.degrees.length <= 3]).toEqual([c.id, true]);
      if (c.family === "Altered dominants") {
        expect([c.id, c.degrees.includes("b7") && (c.degrees.includes("3") || c.degrees.includes("4"))]).toEqual([c.id, true]);
        expect([c.id, c.degrees.some((d) => ["b5", "#5", "b9", "#9", "#11", "b13"].includes(d))]).toEqual([c.id, true]);
      }
    }
  });

  test("recommended scales exist and hold every chord tone (bar the standard 'outside' choices)", () => {
    // Standard choices that leave a chord tone out on purpose: the altered scale has no natural 5,
    // and the minor blues scale over a dominant 7 / 7#9 rubs its b3 against the chord's 3rd.
    const allowed: Record<string, string[]> = { altered: ["5"], blues: ["3"] };
    for (const c of CHORDS)
      for (const id of c.scales ?? []) {
        const s = SCALES.find((x) => x.id === id);
        expect([c.id, id, !!s]).toEqual([c.id, id, true]);
        const sp = pcSet(s!.degrees);
        const missing = c.degrees.filter((d) => !sp.has(pc12(degreeToSemitones(d))) && !(allowed[id] ?? []).includes(d));
        expect([c.id, id, missing]).toEqual([c.id, id, []]);
      }
  });
});

describe("arpeggio variants", () => {
  const v = (id: string) => ARPEGGIO_VARIANTS.find((a) => a.id === id)!.transform;
  test("never name one pitch twice, on any chord", () => {
    for (const a of ARPEGGIO_VARIANTS)
      for (const c of CHORDS) {
        const out = a.transform(c.degrees);
        expect([a.id, c.id, new Set(out.map((d) => pc12(degreeToSemitones(d)))).size]).toEqual([a.id, c.id, out.length]);
      }
  });
  test("each does what its name says", () => {
    expect(v("triad")(chord("maj9").degrees)).toEqual(["1", "3", "5"]);
    expect(v("shell")(chord("m7").degrees)).toEqual(["1", "b3", "b7"]);
    expect(v("shell")(chord("dim7").degrees)).toEqual(["1", "b3", "bb7"]);
    expect(v("rootless")(chord("9").degrees)).toEqual(["3", "5", "b7", "9"]);
    expect(v("upper")(chord("maj7").degrees)[0]).toBe("3");
    expect(v("add9")(chord("maj7").degrees)).toEqual(["1", "3", "5", "7", "9"]);
    expect(v("add9")(chord("7b9").degrees)).toEqual(chord("7b9").degrees); // no b9 + 9
    expect(v("sixths")(chord("7").degrees)).toEqual(["1", "3", "5", "b7", "13"]);
    expect(v("sixths")(chord("7b13").degrees)).toEqual(chord("7b13").degrees); // no b13 + 13
    expect(v("to11")(chord("7").degrees)).toEqual(["1", "3", "5", "b7", "9", "#11"]); // #11 over a major 3rd
    expect(v("to11")(chord("m7").degrees)).toEqual(["1", "b3", "5", "b7", "9", "11"]);
    expect(v("to13")(chord("7").degrees)).toEqual(["1", "3", "5", "b7", "9", "13"]);
    expect(v("guide")(chord("13").degrees)).toEqual(["3", "b7"]);
    expect(v("altered")(chord("7").degrees)).toEqual(["1", "3", "b7", "b9", "#9", "b13"]);
    expect(v("half-dim")(chord("m13").degrees)).toEqual(["1", "b3", "b5", "b7", "9", "11", "13"]);
    expect(v("full-dim")(chord("7").degrees)).toEqual(["1", "b3", "b5", "bb7"]);
    expect(v("s9")(chord("min").degrees)).toEqual(["1", "b3", "5"]); // #9 is the b3 already there
  });
});

/* ================================================================== spelling */

describe("spelling", () => {
  const spell = (root: string, id: string) => scale(id).degrees.map((d) => spellDegree(rootByName(root), d)).join(" ");
  test("key spellings with E#, B#, Cb, Fb", () => {
    expect(spell("F#", "ionian")).toBe("F# G# A# B C# D# E#");
    expect(spell("C#", "ionian")).toBe("C# D# E# F# G# A# B#");
    expect(spell("Gb", "ionian")).toBe("Gb Ab Bb Cb Db Eb F");
    expect(spell("Db", "aeolian")).toBe("Db Eb Fb Gb Ab Bbb Cb");
    expect(spell("D#", "aeolian")).toBe("D# E# F# G# A# B C#");
  });
  test("chord tones: bb7, #9, b9, #11, b13", () => {
    const c = rootByName("C");
    expect(chord("dim7").degrees.map((d) => spellDegree(c, d)).join(" ")).toBe("C Eb Gb Bbb");
    expect(["#9", "b9", "#11", "b13", "13", "#5", "b5"].map((d) => spellDegree(c, d)).join(" ")).toBe("D# Db F# Ab A G# Gb");
    expect(chord("dim7").degrees.map((d) => spellDegree(rootByName("F#"), d)).join(" ")).toBe("F# A C Eb");
  });
  test("every major and minor key has the conventional key signature", () => {
    const accidentals = (root: string, id: string) => scale(id).degrees.map((d) => spellDegree(rootByName(root), d)).filter((n) => n.length > 1);
    const sig: [string, string, string][] = [
      ["C", "A", ""], ["G", "E", "F#"], ["D", "B", "F# C#"], ["A", "F#", "F# C# G#"], ["E", "C#", "F# C# G# D#"], ["B", "G#", "F# C# G# D# A#"],
      ["F#", "D#", "F# C# G# D# A# E#"], ["Db", "Bb", "Bb Eb Ab Db Gb"], ["Ab", "F", "Bb Eb Ab Db"], ["Eb", "C", "Bb Eb Ab"], ["Bb", "G", "Bb Eb"], ["F", "D", "Bb"],
    ];
    for (const [maj, min, acc] of sig) {
      const want = acc.split(" ").filter(Boolean).sort();
      expect([maj, accidentals(maj, "ionian").sort()]).toEqual([maj, want]);
      expect([min, accidentals(min, "aeolian").sort()]).toEqual([min, want]);
    }
  });
  test("pretty: accidentals become glyphs, the letter b in words does not", () => {
    expect(pretty("Bbb")).toBe("B𝄫");
    expect(pretty("bb7 b9 #11")).toBe("𝄫7 ♭9 ♯11");
    expect(pretty("Ab/C Eb7 Bb")).toBe("A♭/C E♭7 B♭");
    expect(pretty("bII7 tritone sub when ii becomes a dominant")).toBe("bII7 tritone sub when ii becomes a dominant");
  });
  test("parent major of a mode is spelled by letter (C Phrygian → Ab, not G#)", () => {
    const p = (r: string, i: number) => parentMajorOf(rootByName(r), i);
    expect(p("C", 2)).toBe("Ab");
    expect(p("C", 6)).toBe("Db");
    expect(p("E", 2)).toBe("C");
    expect(p("F", 3)).toBe("C");
    expect(p("F#", 6)).toBe("G");
    expect(p("B", 3)).toBe("F#");
    expect(p("D", 1)).toBe("C");
    expect(p("Db", 2)).toBe("A"); // Bbb major isn't a selectable key: its enharmonic
    for (const r of ROOTS) for (let i = 0; i < 7; i++) expect(rootByName(p(r.name, i)).pc).toBe(pc12(r.pc - [0, 2, 4, 5, 7, 9, 11][i]!));
    const phr = majorModeViews(rootByName(p("C", 2)))[2]!;
    expect(`${phr.root} ${phr.modeName}: ${phr.notes.join(" ")}`).toBe("C Phrygian: C Db Eb F G Ab Bb");
  });
  test("chords are named on the root that spells them best", () => {
    expect(bestRootFor(3, chord("maj").degrees).name).toBe("Eb");
    expect(bestRootFor(10, chord("maj").degrees).name).toBe("Bb");
    expect(bestRootFor(1, chord("min").degrees).name).toBe("C#");
    expect(bestRootFor(8, chord("min").degrees).name).toBe("G#");
    expect(bestRootFor(8, chord("maj").degrees).name).toBe("Ab");
    expect(identify(rootByName("Gb"), [0, 4, 7, 9], "chord").alternates).toContain("Ebm7 (same notes)");
    expect(readings([1, 4, 8]).map((r) => r.name)).toContain("C#m");
    const std = TUNINGS.find((t) => t.id === "standard")!;
    const cm = analyzeShape([null, 3, 5, 5, 4, 3], std)!;
    expect([cm.primary.det.known?.name, cm.notes.join(" ")]).toEqual(["Cm", "C G C Eb G"]);
    const eb = analyzeShape([null, 6, 8, 8, 8, 6], std)!;
    expect([eb.primary.det.known?.name, eb.notes.join(" ")]).toEqual(["Eb", "Eb Bb Eb G Bb"]);
  });
});

/* ================================================================== circle of fifths */

describe("circle of fifths data", () => {
  const src = readFileSync(new URL("../src/components/CircleOfFifths.tsx", import.meta.url), "utf8");
  const arr = (name: string) => JSON.parse(new RegExp(`const ${name} = (\\[[^\\]]*\\])`).exec(src)![1]!) as string[];
  const MAJOR_KEYS = arr("MAJOR_KEYS"), MINOR_KEYS = arr("MINOR_KEYS"), ACC = arr("ACCIDENTALS");
  test("keys go round in 5ths, each minor is the relative minor, signatures count right", () => {
    for (let i = 0; i < 12; i++) {
      expect(rootByName(MAJOR_KEYS[i]!).pc).toBe(pc12(7 * i));
      expect(rootByName(MINOR_KEYS[i]!).pc).toBe(pc12(7 * i + 9));
      const notes = scale("ionian").degrees.map((d) => spellDegree(rootByName(MAJOR_KEYS[i]!), d));
      const sharps = notes.filter((n) => n.includes("#")).length, flats = notes.filter((n) => n.includes("b")).length;
      expect([MAJOR_KEYS[i], ACC[i]]).toEqual([MAJOR_KEYS[i], sharps ? `${sharps}♯` : flats ? `${flats}♭` : "0"]);
      const minorNotes = scale("aeolian").degrees.map((d) => spellDegree(rootByName(MINOR_KEYS[i]!), d)).sort();
      expect(minorNotes).toEqual([...notes].sort()); // same notes as the relative major
    }
  });
});

/* ================================================================== nashville */

describe("Nashville numbers", () => {
  const ivs = (n: string, f: (typeof FLAVORS)[number]["id"]) => buildChord(n, f)!;
  test("diatonic 7ths: 1maj7 2-7 3-7 4maj7 57 6-7 7ø", () => {
    expect(["1", "2-", "3-", "4", "5", "6-", "7°"].map((n) => ivs(n, "seventh").suffix)).toEqual(["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"]);
    expect(["1", "2-", "3-", "4", "5", "6-", "7°"].map((n) => ivs(n, "triad").rootSemis)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
  test("borrowed b3 b6 b7 are major chords from the parallel minor", () => {
    for (const [n, semis] of [["b3", 3], ["b6", 8], ["b7", 10]] as const) {
      const c = ivs(n, "triad");
      expect([n, c.rootSemis, c.suffix]).toEqual([n, semis, ""]);
      for (const i of c.intervals) expect([0, 2, 3, 5, 7, 8, 10]).toContain(pc12(c.rootSemis + i));
    }
  });
  test("secondary dominants: 2 = V/V (D7 in C), 3 = V/vi (E7 in C)", () => {
    expect([ivs("2", "seventh").rootSemis, ivs("2", "seventh").suffix]).toEqual([pc12(7 + 7), "7"]);
    expect([ivs("3", "seventh").rootSemis, ivs("3", "seventh").suffix]).toEqual([pc12(9 + 7), "7"]);
    expect(chordName("C", ivs("2", "seventh"))).toBe("D7");
    expect(chordName("C", ivs("3", "seventh"))).toBe("E7");
  });
  test("slash chords put the right chord tone in the bass", () => {
    expect(["1/3", "5/7", "1/5", "4/5"].map((n) => chordName("C", ivs(n, "triad")))).toEqual(["C/E", "G/B", "C/G", "F/G"]);
    for (const n of ["1/3", "5/7", "1/5"]) {
      const c = ivs(n, "triad");
      expect(c.intervals.map((i) => pc12(c.rootSemis + i))).toContain(c.bassSemis);
    }
  });
  test("chord names in every key agree with the major-scale spelling", () => {
    for (const key of KEYS) {
      for (let d = 0; d < 7; d++) expect(noteIn(key, d)).toBe(spellDegree(rootByName(key), scale("ionian").degrees[d]!));
      expect(noteIn(key, 6, -1)).toBe(spellDegree(rootByName(key), "b7"));
      expect(noteIn(key, 2, -1)).toBe(spellDegree(rootByName(key), "b3"));
      for (const id of Object.keys(NUMBERS))
        for (const f of FLAVORS) {
          const c = buildChord(id, f.id);
          if (!c) continue;
          const name = chordName(key, c);
          expect(pcOfName(name)).toBe(pc12(keyPc(key) + c.rootSemis));
          if (!name.includes("/")) {
            const spec = parseSuffix(c.suffix)!;
            expect([key, id, f.id, fits(spec, new Set(c.intervals.map(pc12)))]).toEqual([key, id, f.id, true]);
          }
        }
    }
  });
});

/* ================================================================== games */

describe("games: chord shapes and ear answers", () => {
  const std = [40, 45, 50, 55, 59, 64];
  test("every game chord's tab spells its target, and its label names that chord", () => {
    for (const [key, g] of Object.entries(GAME_CHORDS)) {
      const rootPc = rootByName(g.target.rootName).pc;
      const target = pcSet(g.target.degrees);
      const played = new Set([...g.tab].flatMap((ch, s) => (ch === "x" ? [] : [pc12(std[s]! + Number(ch) - rootPc)])));
      const optional = g.target.degrees.length >= 4 ? new Set([7]) : new Set<number>();
      expect([key, sorted(played).filter((p) => !target.has(p))]).toEqual([key, []]);
      expect([key, sorted(target).filter((p) => !played.has(p) && !optional.has(p))]).toEqual([key, []]);
      expect(g.label.startsWith(g.target.rootName)).toBe(true);
      const spec = parseSuffix(g.label.slice(g.target.rootName.length))!;
      expect([key, fits(spec, target)]).toEqual([key, true]);
    }
  });
  test("ear-trainer chord answers voice the chord they are named", () => {
    const sfx: Record<string, string> = { maj: "", min: "m", dom7: "7", maj7: "maj7", min7: "m7", sus2: "sus2", sus4: "sus4", dim: "dim", aug: "aug", m7b5: "m7b5", dim7: "dim7", six: "6", dom9: "9", maj9: "maj9", min9: "m9", dom13: "13", s9: "7#9" };
    for (const [id, s] of Object.entries(sfx)) {
      const a = EAR_ANSWERS[id]!;
      expect(a.steps[0]).toBe(0);
      for (let i = 1; i < a.steps.length; i++) expect(a.steps[i]! > a.steps[i - 1]!).toBe(true);
      expect([id, fits(parseSuffix(s)!, new Set(a.steps.map(pc12)))]).toEqual([id, true]);
    }
  });
  test("intervals: right size, right name, the usual song for the ascending interval", () => {
    const want: Record<string, [number, string, string]> = {
      m2: [1, "Minor 2nd", "Jaws"], M2: [2, "Major 2nd", "Happy Birthday"], m3: [3, "Minor 3rd", "Smoke on the Water"], M3: [4, "Major 3rd", "When the Saints"],
      P4: [5, "4th", "Here Comes the Bride"], TT: [6, "Tritone", "The Simpsons"], P5: [7, "5th", "Star Wars"], m6: [8, "Minor 6th", "The Entertainer"],
      M6: [9, "Major 6th", "My Bonnie"], m7: [10, "Minor 7th", "Star Trek theme"], M7: [11, "Major 7th", "Take On Me"], P8: [12, "Octave", "Somewhere Over the Rainbow"],
    };
    for (const [id, [semis, label, hint]] of Object.entries(want)) expect([EAR_ANSWERS[id]!.steps, EAR_ANSWERS[id]!.label, EAR_ANSWERS[id]!.hint]).toEqual([[0, semis], label, hint]);
  });
});

/* ================================================================== levels */

describe("difficulty tiers", () => {
  test("the fundamentals are Beginner; nothing basic is left in Expert", () => {
    for (const id of ["maj", "min", "5", "7", "m7", "maj7", "sus2", "sus4", "add9"]) expect([id, chordTier(id)]).toEqual([id, "beginner"]);
    for (const id of ["dim", "aug", "6", "m6", "m7b5", "dim7", "9", "m9", "maj9"]) expect([id, chordTier(id)]).toEqual([id, "intermediate"]);
    for (const id of ["major-pentatonic", "minor-pentatonic", "blues", "ionian", "aeolian"]) expect([id, scaleTier(id)]).toEqual([id, "beginner"]);
    for (const id of ["dorian", "mixolydian", "lydian", "phrygian", "locrian", "harmonic-minor", "melodic-minor"]) expect([id, scaleTier(id)]).toEqual([id, "intermediate"]);
    for (const c of CHORDS.filter((x) => x.family === "Triads")) expect([c.id, chordTier(c.id) !== "expert"]).toEqual([c.id, true]);
    expect(arpeggioTier("full")).toBe("beginner");
  });
  test("every id the tier lists name exists", () => {
    const src = readFileSync(new URL("../src/lib/levels.ts", import.meta.url), "utf8");
    const ids = (b: string) => [...b.matchAll(/set\(`?"?([^`"]*)`?"?\)/g)].flatMap((m) => m[1]!.trim().split(/\s+/));
    const get = (name: string) => ids(new RegExp(`const ${name}[^{]*\\{([\\s\\S]*?)\\n\\};`).exec(src)![1]!);
    for (const id of get("CHORD_TIERS")) expect([id, CHORDS.some((c) => c.id === id)]).toEqual([id, true]);
    for (const id of get("SCALE_TIERS")) expect([id, SCALES.some((s) => s.id === id)]).toEqual([id, true]);
    for (const id of get("ARP_TIERS")) expect([id, ARPEGGIO_VARIANTS.some((a) => a.id === id)]).toEqual([id, true]);
  });
});

/* ================================================================== guided recording plan */

describe("recording plan: tabs, targets and the words used", () => {
  const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
  test("every target's label is its chord", () => {
    for (const s of PLAN) {
      const t = s.target;
      expect(t.label.startsWith(t.rootName)).toBe(true);
      expect([s.id, fits(parseSuffix(t.label.slice(t.rootName.length))!, pcSet(t.degrees))]).toEqual([s.id, true]);
    }
  });
  test("every played note is in the target unless the step marks it wrong; chord steps sound the whole chord", () => {
    for (const s of PLAN) {
      const rootPc = rootByName(s.target.rootName).pc;
      const target = pcSet(s.target.degrees);
      const midis = tabMidis(s.tab);
      midis.forEach((m, str) => {
        if (m === null) return;
        const inChord = target.has(pc12(m - rootPc));
        expect([s.id, str, inChord]).toEqual([s.id, str, !(s.wrong ?? []).includes(str)]);
      });
      if (["clean", "palm-mute", "chop", "buzz"].includes(s.label) || (s.label === "other" && midis.some((m) => m !== null) && !s.wrong))
        expect([s.id, sorted(new Set(midis.filter((m): m is number => m !== null).map((m) => pc12(m - rootPc))))]).toEqual([s.id, sorted(target)]);
    }
  });
  test("the note named for a wrong or muted string is the note that string plays", () => {
    for (const s of PLAN) {
      const midis = tabMidis(s.tab);
      for (const str of s.wrong ?? []) {
        const n = NAMES[midis[str]! % 12]!;
        expect([s.id, s.how.includes(n) || s.how.includes(n.replace("♯", "#"))]).toEqual([s.id, true]);
      }
      const its = /its ([A-G]♯?)/.exec(s.how);
      if (its && s.muted?.length) expect([s.id, its[1]]).toEqual([s.id, NAMES[midis[s.muted[0]!]! % 12]!]);
    }
  });
});

/* ================================================================== Grimoire page */

/** The pure parts of the Grimoire page's script (data and theory helpers), run outside the browser. */
function loadGrimoire() {
  const html = readFileSync(new URL("../public/rooms/grimoire.html", import.meta.url), "utf8");
  const js = /<script>([\s\S]*?)<\/script>/.exec(html)![1]!;
  const data = js.slice(js.indexOf("/* ---------- data ---------- */"), js.indexOf("/* ---------- state ---------- */"));
  const block = (start: number, open: string, close: string) => {
    let depth = 0;
    for (let i = js.indexOf(open, start); i < js.length; i++) {
      if (js[i] === open) depth++;
      else if (js[i] === close && --depth === 0) return js.slice(start, i + 1);
    }
    throw new Error("unbalanced");
  };
  const fn = (name: string) => block(js.indexOf(`function ${name}(`), "{", "}");
  const chords = block(js.indexOf("const CHORDS"), "[", "]");
  const names = ["modeSet", "period", "intervalLabels", "labelsFor", "prefersFlats", "spell7", "spellLabels", "chordSuffix", "romanFor"];
  const code = `${data}\n${chords};\n${names.map(fn).join("\n")}\nreturn { SCALES, BY_ID, CHORDS, ${names.join(", ")} };`;
  return new Function("window", code)({}) as {
    SCALES: { id: string; name: string; set: number[]; modes?: string[]; iv?: string[] }[];
    BY_ID: Record<string, { id: string; name: string; set: number[]; modes?: string[] }>;
    modeSet: (set: number[], i: number) => number[];
    period: (set: number[]) => number;
    intervalLabels: (set: number[]) => string[];
    labelsFor: (P: unknown, i: number, set: number[]) => string[];
    spell7: (tonic: number, set: number[]) => string[];
    spellLabels: (tonic: number, set: number[], labels: string[]) => string[];
    chordSuffix: (iv: number[]) => string;
    romanFor: (j: number, iv: number[]) => string;
  };
}

describe("Grimoire page", () => {
  const G = loadGrimoire();
  const asDeg = (l: string) => l.replace(/♭/g, "b").replace(/♯/g, "#");
  const setOf = (formula: string) => sorted(pcSet(formula.split(" ")));

  test("every scale's notes match the Guitar Grimoire catalogue", () => {
    const want: Record<string, string> = {
      major: "1 2 3 4 5 6 7", melmin: "1 2 b3 4 5 6 7", harmin: "1 2 b3 4 5 b6 7", harmaj: "1 2 3 4 5 b6 7",
      hungmin: "1 2 b3 #4 5 b6 7", hungmaj: "1 #2 3 #4 5 6 b7", neapmin: "1 b2 b3 4 5 b6 7", neapmaj: "1 b2 b3 4 5 6 7",
      enigmin: "1 b2 b3 #4 5 b7 7", enig: "1 b2 3 #4 #5 #6 7", comp2: "1 b2 3 #4 5 b6 7", ionb5: "1 2 3 4 b5 6 7",
      locn7: "1 b2 b3 4 b5 b6 7", persian: "1 b2 3 4 b5 b6 7", minpent: "1 b3 4 5 b7", kumoi: "1 2 b3 5 6",
      hirojoshi: "1 2 b3 5 b6", whole: "1 2 3 #4 #5 b7", aug: "1 b3 3 5 #5 7", pelog: "1 b2 b3 b4 5 b6",
      domsus: "1 2 4 5 6 b7", dim: "1 2 b3 4 b5 b6 6 7", spanish8: "1 b2 #2 3 4 b5 b6 b7", beblocn2: "1 2 b3 4 b5 5 b6 b7",
      bebdom: "1 2 3 4 5 6 b7 7", bebdor: "1 2 b3 3 4 5 6 b7", bebmaj: "1 2 3 4 5 #5 6 7",
    };
    expect(G.SCALES.map((s) => s.id).sort()).toEqual(Object.keys(want).sort());
    for (const s of G.SCALES) expect([s.id, s.set]).toEqual([s.id, setOf(want[s.id]!)]);
  });

  test("named modes are the right rotations", () => {
    const theory: Record<string, string> = {
      Dorian: "dorian", Phrygian: "phrygian", Lydian: "lydian", Mixolydian: "mixolydian", Aeolian: "aeolian", Locrian: "locrian",
      "Dorian ♭2": "dorian-b2", "Lydian Augmented": "lydian-augmented", "Lydian Dominant": "lydian-dominant", "Mixolydian ♭6": "mixolydian-b6",
      "Locrian ♮2": "locrian-nat2", "Altered (Super Locrian)": "altered", "Locrian ♮6": "locrian-nat6", "Ionian ♯5": "ionian-s5",
      "Dorian ♯4": "dorian-s4", "Phrygian Dominant": "phrygian-dominant", "Lydian ♯2": "lydian-s2", Ultralocrian: "ultralocrian",
      "Dorian ♭5": "dorian-b5", "Phrygian ♭4": "phrygian-b4", "Lydian ♭3": "lydian-b3", "Mixolydian ♭2": "mixolydian-b2",
      "Lydian Augmented ♯2": "lydian-aug-s2", "Locrian ♭♭7": "locrian-bb7", Oriental: "oriental", "Double Harmonic Major": "double-harmonic",
      "Major Pentatonic": "major-pentatonic", "Suspended (Egyptian)": "egyptian", "Blues Minor (Man Gong)": "blues-minor-pent",
      "Half-Whole (Dominant Diminished)": "dim-half-whole",
    };
    const formula: Record<string, string> = { "Ionian ♯2 ♯5": "1 #2 3 4 #5 6 7", "Locrian ♭♭3 ♭♭7": "1 b2 bb3 4 b5 b6 bb7", "Lydian ♯2 ♯6": "1 #2 3 #4 5 #6 7", Ultraphrygian: "1 b2 b3 b4 5 b6 bb7", "Blues Major (Ritusen)": "1 2 4 5 6" };
    let n = 0;
    for (const s of G.SCALES)
      (s.modes ?? []).forEach((name, i) => {
        const got = G.modeSet(s.set, i);
        if (theory[name]) (expect([name, got]).toEqual([name, sorted(pcSet(scale(theory[name]!).degrees))]), n++);
        else if (formula[name]) (expect([name, got]).toEqual([name, setOf(formula[name]!)]), n++);
      });
    expect(n).toBe(Object.keys(theory).length + Object.keys(formula).length);
  });

  test("formula labels: standard spellings, and names always agree with labels", () => {
    const lab = (id: string) => G.labelsFor(G.BY_ID[id], 0, G.BY_ID[id]!.set).join(" ");
    expect(lab("pelog")).toBe("1 ♭2 ♭3 ♭4 5 ♭6");
    expect(lab("spanish8")).toBe("1 ♭2 ♯2 3 4 ♭5 ♭6 ♭7");
    expect(lab("whole")).toBe("1 2 3 ♯4 ♯5 ♭7");
    expect(lab("dim")).toBe("1 2 ♭3 4 ♭5 ♭6 6 7");
    expect(G.labelsFor(G.BY_ID.dim, 1, G.modeSet(G.BY_ID.dim!.set, 1)).join(" ")).toBe("1 ♭2 ♯2 3 ♯4 5 6 ♭7");
    expect(lab("hirojoshi")).toBe("1 2 ♭3 5 ♭6");
    expect(lab("domsus")).toBe("1 2 4 5 6 ♭7");
    for (const s of G.SCALES)
      for (let i = 0; i < s.set.length; i++) {
        const set = G.modeSet(s.set, i);
        const labels = G.labelsFor(s, i, set);
        for (const [k, l] of labels.entries()) expect([s.id, i, l, pc12(degreeToSemitones(asDeg(l)))]).toEqual([s.id, i, l, set[k]!]);
        for (let tonic = 0; tonic < 12; tonic++) {
          const names = set.length === 7 ? G.spell7(tonic, set) : G.spellLabels(tonic, set, labels);
          const letters = names.map((nm) => "CDEFGAB".indexOf(nm[0]!));
          names.forEach((nm, k) => {
            expect(pcOfName(nm)).toBe(pc12(tonic + set[k]!)); // sounds right
            const num = parseDegree(asDeg(labels[k]!)).number;
            expect([s.id, i, tonic, k, (((letters[k]! - letters[0]!) % 7) + 7) % 7]).toEqual([s.id, i, tonic, k, (num - 1) % 7]); // letter follows the label
          });
          if (set.length === 7) expect(new Set(letters).size).toBe(7);
        }
      }
  });

  test("diatonic chords on each degree", () => {
    const row = (id: string) => {
      const set = G.BY_ID[id]!.set;
      return set.map((r, j) => {
        const iv3 = [0, pc12(set[(j + 2) % 7]! - r), pc12(set[(j + 4) % 7]! - r)];
        const iv7 = [...iv3, pc12(set[(j + 6) % 7]! - r)];
        return `${G.romanFor(j, iv3)}:${G.chordSuffix(iv3) || "M"}/${G.chordSuffix(iv7)}`;
      }).join(" ");
    };
    expect(row("major")).toBe("I:M/maj7 ii:m/m7 iii:m/m7 IV:M/maj7 V:M/7 vi:m/m7 vii°:°/m7♭5");
    expect(row("harmin")).toBe("i:m/m(maj7) ii°:°/m7♭5 III+:+/+maj7 iv:m/m7 V:M/7 VI:M/maj7 vii°:°/dim7");
    expect(row("melmin")).toBe("i:m/m(maj7) ii:m/m7 III+:+/+maj7 IV:M/7 V:M/7 vi°:°/m7♭5 vii°:°/m7♭5");
    expect(row("harmaj")).toBe("I:M/maj7 ii°:°/m7♭5 iii:m/m7 iv:m/m(maj7) V:M/7 VI+:+/+maj7 vii°:°/dim7");
  });

  test("symmetry is detected for the symmetric scales only", () => {
    const p = Object.fromEntries(G.SCALES.map((s) => [s.id, G.period(s.set)]));
    expect([p.whole, p.aug, p.dim]).toEqual([1, 2, 2]);
    for (const s of G.SCALES) if (!["whole", "aug", "dim"].includes(s.id)) expect([s.id, p[s.id]]).toEqual([s.id, s.set.length]);
  });
});
