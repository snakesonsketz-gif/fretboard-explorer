import { describe, expect, test } from "bun:test";
import { SR, strum, take } from "./helpers/guitar";
import { CHANGE_PAIRS, CHORDS, EAR_ANSWERS, RUSH_LEVELS, earLevel, earPoints, earQuestion, fallSeconds, savedEarAnswers, savedGameChords, shapeTab, nextChord, plainName, raceStart, raceStep, rushPoints, strumResult } from "../src/lib/games";
import { analyseStrum, roomFloorOf } from "../src/lib/listen/score";
import { ListenSession, type AudioSource } from "../src/lib/listen/session";

const judge = (tab: string, chord: string, opts = {}) => {
  const { audio, onset } = strum(tab, { seconds: 2, noise: 0.002, startAt: 0.45, ...opts });
  return strumResult(analyseStrum({ audio, sr: SR, onset, end: audio.length, target: CHORDS[chord]!.target, roomFloor: roomFloorOf(audio, SR, 0) }));
};

describe("Games: rules", () => {
  test("every game chord's shape is that chord (all its notes, nothing else)", () => {
    for (const [name, c] of Object.entries(CHORDS)) expect([name, judge(c.tab, name).kind]).toEqual([name, "clean"]);
  }, 30_000); // ~45 synthetic strums: slow on a busy machine
  test("a clean strum clears, a wrong note or the wrong chord doesn't (and says why)", () => {
    expect(judge("320003", "G").kind).toBe("clean");
    const wrong = judge("320013", "G"); // C on the B string
    expect(wrong.kind).toBe("wrong");
    expect(wrong.kind === "wrong" && wrong.why).toContain("extra C");
    expect(judge("x32010", "G").kind).toBe("wrong"); // played C when G was asked
  });
  test("wrong notes are named the everyday way", () => {
    expect(["B#", "C", "Gb", "F♯", "Ebb", "Bb", "Cb"].map(plainName)).toEqual(["C", "C", "F#", "F#", "D", "Bb", "B"]);
  });
  test("chords fall faster as you clear them, never faster than the level's limit", () => {
    const l = RUSH_LEVELS[0];
    expect(fallSeconds(l, 0)).toBe(l.fallStart);
    expect(fallSeconds(l, 5)).toBeLessThan(fallSeconds(l, 4));
    expect(fallSeconds(l, 100)).toBe(l.fallMin);
  });
  test("points: faster and longer streaks score more", () => {
    expect(rushPoints(1, 0)).toBe(200);
    expect(rushPoints(0, 0)).toBe(100);
    expect(rushPoints(0.5, 3)).toBeGreaterThan(rushPoints(0.5, 0));
    expect(rushPoints(1, 50)).toBe(400); // combo capped at ×2
  });
  test("the next chord is never the same one again", () => {
    let prev: string | null = null;
    for (let i = 0; i < 200; i++) {
      const n = nextChord(RUSH_LEVELS[0].chords, prev);
      expect(n).not.toBe(prev);
      prev = n;
    }
  });
  test("change race: the first clean chord starts it; each clean change after counts; misses don't move it", () => {
    let s = raceStart();
    s = raceStep(s, { kind: "clean" }); // G — started
    expect([s.changes, s.due]).toEqual([0, 1]);
    s = raceStep(s, { kind: "wrong", why: "missing E" });
    expect([s.changes, s.due, s.misses]).toEqual([0, 1, 1]);
    s = raceStep(s, { kind: "clean" }); // C
    s = raceStep(s, { kind: "quiet" });
    s = raceStep(s, { kind: "clean" }); // G
    expect([s.changes, s.due]).toEqual([2, 1]);
  });
});

describe("Games: Change Race heard live", () => {
  test("G↔C changes a little over a second apart are all counted, in order", () => {
    const times = Array.from({ length: 10 }, (_, i) => 0.6 + i * 1.1);
    const { audio } = take(times.map((at, i) => ({ tab: i % 2 ? "x32010" : "320003", at, opts: { spread: 0.01 } })), 12.5, 0.002);
    let end = 0;
    const src: AudioSource = { sampleRate: SR, get endFrame() { return end; }, read: (a, b) => (a < 0 || b > end || b <= a ? null : audio.slice(a, b)) };
    const pair = ["G", "C"] as const;
    let race = raceStart();
    const s = new ListenSession(src, () => ({ target: CHORDS[pair[race.due]]!.target }));
    const seen = new Set<number>();
    for (end = 2048; end <= audio.length; end += 2048) {
      if ((end / 2048) % 2) continue;
      s.tick();
      for (const st of s.strums) if (st.report && !seen.has(st.id)) { seen.add(st.id); race = raceStep(race, strumResult(st.report)); }
    }
    expect(race.misses).toBe(0);
    expect(race.changes).toBe(9);
  });
});

