/**
 * Games played with the real guitar: the microphone listens, Listen's judging decides whether a
 * strum was the chord asked for. Pure rules here (tested); the screens are in components/games.
 */
import type { Favorite } from "./favorites";
import { chordDefFor, favoriteTier, type Tier } from "./levels";
import type { StrumReport, TargetChord } from "./listen/score";
import { degreeToSemitones } from "./theory";

export interface GameChord {
  label: string;
  target: TargetChord;
  /** Common open/barre shape, low E string first, shown as a hint. */
  tab: string;
}

const ch = (label: string, rootName: string, degrees: TargetChord["degrees"], tab: string): GameChord => ({ label, target: { rootName, degrees, label }, tab });
const D = (s: string) => s.split(" ") as TargetChord["degrees"];
const MAJ = D("1 3 5"), MIN = D("1 b3 5"), DOM7 = D("1 3 5 b7"), MIN7 = D("1 b3 5 b7"), MAJ7 = D("1 3 5 7");
const SUS2 = D("1 2 5"), SUS4 = D("1 4 5");

export const CHORDS: Record<string, GameChord> = {
  // Beginner: open majors and minors
  G: ch("G", "G", MAJ, "320003"),
  C: ch("C", "C", MAJ, "x32010"),
  D: ch("D", "D", MAJ, "xx0232"),
  Em: ch("Em", "E", MIN, "022000"),
  Am: ch("Am", "A", MIN, "x02210"),
  E: ch("E", "E", MAJ, "022100"),
  A: ch("A", "A", MAJ, "x02220"),
  Dm: ch("Dm", "D", MIN, "xx0231"),
  // Intermediate: open 7ths, sus and add9
  G7: ch("G7", "G", DOM7, "320001"),
  A7: ch("A7", "A", DOM7, "x02020"),
  B7: ch("B7", "B", DOM7, "x21202"),
  D7: ch("D7", "D", DOM7, "xx0212"),
  E7: ch("E7", "E", DOM7, "020100"),
  C7: ch("C7", "C", DOM7, "x32310"),
  Am7: ch("Am7", "A", MIN7, "x02010"),
  Em7: ch("Em7", "E", MIN7, "020000"),
  Dm7: ch("Dm7", "D", MIN7, "xx0211"),
  Cmaj7: ch("Cmaj7", "C", MAJ7, "x32000"),
  Fmaj7: ch("Fmaj7", "F", MAJ7, "xx3210"),
  Dsus2: ch("Dsus2", "D", SUS2, "xx0230"),
  Dsus4: ch("Dsus4", "D", SUS4, "xx0233"),
  Asus2: ch("Asus2", "A", SUS2, "x02200"),
  Asus4: ch("Asus4", "A", SUS4, "x02230"),
  Esus4: ch("Esus4", "E", SUS4, "022200"),
  Cadd9: ch("Cadd9", "C", D("1 3 5 9"), "x32030"),
  // Advanced: barre chords and open major 7ths
  F: ch("F", "F", MAJ, "133211"),
  Bm: ch("Bm", "B", MIN, "x24432"),
  Bb: ch("Bb", "Bb", MAJ, "x13331"),
  B: ch("B", "B", MAJ, "x24442"),
  "F#m": ch("F#m", "F#", MIN, "244222"),
  Cm: ch("Cm", "C", MIN, "x35543"),
  Gm: ch("Gm", "G", MIN, "355333"),
  Fm: ch("Fm", "F", MIN, "133111"),
  Amaj7: ch("Amaj7", "A", MAJ7, "x02120"),
  Dmaj7: ch("Dmaj7", "D", MAJ7, "xx0222"),
  Emaj7: ch("Emaj7", "E", MAJ7, "021100"),
  // Expert: barre 7ths, 6ths and extensions
  Bm7: ch("Bm7", "B", MIN7, "x24232"),
  "F#m7": ch("F#m7", "F#", MIN7, "242222"),
  Cm7: ch("Cm7", "C", MIN7, "x35343"),
  G6: ch("G6", "G", D("1 3 5 6"), "320000"),
  C9: ch("C9", "C", D("1 3 5 b7 9"), "x32333"),
  E9: ch("E9", "E", D("1 3 5 b7 9"), "020132"),
  A9: ch("A9", "A", D("1 3 5 b7 9"), "x02423"),
  Em9: ch("Em9", "E", D("1 b3 5 b7 9"), "020002"),
  "E7#9": ch("E7#9", "E", D("1 3 b7 #9"), "0x678x"),
};

