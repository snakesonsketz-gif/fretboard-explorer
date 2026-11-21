import { describe, expect, test } from "bun:test";
import { MODULES } from "../src/lib/course";
import { LESSONS, lessonsFor, lessonById, SOURCES } from "../src/lib/courseLessons";
import { lessonPrompt, modulePrompt } from "../src/lib/coursePrompts";

describe("course lessons", () => {
  test("every module has lessons that together cover every topic", () => {
    for (const m of MODULES) {
      const cov = new Set(lessonsFor(m.id).flatMap((l) => l.covers));
      for (let i = 0; i < m.topics.length; i++) expect(cov.has(i) || m.id === 4 && i === 3).toBe(true);
      for (const l of lessonsFor(m.id)) for (const i of l.covers) expect(i).toBeLessThan(m.topics.length);
    }
  });
  test("ids are unique and well formed", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LESSONS) expect(l.id.startsWith(`${l.module}.`)).toBe(true);
  });
  test("every lesson has the required parts", () => {
    for (const l of LESSONS) {
      expect(l.goals.length).toBeGreaterThan(0);
      expect(l.ideas.length).toBeGreaterThan(0);
      expect(l.assignment.length).toBeGreaterThan(0);
      expect(l.guitar.length).toBeGreaterThan(10);
    }
  });
  test("prompts forbid generated riffs and name the lesson", () => {
    const l = lessonById("4.4")!;
    const t = lessonPrompt(l);
    expect(t).toContain("Mixolydian");
    expect(t).toContain("do not write finished riffs");
    expect(modulePrompt(MODULES[7]!)).toContain("8.1");
  });
  test("sources exist for every module", () => {
    for (const m of MODULES) expect((SOURCES[m.id] ?? []).length).toBeGreaterThan(0);
  });
});
