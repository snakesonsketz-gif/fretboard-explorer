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
  /** How many strums to play (0: a step of sounds that are not strums). */
  strums: number;
  /** What to call them when it isn't "strums" (e.g. "picks"). */
  unit?: string;
  title: string;
  how: string;
  /** The player lets each strum ring out before the next (so knocks between strums can be told apart). */
  spaced: boolean;
  /** Recording round (1 = the first full set; 2 = follow-up aimed at what round 1 showed). */
  round: number;
}

const tri = (rootName: string, minor = false): TargetChord => ({ rootName, degrees: minor ? ["1", "b3", "5"] : ["1", "3", "5"], label: minor ? `${rootName}m` : rootName });
const G = tri("G"), C = tri("C"), D = tri("D"), Em = tri("E", true), Am = tri("A", true), F = tri("F"), A = tri("A"), E = tri("E");
const Dm = tri("D", true), Bm = tri("B", true);
const A7: TargetChord = { rootName: "A", degrees: ["1", "3", "5", "b7"], label: "A7" };
const B7: TargetChord = { rootName: "B", degrees: ["1", "3", "5", "b7"], label: "B7" };
const Cmaj7: TargetChord = { rootName: "C", degrees: ["1", "3", "5", "7"], label: "Cmaj7" };
const Dsus4: TargetChord = { rootName: "D", degrees: ["1", "4", "5"], label: "Dsus4" };
const G5: TargetChord = { rootName: "G", degrees: ["1", "5"], label: "G5" };
const G7: TargetChord = { rootName: "G", degrees: ["1", "3", "5", "b7"], label: "G7" };

const RING = "Let each strum ring until it has faded away completely (about 3 seconds) before the next one.";

const ROUND_1 = [
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
] as Omit<PlanStep, "spaced" | "round">[];

/** How to make real buzz (round 1 showed "light pressure" often came out clean or dead instead). */
const BUZZ = "Press just enough that the notes still sound, but buzz or rattle against the frets. Listen before you start: if a note goes silent or rings clean, change the pressure until you hear the rattle.";

/**
 * Round 2 (Oct 2026), aimed at what Bradley's first 21 takes showed: buzz was only really in the
 * recording on 7 strums, muting is only detectable on a note no other string doubles, and soft,
 * quick, slow and up-strums (none in round 1) need examples.
 */
const ROUND_2 = [
  // ---------------- real buzz, on more chords
  { id: "r2-buzz-c", label: "buzz", target: C, tab: "x32010", strums: 4, title: "C — buzzing (redo)", how: `Play C with your fingers well behind the fret wires. ${BUZZ} ${RING}` },
  { id: "r2-buzz-em", label: "buzz", target: Em, tab: "022000", strums: 4, title: "E minor — buzzing", how: `Play E minor. ${BUZZ} ${RING}` },
  { id: "r2-buzz-d", label: "buzz", target: D, tab: "xx0232", strums: 4, title: "D — buzzing", how: `Play D, top four strings. ${BUZZ} ${RING}` },
  { id: "r2-buzz-am", label: "buzz", target: Am, tab: "x02210", strums: 4, title: "A minor — buzzing", how: `Play A minor. ${BUZZ} ${RING}` },
  { id: "r2-buzz-g", label: "buzz", target: G, tab: "320003", strums: 4, title: "G — buzzing (redo)", how: `Play G. ${BUZZ} Make every strum buzz, including the first. ${RING}` },
  // ---------------- muted: a note no other string doubles, so the mute can be heard
  { id: "r2-muted-am-b", label: "muted", target: Am, tab: "x02210", muted: [4], strums: 4, title: "A minor with the B string muted", how: `Play A minor, but let a finger touch the B string so its C doesn't ring. ${RING}` },
  { id: "r2-muted-d-g", label: "muted", target: D, tab: "xx0232", muted: [3], strums: 4, title: "D with the G string muted", how: `Play D, but let a finger lean on the G string so its A doesn't ring. ${RING}` },
  { id: "r2-muted-a-b", label: "muted", target: A, tab: "x02220", muted: [4], strums: 4, title: "A with the B string muted", how: `Open A (three fingers on the 2nd fret), but let a finger touch the B string so its C♯ doesn't ring. ${RING}` },
  { id: "r2-muted-e-g", label: "muted", target: E, tab: "022100", muted: [3], strums: 4, title: "E with the G string muted", how: `Open E major, but let a finger rest on the G string so its G♯ thuds instead of ringing. ${RING}` },
  // ---------------- soft, quick, slow
  { id: "r2-soft-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G — softly", how: `Clean G, strummed softly — the quietest you'd normally play. ${RING}` },
  { id: "r2-soft-am", label: "clean", target: Am, tab: "x02210", strums: 4, title: "A minor — softly", how: `Clean A minor, strummed softly. ${RING}` },
  { id: "r2-fast-c", label: "clean", target: C, tab: "x32010", strums: 8, title: "Open C — steady rhythm", how: "Clean C, 8 down-strums in a steady rhythm, about two per second, with a light, relaxed strumming hand. Let the last one ring out." },
  { id: "r2-fast-em", label: "clean", target: Em, tab: "022000", strums: 8, title: "E minor — down and up", how: "Clean E minor, 8 strums alternating down and up (down-up-down-up…), about two per second. Each down and each up counts as one strum. Let the last one ring out." },
  // ---------------- up-strums (high string first, often only the top strings, usually softer)
  { id: "r2-up-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G — up-strums only", how: `Clean G, but strum UP only (high string first). It's fine if you only catch the top 3 or 4 strings — that's normal for an up-strum. ${RING}` },
  { id: "r2-up-c", label: "clean", target: C, tab: "x32010", strums: 4, title: "Open C — up-strums only", how: `Clean C, up-strums only, at your normal strength. ${RING}` },
  { id: "r2-up-soft-am", label: "clean", target: Am, tab: "x02210", strums: 4, title: "A minor — light up-strums", how: `Clean A minor, up-strums only, lightly — the soft up-strum you'd use between down-strums. ${RING}` },
  { id: "r2-downup-g", label: "clean", target: G, tab: "320003", strums: 8, title: "Open G — down and up, slowly", how: "Clean G, 8 strums alternating down and up (down-up-down-up…), about one strum per second so each one is clear. Each down and each up counts as one strum. Let the last one ring out." },
  { id: "r2-slow-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G — slow strums", how: `Clean G, but strum slowly so the strings sound one after another (about half a second from the low string to the high one). ${RING}` },
] as Omit<PlanStep, "spaced" | "round">[];