/** Chord Rush: one level per difficulty tier. */
export const RUSH_LEVELS = [
  { id: "beginner", name: "Beginner", chords: ["G", "C", "D", "Em", "Am", "E", "A", "Dm"], fallStart: 7, fallMin: 3.2 },
  { id: "intermediate", name: "Intermediate", chords: ["G7", "A7", "B7", "D7", "E7", "C7", "Am7", "Em7", "Dm7", "Cmaj7", "Fmaj7", "Dsus2", "Dsus4", "Asus2", "Asus4", "Esus4", "Cadd9"], fallStart: 6.5, fallMin: 2.8 },
  { id: "advanced", name: "Advanced", chords: ["F", "Bm", "Bb", "B", "F#m", "Cm", "Gm", "Fm", "Amaj7", "Dmaj7", "Emaj7"], fallStart: 6, fallMin: 2.6 },
  { id: "expert", name: "Expert", chords: ["Bm7", "F#m7", "Cm7", "G6", "C9", "E9", "A9", "Em9", "E7#9"], fallStart: 5.5, fallMin: 2.4 },
] as const satisfies readonly { id: Tier; name: string; chords: readonly string[]; fallStart: number; fallMin: number }[];
export type RushLevel = (typeof RUSH_LEVELS)[number];

// ---------------------------------------------------------------- saved chords in games

/** A saved chord's standard-tuning shape as a tab string ("" when there's none to show). */
export function shapeTab(shape: (number | null)[] | undefined, tuningId: string | undefined): string {
  if (!shape || shape.length !== 6 || (tuningId && tuningId !== "standard")) return "";
  if (shape.some((f) => f !== null && f > 9)) return "";
  return shape.map((f) => (f === null ? "x" : String(f))).join("");
}

/** A saved chord's name: root + the library suffix when it's a library chord. */
export function savedChordName(f: Pick<Favorite, "rootName" | "degrees" | "label">): string {
  const def = chordDefFor(f.degrees);
  return def ? `${f.rootName}${def.suffix}` : f.label;
}

/** The player's saved chords (from Explore) at a tier, ready for the games, keyed "my:<id>". */
export function savedGameChords(favs: readonly Favorite[], tier: Tier): Record<string, GameChord> {
  const out: Record<string, GameChord> = {};
  for (const f of favs) {
    if (f.mode !== "chord" || favoriteTier(f) !== tier || f.degrees.length < 2) continue;
    const label = savedChordName(f);
    out[`my:${f.id}`] = { label, target: { rootName: f.rootName, degrees: f.degrees as TargetChord["degrees"], label }, tab: shapeTab(f.shape, f.tuningId) };
  }
  return out;
}

/** How a chord key reads on screen: the built-in names are their own label. */
export const chordLabel = (pool: Record<string, GameChord>, key: string) => pool[key]?.label ?? key;

export const RUSH_LIVES = 3;

/** Seconds a chord takes to fall: a little faster after every chord cleared. */
export const fallSeconds = (level: Pick<RushLevel, "fallStart" | "fallMin">, cleared: number) => Math.max(level.fallMin, level.fallStart * 0.94 ** cleared);

/** Points for clearing a chord: 100, up to +100 for speed, then the combo multiplier (×1.1 per streak, up to ×2). */
export const rushPoints = (timeLeftFraction: number, combo: number) => Math.round((100 + 100 * Math.max(0, Math.min(1, timeLeftFraction))) * (1 + Math.min(10, combo) * 0.1));

/** The next chord: random from the level, never the same twice in a row. */
export function nextChord(pool: readonly string[], prev: string | null, rand: () => number = Math.random): string {
  const choices = pool.filter((c) => c !== prev);
  return choices[Math.floor(rand() * choices.length) % choices.length] ?? pool[0]!;
}

export type StrumResult = { kind: "clean" } | { kind: "wrong"; why: string } | { kind: "quiet" } | { kind: "unsure" };