describe("ear trainer", () => {
  const seq = (vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length]!;
  };
  const TIERS = ["beginner", "intermediate", "advanced", "expert"] as const;

  test("chord questions play the right quality on a guitar-sized root", () => {
    for (const t of TIERS) {
      const lvl = earLevel("chord", t);
      for (let k = 0; k < 100; k++) {
        const q = earQuestion(lvl, []);
        expect(lvl.answers).toContain(q.answer);
        const root = q.midis[0]!;
        expect(root).toBeGreaterThanOrEqual(45);
        expect(root).toBeLessThan(57);
        expect(q.midis.map((m) => m - root)).toEqual(EAR_ANSWERS[q.answer]!.steps);
      }
    }
    // Major vs minor differ only in the third.
    expect(EAR_ANSWERS.maj!.steps.filter((s, i) => s !== EAR_ANSWERS.min!.steps[i])).toEqual([16]);
  });

  test("interval questions: the right size, down only at Expert", () => {
    for (const t of TIERS) {
      const lvl = earLevel("interval", t);
      let downs = 0;
      for (let k = 0; k < 300; k++) {
        const q = earQuestion(lvl, []);
        expect(q.midis).toHaveLength(2);
        expect(Math.abs(q.midis[1]! - q.midis[0]!)).toBe(EAR_ANSWERS[q.answer]!.steps[1]!);
        expect(q.down).toBe(q.midis[1]! < q.midis[0]!);
        if (q.down) downs++;
      }
      if (t === "expert") expect(downs).toBeGreaterThan(80);
      else expect(downs).toBe(0);
    }
  });

  test("never three of the same answer in a row", () => {
    const lvl = earLevel("chord", "beginner");
    expect(earQuestion(lvl, ["maj", "maj"], seq([0])).answer).toBe("min");
    const recent: string[] = [];
    for (let k = 0; k < 500; k++) {
      recent.push(earQuestion(lvl, recent.slice(-2)).answer);
      if (recent.length >= 3) expect(new Set(recent.slice(-3)).size).toBeGreaterThan(1);
    }
  });

  test("points grow with the streak up to double; every level's answers exist", () => {
    expect(earPoints(0)).toBe(100);
    expect(earPoints(3)).toBe(130);
    expect(earPoints(25)).toBe(200);
    for (const k of ["chord", "interval"] as const) for (const t of TIERS) for (const a of earLevel(k, t).answers) expect(EAR_ANSWERS[a]).toBeDefined();
  });
});

describe("saved chords in games", () => {
  const fav = (id: string, rootName: string, degrees: string[], shape?: (number | null)[]) => ({ id, label: `${rootName}?`, mode: "chord" as const, rootName, degrees, createdAt: 0, ...(shape ? { shape, tuningId: "standard" } : {}) });
  const favs = [
    fav("a", "C", ["1", "3", "5"], [null, 3, 2, 0, 1, 0]),
    fav("b", "D", ["1", "b3", "5", "b7", "9"], [null, 5, 3, 5, 5, null]),
    fav("c", "A", ["1", "3", "5", "b7", "9", "13"], [5, null, 5, 6, 7, 12]),
    { ...fav("d", "G", ["1", "3", "5"]), mode: "scale" as const },
  ];

  test("only chords at the chosen tier, with a shape when there's one to show", () => {
    expect(Object.values(savedGameChords(favs, "beginner")).map((c) => [c.label, c.tab])).toEqual([["C", "x32010"]]);
    expect(Object.values(savedGameChords(favs, "intermediate")).map((c) => c.label)).toEqual(["Dm9"]);
    expect(Object.values(savedGameChords(favs, "advanced")).map((c) => [c.label, c.tab])).toEqual([["A13", ""]]);
    expect(shapeTab([0, 2, 2, 1, 0, 0], "drop-d")).toBe("");
  });

  test("ear trainer: saved chord types add new answers, never a duplicate of a built-in one", () => {
    const beg = savedEarAnswers(favs, "beginner", earLevel("chord", "beginner").answers);
    expect(Object.keys(beg)).toEqual([]); // a C major triad is already "Major"
    const mid = savedEarAnswers(favs, "intermediate", earLevel("chord", "intermediate").answers);
    expect(Object.values(mid).map((a) => [a.label, a.steps])).toEqual([["m9", [0, 3, 7, 10, 14]]]);
  });

  test("every tier has chords and change pairs made of known chords", () => {
    for (const l of RUSH_LEVELS) for (const c of l.chords) expect(CHORDS[c]).toBeDefined();
    for (const pairs of Object.values(CHANGE_PAIRS)) for (const [a, b] of pairs) expect([CHORDS[a], CHORDS[b]].every(Boolean)).toBe(true);
  });
});