/**
 * Round 3 (Oct 2026): everything else Listen will meet — more chord types, the mistakes beginners
 * really make, how hard and how he strums (hard, palm-muted, scratches, picked one string at a
 * time), sounds that are NOT strums (to make sure nothing gets counted), and the setup changing
 * (phone further away, background sound). Recorded on the phone and the tablet.
 */
const ROUND_3 = [
  // ---------------- more chord types (clean)
  { id: "r3-dm", label: "clean", target: Dm, tab: "xx0231", strums: 4, title: "D minor", how: `Clean D minor, top four strings. ${RING}` },
  { id: "r3-e", label: "clean", target: E, tab: "022100", strums: 4, title: "E major", how: `Clean open E, all six strings. ${RING}` },
  { id: "r3-a7", label: "clean", target: A7, tab: "x02020", strums: 4, title: "A7", how: `Clean A7 (2nd fret on the D and B strings), from the A string down. ${RING}` },
  { id: "r3-b7", label: "clean", target: B7, tab: "x21202", strums: 4, title: "B7", how: `Clean B7, from the A string down. ${RING}` },
  { id: "r3-cmaj7", label: "clean", target: Cmaj7, tab: "x32000", strums: 4, title: "Cmaj7", how: `Like C, but lift your 1st finger so the B string rings open. ${RING}` },
  { id: "r3-dsus4", label: "clean", target: Dsus4, tab: "xx0233", strums: 4, title: "Dsus4", how: `Like D, but your little finger on the 3rd fret of the high E string. ${RING}` },
  { id: "r3-bm", label: "clean", target: Bm, tab: "x24432", strums: 4, title: "B minor barre (2nd fret)", how: `A-shape barre at the 2nd fret, from the A string down. Check every string rings first. ${RING}` },
  { id: "r3-g5", label: "clean", target: G5, tab: "355xxx", strums: 4, title: "G5 power chord", how: `Power chord on the low three strings (3rd fret low E, 5th fret A and D). Strum only those three. ${RING}` },
  // ---------------- real beginner mistakes
  { id: "r3-wrong-f-b", label: "wrong-note", target: F, tab: "133201", wrong: [4], strums: 4, title: "F with the B string not pressed", how: `F barre, but let the barre miss the B string so it rings open (B instead of C) — the most common F-chord problem. ${RING}` },
  { id: "r3-wrong-em-gs", label: "wrong-note", target: Em, tab: "022100", wrong: [3], strums: 4, title: "E minor with a finger on the G string", how: `Play E minor, but put a finger on the 1st fret of the G string (G♯) — so it's really E major. ${RING}` },
  { id: "r3-wrong-am-cs", label: "wrong-note", target: Am, tab: "x02220", wrong: [4], strums: 4, title: "A minor played as A major", how: `Asked for A minor, but play open A major (2nd fret on the B string: C♯ instead of C). ${RING}` },
  // ---------------- how he strums
  { id: "r3-hard-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G — strum hard", how: `Clean G, strummed as hard as you ever would (loud). ${RING}` },
  { id: "r3-refret-c", label: "clean", target: C, tab: "x32010", strums: 4, title: "Open C — lift and re-fret between strums", how: `Strum C, let it ring a second, then lift your fretting hand right off and put the chord back on (finger squeaks are fine), and strum again.` },
  { id: "r3-palm-e5", label: "other", target: tri("E"), tab: "022xxx", strums: 8, title: "Palm-muted chugs", how: "Rest the side of your strumming hand on the strings by the bridge and strum the low three strings of E (E power chord) 8 times — short, muted chugs, about two per second." },
  { id: "r3-scratch", label: "other", target: G, tab: "xxxxxx", strums: 4, title: "Muted scratches", how: "Lay your fretting hand lightly across all the strings (no notes) and strum 4 times — just the scratchy 'chk' sound, a second apart." },
  { id: "r3-picked-c", label: "other", target: C, tab: "x32010", strums: 5, unit: "picks", title: "C picked one string at a time", how: "Hold C and pick the five strings one at a time, slowly from the A string to the high E — about one string per second (5 picks)." },
  // ---------------- sounds that are NOT strums (Fretlab should count nothing)
  { id: "r3-noise-hands", label: "noise", target: G, tab: "320003", strums: 0, title: "Guitar noises — no strums", how: "Don't strum. Hold G and, over 10 seconds: slide your fretting hand up and down the neck (squeaks), tap the guitar's body twice, knock on it once, and tap the strings lightly with your palm to stop them." },
  { id: "r3-noise-room", label: "noise", target: G, tab: "320003", strums: 0, title: "Room noises — no strums", how: "Don't touch the strings. Over 10 seconds: say a sentence out loud, clap once, move in your chair, and put something down on the table near the phone." },
  // ---------------- setup changes
  { id: "r3-far-g", label: "clean", target: G, tab: "320003", strums: 4, title: "Open G — phone across the room", how: `Put the phone (or tablet) about 2 m / 6 ft away, then play clean G. Put it back where it was afterwards. ${RING}` },
  { id: "r3-music-c", label: "clean", target: C, tab: "x32010", strums: 4, title: "Open C — with music playing", how: `Play some music quietly in the room (another phone or a speaker, not loud), then play clean C. ${RING}` },
] as Omit<PlanStep, "spaced" | "round">[];