/**
 * What a strum means in a game. Only the notes count (was every chord note there, nothing extra):
 * buzz and ring-out aren't reliable enough yet to cost a player points.
 */
export function strumResult(r: StrumReport): StrumResult {
  if (r.level.tooQuiet) return { kind: "quiet" };
  const missing = r.accuracy.notes.filter((n) => n.status === "missing").map((n) => n.name);
  const wrong = [...new Set(r.accuracy.extras.filter((e) => e.status === "wrong").map((e) => plainName(e.name)))];
  if (missing.length || wrong.length)
    return { kind: "wrong", why: [missing.length ? `missing ${missing.join(", ")}` : "", wrong.length ? `extra ${wrong.join(", ")}` : ""].filter(Boolean).join(" · ") };
  return r.accuracy.verdict === "good" ? { kind: "clean" } : { kind: "unsure" };
}

/** A wrong note in everyday spelling (a C heard in E minor is "C", not "B#"). */
export function plainName(name: string): string {
  const m = /^([A-G])([#♯b♭x𝄪𝄫]*)/.exec(name);
  if (!m) return name;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as "C"]!;
  const shift = [...m[2]!].reduce((a, c) => a + (c === "#" || c === "♯" ? 1 : c === "b" || c === "♭" ? -1 : c === "x" || c === "𝄪" ? 2 : -2), 0);
  return ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][(((base + shift) % 12) + 12) % 12]!;
}

export const CHANGE_PAIRS: Record<Tier, [string, string][]> = {
  beginner: [["G", "C"], ["C", "D"], ["G", "D"], ["Em", "Am"], ["Am", "C"], ["D", "A"], ["G", "Em"], ["E", "A"], ["Am", "Dm"], ["E", "Am"]],
  intermediate: [["G7", "C"], ["D7", "G"], ["Am7", "D7"], ["Em7", "A7"], ["Cmaj7", "Fmaj7"], ["E7", "Am"], ["Dsus4", "D"], ["Asus2", "A"], ["Cadd9", "G"], ["B7", "Em"]],
  advanced: [["C", "F"], ["F", "Bb"], ["Bm", "G"], ["F#m", "D"], ["Am", "F"], ["Bm", "F#m"], ["Cm", "Gm"], ["Fm", "Cm"], ["Amaj7", "Dmaj7"], ["B", "E"]],
  expert: [["Bm7", "E9"], ["F#m7", "B7"], ["Cm7", "F"], ["Em9", "A9"], ["E7#9", "A7"], ["G6", "Cmaj7"], ["C9", "F"], ["Bm7", "Emaj7"]],
};
export const CHANGE_SECONDS = 60;

/** Change Race: alternate between two chords; every clean strum of the chord due after the first is one change. */
export interface RaceState {
  /** Index into the pair of the chord due now. */
  due: 0 | 1;
  changes: number;
  /** Strums that weren't the chord due (wrong notes, or the same chord again). */
  misses: number;
  /** The first clean strum starts the count (it isn't a change yet). */
  started: boolean;
}
export const raceStart = (): RaceState => ({ due: 0, changes: 0, misses: 0, started: false });
export function raceStep(s: RaceState, r: StrumResult): RaceState {
  if (r.kind === "clean") return { ...s, due: s.due === 0 ? 1 : 0, changes: s.started ? s.changes + 1 : s.changes, started: true };
  if (r.kind === "wrong") return { ...s, misses: s.misses + 1 };
  return s;
}

// ---------------------------------------------------------------- personal bests

const BEST_KEY = "fretlab.games.best.v1";
export function loadBests(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}
/** Store a score if it beats the best; returns true when it's a new best. */
export function saveBest(key: string, score: number): boolean {
  const all = loadBests();
  if (score <= (all[key] ?? 0)) return false;
  all[key] = score;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    /* not remembered */
  }
  return true;
}

// ---------------------------------------------------------------- ear trainer

/** One possible answer: a chord quality (steps above the root) or an interval (semitones). */
export interface EarAnswer {
  id: string;
  label: string;
  /** What it sounds like — shown under the answer. */
  hint: string;
  color: string;
  /** Chords: semitones above the root, low to high. Intervals: [0, size]. */
  steps: number[];
}

