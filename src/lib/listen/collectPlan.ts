/**
 * Develop tab — the guided recording plan: exactly what to play, and how, to collect the data
 * needed to re-tune Listen mode on a real guitar. Covers clean chords (open, barre, 7th, soft,
 * fast), wrong notes, muted strings and buzz, with a strum count per step so strum detection
 * can be checked too. Tabs are standard tuning, low E string first ("x" = not played).
 */
import type { TargetChord } from "./score";
import type { TakeLabel } from "./takes";

export interface PlanStep {
  id: string;
  label: TakeLabel;
  target: TargetChord;
  /** Six characters, low E to high e: fret number or "x". */
  tab: string;
  /** Strings (0 = low E … 5 = high e) played wrong on purpose (wrong-note steps). */
  wrong?: number[];
  /** Strings muted or deadened on purpose (muted steps). */
  muted?: number[];
  /** How many strums to play. */
  strums: number;
  title: string;
  how: string;
}

const tri = (rootName: string, minor = false): TargetChord => ({ rootName, degrees: minor ? ["1", "b3", "5"] : ["1", "3", "5"], label: minor ? `${rootName}m` : rootName });
const G = tri("G"), C = tri("C"), D = tri("D"), Em = tri("E", true), Am = tri("A", true), F = tri("F"), A = tri("A");
const G7: TargetChord = { rootName: "G", degrees: ["1", "3", "5", "b7"], label: "G7" };

const RING = "Let each strum ring until it has faded away completely (about 3 seconds) before the next one.";

export const PLAN: PlanStep[] = [
  // ---------------- clean
  { id: "clean-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G", how: `Down-strum all six strings at a normal strength. ${RING}` },
  { id: "clean-c", label: "clean", target: C, tab: "x32010", strums: 4, title: "Open C", how: `Strum from the A string down (skip the low E). ${RING}` },
  { id: "clean-d", label: "clean", target: D, tab: "xx0232", strums: 4, title: "Open D", how: `Strum only the top four strings (D G B e). ${RING}` },
  { id: "clean-em", label: "clean", target: Em, tab: "022000", strums: 4, title: "E minor", how: `Strum all six strings. ${RING}` },
  { id: "clean-am", label: "clean", target: Am, tab: "x02210", strums: 4, title: "A minor", how: `Strum from the A string down. ${RING}` },
  { id: "clean-f", label: "clean", target: F, tab: "133211", strums: 4, title: "F barre (1st fret)", how: `Full barre at the 1st fret. Check every string rings clearly before you start — if a string buzzes, adjust and try again. ${RING}` },
  { id: "clean-g7", label: "clean", target: G7, tab: "320001", strums: 4, title: "Open G7", how: `Like G, but the top string at the 1st fret (F). ${RING}` },
  { id: "clean-a-barre", label: "clean", target: A, tab: "577655", strums: 4, title: "A barre (5th fret)", how: `A major as an E-shape barre chord at the 5th fret. ${RING}` },
  { id: "clean-soft", label: "clean", target: C, tab: "x32010", strums: 4, title: "Open C — softly", how: `Same open C, but strum softly — the quietest you'd normally play. ${RING}` },
  { id: "clean-fast", label: "clean", target: G, tab: "320003", strums: 8, title: "Open G — steady rhythm", how: "Strum G 8 times in a steady rhythm, about two strums per second (count “1-and-2-and…”), without stopping. Let the last one ring out." },
  // ---------------- wrong notes (on purpose)
  { id: "wrong-g-f", label: "wrong-note", target: G, tab: "320001", wrong: [5], strums: 4, title: "G with a wrong top note", how: `Play G, but on the top string press the 1st fret (F) instead of the 3rd. ${RING}` },
  { id: "wrong-c-d", label: "wrong-note", target: C, tab: "x32030", wrong: [4], strums: 4, title: "C with a wrong B-string note", how: `Play C, but move your 1st finger to the 3rd fret of the B string (D instead of C). ${RING}` },
  { id: "wrong-d-lowe", label: "wrong-note", target: D, tab: "000232", wrong: [0], strums: 4, title: "D, strumming the low E too", how: `Play D, but strum all six strings, including the low E — a common slip. ${RING}` },
  { id: "wrong-em-fsharp", label: "wrong-note", target: Em, tab: "024000", wrong: [2], strums: 4, title: "E minor with a slipped finger", how: `Play E minor, but put your 2nd finger on the 4th fret of the D string (F♯) instead of the 2nd. ${RING}` },
  // ---------------- muted strings (on purpose)
  { id: "muted-g-d", label: "muted", target: G, tab: "320003", muted: [2], strums: 4, title: "G with a dead D string", how: `Play G, but let a finger rest lightly on the open D string so it thuds instead of ringing. ${RING}` },
  { id: "muted-c-g", label: "muted", target: C, tab: "x32010", muted: [3], strums: 4, title: "C with the G string muted", how: `Play C, but let your 2nd finger lean against the open G string so it's muted — the most common C-chord mistake. ${RING}` },
  { id: "muted-d-e", label: "muted", target: D, tab: "xx0232", muted: [5], strums: 4, title: "D with the top string muted", how: `Play D, but let a finger or your palm touch the high E string so it doesn't ring. ${RING}` },
  { id: "muted-em-g", label: "muted", target: Em, tab: "022000", muted: [3], strums: 4, title: "E minor with the G string muted", how: `Play E minor, but let your 2nd finger touch the open G string. ${RING}` },
  // ---------------- buzz (on purpose)
  { id: "buzz-g", label: "buzz", target: G, tab: "320003", strums: 4, title: "G — light pressure (buzz)", how: `Play G pressing the fretted notes very lightly, so they buzz instead of ringing clearly. ${RING}` },
  { id: "buzz-f", label: "buzz", target: F, tab: "133211", strums: 4, title: "F — weak barre (buzz)", how: `Play the F barre with a weak 1st finger so some strings buzz. ${RING}` },
  { id: "buzz-c-far", label: "buzz", target: C, tab: "x32010", strums: 4, title: "C — far from the frets (buzz)", how: `Play C with your fingers far back from the fret wires and light pressure, so the notes buzz. ${RING}` },
];

export const SETUP_TIPS = [
  "Tune your guitar first.",
  "Find a quiet room — no TV, music or fan.",
  "Put the phone on a table or stand, about a foot (30 cm) from where the neck meets the body, bottom of the phone (the mic) towards the guitar. Don't move it between steps.",
  "Play mistakes exactly as described — they're on purpose.",
  "About 10 minutes in all. You can stop any time; finished steps are saved on this phone.",
];

/** Standard tuning, low E first (MIDI). */
export const STANDARD = [40, 45, 50, 55, 59, 64];

/** MIDI notes the tab sounds (null = string not played). */
export const tabMidis = (tab: string) => [...tab].map((c, s) => (c === "x" ? null : STANDARD[s]! + Number(c)));
