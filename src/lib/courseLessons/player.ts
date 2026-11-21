import { lesson, type Lesson } from "./types";

/** Compact spec for one guitarist study; expanded into a full Lesson with the same structure as every other lesson. */
export interface PlayerSpec {
  id: string;
  n: number;
  name: string;
  /** One line: the player's place in guitar history. */
  blurb: string;
  story: string;
  rig: string;
  harmony: string;
  touch: string;
  rhythm: string;
  apart: string;
  /** The transferable principle, phrased as an instruction. */
  principle: string;
  listen: [string, string];
  dive: [string, string][];
  check: [string, string][];
  next: string;
}

export const player = (p: PlayerSpec): Lesson =>
  lesson({
    id: p.id,
    module: 23,
    title: p.name,
    blurb: p.blurb,
    goals: [
      `Describe ${p.name}'s sound, vocabulary, touch and role in one paragraph each`,
      "State in one sentence what set them apart from their peers",
      "Apply one principle from them to your own writing without copying a phrase",
    ],
    ideas: [
      { title: "Story and influences", body: p.story },
      { title: "Rig and tone", body: p.rig },
      { title: "Scales and harmony", body: p.harmony },
      { title: "Technique and touch", body: p.touch },
      { title: "Rhythm playing and band role", body: p.rhythm },
      { title: "What set them apart", body: p.apart },
    ],
    guitar: `Write the four-box study (sound, vocabulary, touch, context) for ${p.name} in your own words, then play one phrase of your own that uses this principle: ${p.principle}`,
    band: `Ask what a band around ${p.name} needs to do: which parts leave space for them, and which parts they leave space for.`,
    why: `${p.name} shows one complete way to solve the same problems every guitarist faces: tone, note choice, feel and role. Understanding the choices gives you a tool, not a template.`,
    mistakes: [
      "Copying a famous phrase instead of the idea behind it",
      "Chasing the gear and ignoring touch and note choice",
      "Studying only the solos and ignoring the rhythm playing",
    ],
    listen: [...p.listen, "Listen to the same player in two different songs and write what stays the same"],
    practice: [
      `Play any chord progression of your own while using only this principle: ${p.principle}`,
      "Record two takes, one imitating their touch and one in your normal touch, and compare",
    ],
    assignment: [
      `Write a short original section (any length you choose) built on this principle: ${p.principle}`,
      "List what you borrowed (an idea) and what is yours (the notes, rhythm and key)",
      "Decide which instrument in your band should carry the idea and why",
    ],
    covers: [p.n],
    next: p.next,
    deep: {
      dive: p.dive,
      method: [
        `Pick three songs by ${p.name} from different periods`,
        "Fill in sound, vocabulary, touch and context for each and note what changes",
        "Write the one-sentence difference between them and their peers",
        "Turn it into a principle you can state without naming the player",
        "Apply it in a new key and a different genre, then compare to the original",
      ],
      check: p.check,
    },
  });