const chordQ = (id: string, label: string, hint: string, color: string, steps: number[]): EarAnswer => ({ id, label, hint, color, steps });
const iv = (id: string, label: string, hint: string, color: string, semis: number): EarAnswer => ({ id, label, hint, color, steps: [0, semis] });

export const EAR_ANSWERS: Record<string, EarAnswer> = {
  maj: chordQ("maj", "Major", "bright, happy", "#ffe600", [0, 7, 12, 16, 19]),
  min: chordQ("min", "Minor", "dark, sad", "#b44dff", [0, 7, 12, 15, 19]),
  dom7: chordQ("dom7", "7th", "bluesy, wants to move", "#ff7a00", [0, 7, 10, 16, 19]),
  maj7: chordQ("maj7", "Major 7", "dreamy, soft", "#00e5ff", [0, 7, 11, 16, 19]),
  min7: chordQ("min7", "Minor 7", "smooth, mellow", "#ff2bd6", [0, 7, 10, 15, 19]),
  sus2: chordQ("sus2", "Sus2", "open, airy", "#7df9ff", [0, 7, 12, 14, 19]),
  sus4: chordQ("sus4", "Sus4", "hanging, wants to land", "#ccff00", [0, 7, 12, 17, 19]),
  dim: chordQ("dim", "Diminished", "tense, spooky", "#ff1f5a", [0, 6, 12, 15, 18]),
  aug: chordQ("aug", "Augmented", "floating, strange", "#ff8cf0", [0, 8, 12, 16, 20]),
  m7b5: chordQ("m7b5", "Half-dim", "dark and restless", "#b44dff", [0, 6, 10, 15, 18]),
  dim7: chordQ("dim7", "Dim 7", "horror-movie tension", "#ff1f5a", [0, 6, 9, 15, 18]),
  six: chordQ("six", "6th", "sweet, old-time", "#ffb300", [0, 4, 9, 12, 16]),
  dom9: chordQ("dom9", "9th", "funky", "#ff7a00", [0, 4, 10, 14, 19]),
  maj9: chordQ("maj9", "Major 9", "lush", "#00e5ff", [0, 4, 11, 14, 19]),
  min9: chordQ("min9", "Minor 9", "soulful", "#ff2bd6", [0, 3, 10, 14, 19]),
  dom13: chordQ("dom13", "13th", "big-band shine", "#39ff14", [0, 4, 10, 14, 21]),
  s9: chordQ("s9", "7#9", "Hendrix grit", "#ff4d8d", [0, 4, 10, 15, 19]),
  m2: iv("m2", "Minor 2nd", "Jaws", "#ff1f5a", 1),
  M2: iv("M2", "Major 2nd", "Happy Birthday", "#ff7a00", 2),
  m3: iv("m3", "Minor 3rd", "Smoke on the Water", "#b44dff", 3),
  M3: iv("M3", "Major 3rd", "When the Saints", "#ffe600", 4),
  P4: iv("P4", "4th", "Here Comes the Bride", "#00ffa3", 5),
  TT: iv("TT", "Tritone", "The Simpsons", "#ff4d8d", 6),
  P5: iv("P5", "5th", "Star Wars", "#39ff14", 7),
  m6: iv("m6", "Minor 6th", "The Entertainer", "#ff8cf0", 8),
  M6: iv("M6", "Major 6th", "My Bonnie", "#18c8ff", 9),
  m7: iv("m7", "Minor 7th", "Star Trek theme", "#ccff00", 10),
  M7: iv("M7", "Major 7th", "Take On Me", "#7df9ff", 11),
  P8: iv("P8", "Octave", "Somewhere Over the Rainbow", "#00e5ff", 12),
};

export type EarMode = "chord" | "interval";
export interface EarLevel {
  id: string;
  name: string;
  kind: EarMode;
  answers: string[];
  /** Intervals: some are played high-to-low. */
  down: boolean;
}