const withMeta = (steps: Omit<PlanStep, "spaced" | "round">[], round: number): PlanStep[] => steps.map((s) => ({ ...s, spaced: s.how.includes(RING), round }));

export const ROUNDS: { round: number; title: string; steps: PlanStep[] }[] = [
  { round: 1, title: "Round 1", steps: withMeta(ROUND_1, 1) },
  { round: 2, title: "Round 2", steps: withMeta(ROUND_2, 2) },
  { round: 3, title: "Round 3", steps: withMeta(ROUND_3, 3) },
];

/** Every step of every round. */
export const PLAN: PlanStep[] = ROUNDS.flatMap((r) => r.steps);

export const SETUP_TIPS = [
  "Tune your guitar first.",
  "Find a quiet room — no TV, music or fan.",
  "Put the phone or tablet on a table or stand, about a foot (30 cm) from where the neck meets the body, with its microphone towards the guitar (phone: the bottom edge; iPad: the top edge, near the camera). Don't move it between steps.",
  "Play mistakes exactly as described — they're on purpose.",
  "Each round takes about 10 minutes. You can stop any time; finished steps are saved on this device.",
  "Do every round on each device (phone and tablet) — each one keeps its own progress.",
];

/** Standard tuning, low E first (MIDI). */
export const STANDARD = [40, 45, 50, 55, 59, 64];

/** MIDI notes the tab sounds (null = string not played). */
export const tabMidis = (tab: string) => [...tab].map((c, s) => (c === "x" ? null : STANDARD[s]! + Number(c)));
