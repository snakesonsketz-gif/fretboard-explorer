import { describe, expect, test } from "bun:test";
import { CAGED_CROSSWALK, DELIVERED, MODULES, NEXT_PLANNED, defaultProgress, foundationGap, lessonRequest, moduleProgress, nextUp, overallProgress, sanitizeProgress, topicKey } from "../src/lib/course";

describe("course outline", () => {
  test("22 modules numbered 1-22, each with topics and a tool", () => {
    expect(MODULES.map((m) => m.id)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    for (const m of MODULES) {
      expect(m.topics.length).toBeGreaterThan(5);
      expect(m.tools.length).toBeGreaterThan(0);
    }
  });
  test("delivered lessons point at real topics, and Mixolydian is still open", () => {
    for (const l of DELIVERED) for (const t of l.topics) expect(MODULES[l.module - 1]!.topics[t]).toBeDefined();
    const m4 = MODULES[3]!;
    expect(m4.topics[NEXT_PLANNED.finishes[0]!]).toContain("Mixolydian");
    expect(defaultProgress().topics[topicKey(4, 3)]).toBeUndefined();
  });
  test("module 8 is a substantial CAGED study", () => {
    expect(MODULES[7]!.topics.filter((t) => /CAGED/.test(t)).length).toBeGreaterThanOrEqual(5);
    expect(CAGED_CROSSWALK.length).toBeGreaterThanOrEqual(6);
  });
});

describe("progress and the sequencing gap", () => {
  test("starts with the three Module 4 lessons done and Modules 1-3 untouched", () => {
    const p = defaultProgress();
    expect(Object.keys(p.lessons)).toEqual(["4.1", "4.2", "4.3"]);
    expect(moduleProgress(MODULES[0]!, p).done).toBe(0);
    expect(moduleProgress(MODULES[3]!, p).done).toBeGreaterThan(0);
    expect(foundationGap(p)).toEqual([1, 2, 3]);
    expect(nextUp(p)).toBeNull(); // nothing is assumed until a plan is chosen
  });
  test("foundation plan goes to Module 1; continue plan goes to Lesson 4; custom starts where asked", () => {
    const p = defaultProgress();
    expect(nextUp({ ...p, plan: "foundation" })!.module).toBe(1);
    expect(nextUp({ ...p, plan: "continue" })!.lessonId).toBe("4.4");
    expect(nextUp({ ...p, plan: "custom", customModule: 6 })!.module).toBe(6);
  });
  test("after Lesson 4 the continue plan moves on to the next open topic", () => {
    const p = { ...defaultProgress(), plan: "continue" as const };
    p.lessons["4.4"] = "2026-11-22";
    p.topics[topicKey(4, 3)] = true;
    const n = nextUp(p)!;
    expect(n.lessonId).toBeUndefined();
    expect(n.finishes.length).toBeGreaterThan(0);
  });
  test("overall percentage counts topics", () => {
    const o = overallProgress(defaultProgress());
    expect(o.total).toBe(MODULES.reduce((a, m) => a + m.topics.length, 0));
    expect(o.done).toBe(5);
  });
  test("bad saved data falls back safely", () => {
    expect(sanitizeProgress("nope")).toEqual(defaultProgress());
    const p = sanitizeProgress({ plan: "bogus", customModule: 99, topics: { "1.0": true, "1.1": "x" }, notes: { "4": 5 } });
    expect(p.plan).toBeNull();
    expect(p.customModule).toBe(1);
    expect(p.topics["1.0"]).toBe(true);
    expect(p.topics["1.1"]).toBeUndefined();
    expect(p.notes).toEqual({});
  });
  test("the lesson request keeps authorship with the student", () => {
    const r = lessonRequest(nextUp({ ...defaultProgress(), plan: "continue" })!);
    expect(r).toContain("Mixolydian");
    expect(r).toMatch(/no finished riffs/);
  });
});
