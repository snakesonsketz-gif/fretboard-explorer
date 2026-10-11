import { describe, expect, test } from "bun:test";
import { FLAVORS, KEYS, NUMBERS, PROGRESSIONS, TIER_SETUP, buildChord, chordMenu, chordName, choices, exactSetup, keyPc, nashProgression, nashQuestion, voice } from "../src/lib/nashville";

const pcsOf = (key: string, c: NonNullable<ReturnType<typeof buildChord>>) => c.intervals.map((i) => (keyPc(key) + c.rootSemis + i) % 12);

describe("Nashville numbers", () => {
  test("the diatonic triads have the major key's qualities", () => {
    const sfx = Object.fromEntries(["1", "2-", "3-", "4", "5", "6-", "7°"].map((n) => [n, buildChord(n, "triad")!.suffix]));
    expect(sfx).toEqual({ "1": "", "2-": "m", "3-": "m", "4": "", "5": "", "6-": "m", "7°": "dim" });
  });

  test("every flavour stays in its number's scale, in every key", () => {
    for (const key of KEYS)
      for (const [id, num] of Object.entries(NUMBERS))
        for (const f of FLAVORS) {
          const c = buildChord(id, f.id);
          if (!c) continue;
          const scale = num.scale.map((s) => (keyPc(key) + s) % 12);
          for (const pc of pcsOf(key, c)) expect([key, id, f.id, scale.includes(pc)]).toEqual([key, id, f.id, true]);
        }
  });

  test("names in a key", () => {
    expect(chordName("C", buildChord("2-", "ninth")!)).toBe("Dm9");
    expect(chordName("G", buildChord("1/3", "triad")!)).toBe("G/B");
    expect(chordName("C", buildChord("b7", "triad")!)).toBe("Bb");
    expect(chordName("E", buildChord("3", "seventh")!)).toBe("G#7");
    expect(chordName("Eb", buildChord("4", "triad")!)).toBe("Ab");
    expect(chordName("D", buildChord("5", "thirteenth")!)).toBe("A13");
    expect(chordName("F", buildChord("7°", "seventh")!)).toBe("Em7b5");
    expect(buildChord("2-", "seventh")!.symbol).toBe("2-7");
    expect(buildChord("5", "seventh")!.symbol).toBe("57");
  });

  test("flavours that would leave the key are never built", () => {
    expect(buildChord("3-", "ninth")).toBeNull(); // its 9th is flat
    expect(buildChord("6-", "thirteenth")).toBeNull(); // its 13th is flat
    expect(buildChord("4", "sus4")).toBeNull(); // the 4 of the 4 is a tritone
    expect(buildChord("1", "eleventh")).toBeNull(); // the 11 clashes with the major 3rd
    expect(buildChord("1/3", "seventh")).toBeNull(); // slash chords stay triads
  });

  test("voicing: the bass is lowest and every chord note is there", () => {
    for (const key of KEYS)
      for (const c of choices(TIER_SETUP.expert)) {
        const m = voice(key, c);
        expect(Math.min(...m)).toBe(m[0]!);
        expect(m[0]! % 12).toBe((keyPc(key) + c.bassSemis) % 12);
        expect(new Set(m.map((x) => x % 12))).toEqual(new Set([...pcsOf(key, c), (keyPc(key) + c.bassSemis) % 12]));
        expect(Math.max(...m)).toBeLessThan(84);
      }
  });

  test("questions use only the chosen numbers and flavours, never three alike in a row", () => {
    for (const tier of ["beginner", "intermediate", "advanced", "expert"] as const) {
      const setup = TIER_SETUP[tier];
      const recent: string[] = [];
      for (let k = 0; k < 300; k++) {
        const q = nashQuestion(setup, recent.slice(-2));
        const c = q.chords[0]!;
        expect(setup.numbers).toContain(c.number);
        expect([...setup.flavors, "triad"]).toContain(c.flavor);
        recent.push(c.number);
        if (recent.length >= 3) expect(new Set(recent.slice(-3)).size).toBeGreaterThan(1);
      }
    }
  });

  test("progressions: four chords from the chosen numbers", () => {
    for (const p of PROGRESSIONS) for (const n of p) expect(NUMBERS[n]).toBeDefined();
    for (const tier of ["beginner", "intermediate", "advanced", "expert"] as const)
      for (let k = 0; k < 100; k++) {
        const q = nashProgression(TIER_SETUP[tier]);
        expect(q.chords).toHaveLength(4);
        for (const c of q.chords) expect(TIER_SETUP[tier].numbers).toContain(c.number);
      }
  });

  test("my chords: only the exact chords picked, in the key picked", () => {
    const setup = exactSetup([{ number: "1", flavor: "add9" }, { number: "6-", flavor: "seventh" }, { number: "4", flavor: "triad" }, { number: "3-", flavor: "thirteenth" }]);
    expect(setup.numbers).toEqual(["1", "6-", "4"]); // a 13th on the 3- doesn't fit the key, so it's dropped
    const names = new Set<string>();
    for (let k = 0; k < 200; k++) for (const c of nashQuestion(setup, []).chords) names.add(chordName("G", c));
    expect([...names].sort()).toEqual(["C", "Em7", "Gadd9"]);
    for (let k = 0; k < 50; k++) for (const c of nashProgression(setup).chords) expect(["1", "6-", "4"]).toContain(c.number);
    const menu = chordMenu();
    expect(menu.find((m) => m.number === "5")!.chords.map((c) => chordName("C", c))).toContain("G13");
  });
});
