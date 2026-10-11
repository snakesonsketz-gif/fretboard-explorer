import { describe, expect, test } from "bun:test";
import { SR, strum, take } from "./helpers/guitar";
import { CHORDS, RUSH_LEVELS, fallSeconds, nextChord, plainName, raceStart, raceStep, rushPoints, strumResult } from "../src/lib/games";
import { analyseStrum, roomFloorOf } from "../src/lib/listen/score";
import { ListenSession, type AudioSource } from "../src/lib/listen/session";

const judge = (tab: string, chord: string, opts = {}) => {
  const { audio, onset } = strum(tab, { seconds: 2, noise: 0.002, startAt: 0.45, ...opts });
  return strumResult(analyseStrum({ audio, sr: SR, onset, end: audio.length, target: CHORDS[chord]!.target, roomFloor: roomFloorOf(audio, SR, 0) }));
};

describe("Games: rules", () => {
  test("every game chord's shape is that chord (all its notes, nothing else)", () => {
    for (const [name, c] of Object.entries(CHORDS)) expect([name, judge(c.tab, name).kind]).toEqual([name, "clean"]);
  });
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