const ALL_IV = ["m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"];
const EAR_TABLE: Record<EarMode, Record<Tier, { name: string; answers: string[]; down?: boolean }>> = {
  chord: {
    beginner: { name: "Major or Minor", answers: ["maj", "min"] },
    intermediate: { name: "7th Chords", answers: ["maj", "min", "dom7", "maj7", "min7"] },
    advanced: { name: "Chord Colours", answers: ["maj", "min", "dom7", "maj7", "min7", "sus2", "sus4", "dim", "aug", "m7b5"] },
    expert: { name: "Jazz Colours", answers: ["dom7", "maj7", "min7", "m7b5", "dim7", "six", "dom9", "maj9", "min9", "dom13", "s9"] },
  },
  interval: {
    beginner: { name: "3rd, 5th, Octave", answers: ["M3", "P5", "P8"] },
    intermediate: { name: "Intervals", answers: ["M2", "m3", "M3", "P4", "P5", "P8"] },
    advanced: { name: "All Intervals", answers: ALL_IV },
    expert: { name: "Up and Down", answers: ALL_IV, down: true },
  },
};

export function earLevel(kind: EarMode, tier: Tier, extra: string[] = []): EarLevel {
  const t = EAR_TABLE[kind][tier];
  return { id: `${kind}:${tier}`, name: t.name, kind, answers: [...t.answers, ...extra.filter((e) => !t.answers.includes(e))], down: !!t.down };
}

/** The player's saved chord types at a tier as extra ear-trainer answers (duplicates of built-in answers left out). */
export function savedEarAnswers(favs: readonly Favorite[], tier: Tier, builtIn: readonly string[]): Record<string, EarAnswer> {
  const sig = (steps: number[]) => [...new Set(steps.map((x) => ((x % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
  const seen = new Set(builtIn.map((id) => sig(EAR_ANSWERS[id]!.steps)));
  const colors = ["#ffe600", "#00ffa3", "#ff8cf0", "#7df9ff", "#ccff00", "#ffb300"];
  const out: Record<string, EarAnswer> = {};
  for (const f of favs) {
    if (f.mode !== "chord" || favoriteTier(f) !== tier || f.degrees.length < 3) continue;
    const steps = f.degrees.map((d) => degreeToSemitones(d)).sort((a, b) => a - b);
    const k = sig(steps);
    if (seen.has(k)) continue;
    seen.add(k);
    const def = chordDefFor(f.degrees);
    const label = def ? def.suffix || "Major" : savedChordName(f);
    const id = `my:${f.id}`;
    out[id] = { id, label, hint: "one of your saved chords", color: colors[Object.keys(out).length % colors.length]!, steps: steps.map((x) => x - steps[0]!) };
  }
  return out;
}

/** Questions in a round. */
export const EAR_ROUND = 10;
/** Right answers in a round that say you're ready for the next tier. */
export const EAR_READY = 8;

export interface EarQuestion {
  answer: string;
  /** The notes to play (MIDI), in order. */
  midis: number[];
  /** Intervals: played high-to-low. */
  down: boolean;
}

/** A question: a random answer from the level (never three of the same in a row) on a random root. */
export function earQuestion(level: EarLevel, recent: readonly string[], rand: () => number = Math.random, answers: Record<string, EarAnswer> = EAR_ANSWERS): EarQuestion {
  const pool = level.answers.filter((a) => answers[a]);
  const pick = () => pool[Math.floor(rand() * pool.length) % pool.length]!;
  let answer = pick();
  const twice = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2] ? recent[recent.length - 1] : null;
  for (let i = 0; i < 6 && (answer === twice || (answer === recent[recent.length - 1] && rand() < 0.4)); i++) answer = pick();
  if (answer === twice) answer = pool.find((a) => a !== twice) ?? answer;
  const a = answers[answer]!;
  if (level.kind === "chord") {
    // Root between A2 and G#3: a guitar-sized chord.
    const root = 45 + Math.floor(rand() * 12);
    return { answer, midis: a.steps.map((s) => root + s), down: false };
  }
  const down = level.down && rand() < 0.5;
  const low = 52 + Math.floor(rand() * 10); // E3..C#4 — clear on every sound
  const pair = [low, low + a.steps[1]!];
  return { answer, midis: down ? pair.reverse() : pair, down };
}

/** Points for a right answer: 100, ×1.1 for every answer in the streak before it (up to ×2). */
export const earPoints = (streak: number) => Math.round(100 * (1 + Math.min(10, streak) * 0.1));
