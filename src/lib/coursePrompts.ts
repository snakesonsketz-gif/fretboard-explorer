import type { CourseModule as Module } from "./course";
import { LESSONS, lessonsFor, type Lesson } from "./courseLessons";

const RULE =
  "Teach it in the ten-part lesson format with guitar and full-band applications. Leave every creative decision to me: do not write finished riffs, licks, solos, progressions or lyrics, and set a composition assignment I complete myself.";

/** A message to paste into a chat to be taught one lesson. */
export function lessonPrompt(l: Lesson): string {
  return [
    `Teach me Module ${l.module}, Lesson ${l.id.split(".")[1]}: ${l.title}.`,
    `Goals: ${l.goals.join("; ")}.`,
    `Key ideas to cover: ${l.ideas.map((i) => i.title).join("; ")}.`,
    `Common mistakes to address: ${l.mistakes.join("; ")}.`,
    RULE,
    `Then quiz me with three short questions before the assignment: ${l.assignment.join("; ")}.`,
  ].join(" ");
}

/** A message to paste into a chat to work through a whole module. */
export function modulePrompt(m: Module): string {
  const ls = lessonsFor(m.id);
  return [
    `Take me through Module ${m.id}: ${m.title}, one lesson at a time, waiting for me to finish each assignment before the next.`,
    `Lessons: ${ls.map((l) => `${l.id} ${l.title}`).join("; ")}.`,
    `Topics: ${m.topics.join("; ")}.`,
    RULE,
    "Start with Lesson 1 now.",
  ].join(" ");
}

export const lessonCount = (): number => LESSONS.length;
