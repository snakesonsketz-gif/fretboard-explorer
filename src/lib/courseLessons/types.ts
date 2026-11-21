/** One lesson in the course: structured so the page can show it as cards, not a wall of text. */
export interface Idea {
  title: string;
  body: string;
}

export interface Lesson {
  /** "module.lesson", e.g. "4.4" */
  id: string;
  module: number;
  title: string;
  /** One line: what you will be able to do afterwards. */
  blurb: string;
  goals: string[];
  /** The core concepts, one card each. */
  ideas: Idea[];
  guitar: string;
  /** Full-band application; omitted when not relevant. */
  band?: string;
  why: string;
  mistakes: string[];
  /** Things to listen for or analyse in music you already know (no lyrics or transcriptions). */
  listen: string[];
  /** Short drills before the assignment. */
  practice: string[];
  /** Composition assignment: always leaves the creative decisions to the student. */
  assignment: string[];
  /** Indexes into the module's topics this lesson finishes. */
  covers: number[];
  /** Preview of the next lesson. */
  next: string;
}

export const lesson = (l: Lesson): Lesson => l;

export interface Source {
  title: string;
  url: string;
}
