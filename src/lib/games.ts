/**
 * Games played with the real guitar: the microphone listens, Listen's judging decides whether a
 * strum was the chord asked for. Pure rules here (tested); the screens are in components/games.
 */
import type { StrumReport, TargetChord } from "./listen/score";

export interface GameChord {
  label: string;
  target: TargetChord;
  /** Common open/barre shape, low E string first, shown as a hint. */
  tab: string;
}

const ch = (label: string, rootName: string, degrees: TargetChord["degrees"], tab: string): GameChord => ({ label, target: { rootName, degrees, label }, tab });
const MAJ = ["1", "3", "5"] as TargetChord["degrees"], MIN = ["1", "b3", "5"] as TargetChord["degrees"], DOM7 = ["1", "3", "5", "b7"] as TargetChord["degrees"];

export const CHORDS: Record<string, GameChord> = {
  G: ch("G", "G", MAJ, "320003"),
  C: ch("C", "C", MAJ, "x32010"),
  D: ch("D", "D", MAJ, "xx0232"),
  Em: ch("Em", "E", MIN, "022000"),
  Am: ch("Am", "A", MIN, "x02210"),
  E: ch("E", "E", MAJ, "022100"),
  A: ch("A", "A", MAJ, "x02220"),
  Dm: ch("Dm", "D", MIN, "xx0231"),
  G7: ch("G7", "G", DOM7, "320001"),
  A7: ch("A7", "A", DOM7, "x02020"),
  F: ch("F", "F", MAJ, "133211"),
  Bm: ch("Bm", "B", MIN, "x24432"),
  B7: ch("B7", "B", DOM7, "x21202"),
  Cmaj7: ch("Cmaj7", "C", ["1", "3", "5", "7"] as TargetChord["degrees"], "x32000"),
};

export const RUSH_LEVELS = [
  { id: "starter", name: "Starter", chords: ["G", "C", "D", "Em", "Am"], fallStart: 7, fallMin: 3.2 },
  { id: "rising", name: "Rising", chords: ["G", "C", "D", "Em", "Am", "E", "A", "Dm", "G7", "A7"], fallStart: 6, fallMin: 2.6 },
  { id: "pro", name: "Pro", chords: ["G", "C", "D", "Em", "Am", "E", "A", "Dm", "F", "Bm", "B7", "Cmaj7"], fallStart: 5, fallMin: 2.2 },
] as const;
export type RushLevel = (typeof RUSH_LEVELS)[number];

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

export const CHANGE_PAIRS: [string, string][] = [
  ["G", "C"], ["C", "D"], ["G", "D"], ["Em", "Am"], ["Am", "C"], ["D", "A"], ["G", "Em"], ["E", "A"], ["Am", "Dm"], ["C", "F"],
];
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
