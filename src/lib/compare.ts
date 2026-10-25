/**
 * Compare two chords, scales or arpeggios: which notes they share, which belong to only one, how
 * their formulas differ, how they relate, and (for chords and arpeggios) the smallest finger moves
 * that turn one into the other.
 */
import { ARPEGGIO_VARIANTS, CHORDS, INTERVAL_LONG, ROOTS, SCALES, bestRootFor, degreeToSemitones, parseDegree, spellDegree, type ChordDef, type Degree, type Root, type ScaleDef } from "./theory";

export type CompareKind = "chord" | "scale" | "arpeggio";

export interface CompareItem {
  kind: CompareKind;
  /** Root pitch class 0-11. */
  rootPc: number;
  /** Chord id (chords and arpeggios) or scale id. */
  id: string;
}

export interface Resolved {
  item: CompareItem;
  root: Root;
  def: ChordDef | ScaleDef;
  degrees: Degree[];
  /** Pitch class → degree label. */
  byPc: Map<number, Degree>;
  /** Spelled note names in degree order. */
  notes: string[];
  name: string;
}

const pc12 = (n: number) => ((n % 12) + 12) % 12;

export function resolve(item: CompareItem): Resolved | null {
  const def = item.kind === "scale" ? SCALES.find((s) => s.id === item.id) : CHORDS.find((c) => c.id === item.id);
  if (!def) return null;
  const degrees = item.kind === "arpeggio" ? ARPEGGIO_VARIANTS[0]!.transform(def.degrees) : def.degrees;
  const root = bestRootFor(item.rootPc, degrees);
  const byPc = new Map<number, Degree>();
  for (const d of degrees) {
    const pc = pc12(item.rootPc + degreeToSemitones(d));
    if (!byPc.has(pc)) byPc.set(pc, d);
  }
  const label = item.kind === "scale" ? `${root.name} ${def.name}` : `${root.name}${(def as ChordDef).suffix}${item.kind === "arpeggio" ? " arpeggio" : ""}`;
  return { item, root, def, degrees, byPc, notes: degrees.map((d) => spellDegree(root, d)), name: label };
}

export interface Move {
  from: string;
  to: string;
  /** Semitones (+ up, − down, 0 = stays). */
  by: number;
}

export interface Comparison {
  shared: { pc: number; a: string; b: string; degA: Degree; degB: Degree }[];
  onlyA: { pc: number; name: string; deg: Degree }[];
  onlyB: { pc: number; name: string; deg: Degree }[];
  /** Degree-by-degree changes when both share a root, e.g. "3 → b3". */
  formula: { label: string; a: string; b: string; text: string }[];
  /** The headline differences in plain words. */
  summary: string[];
  /** Smallest moves from A's notes to B's (chords and arpeggios). */
  moves: Move[] | null;
  /** B's notes named as degrees of A's root ("over A's root"). */
  bOverA: Degree[];
}

const NUM_NAME: Record<number, string> = { 1: "root", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 9: "9th", 11: "11th", 13: "13th" };
const DEG_FROM_SEMI = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

function quality(d: Degree): string {
  const { number, alter } = parseDegree(d);
  if (alter === 0) return [4, 5, 1, 11].includes(number) ? "perfect" : "major";
  if (alter === -1) return [4, 5, 11].includes(number) ? "diminished" : "minor";
  if (alter === 1) return "augmented";
  return alter === -2 ? "double-flat" : "double-sharp";
}
const simple = (n: number) => (n > 7 ? ((n - 1) % 7) + 1 : n);

/** The smallest total movement that turns note set A into B (each note moves to one target). */
function voiceLead(a: number[], b: number[]): { from: number; to: number }[] {
  const dist = (x: number, y: number) => {
    const d = pc12(y - x);
    return d > 6 ? d - 12 : d;
  };
  const n = Math.max(a.length, b.length);
  if (n > 7) return a.map((x) => ({ from: x, to: b.reduce((best, y) => (Math.abs(dist(x, y)) < Math.abs(dist(x, best)) ? y : best), b[0]!) }));
  // Pair every A note with a B note (repeat notes of the smaller set), minimising total motion.
  const A = a.length >= b.length ? a : b;
  const B = a.length >= b.length ? b : a;
  let best: number[] | null = null;
  let bestCost = Infinity;
  const pick: number[] = [];
  const used = new Map<number, number>();
  const go = (i: number, cost: number) => {
    if (cost >= bestCost) return;
    if (i === A.length) {
      // Every note of the smaller set must be reached at least once.
      if (B.every((_, k) => (used.get(k) ?? 0) > 0)) {
        bestCost = cost;
        best = [...pick];
      }
      return;
    }
    for (let k = 0; k < B.length; k++) {
      pick[i] = k;
      used.set(k, (used.get(k) ?? 0) + 1);
      go(i + 1, cost + Math.abs(dist(A[i]!, B[k]!)) + ((used.get(k) ?? 0) > 1 ? 0.5 : 0));
      used.set(k, used.get(k)! - 1);
    }
  };
  go(0, 0);
  const res = (best ?? []) as number[];
  return A.map((x, i) => (a.length >= b.length ? { from: x, to: B[res[i]!]! } : { from: B[res[i]!]!, to: x }));
}

export function compare(A: Resolved, B: Resolved): Comparison {
  const pcsA = [...A.byPc.keys()];
  const pcsB = [...B.byPc.keys()];
  const shared = pcsA.filter((p) => B.byPc.has(p)).map((pc) => ({ pc, a: spellDegree(A.root, A.byPc.get(pc)!), b: spellDegree(B.root, B.byPc.get(pc)!), degA: A.byPc.get(pc)!, degB: B.byPc.get(pc)! }));
  const onlyA = pcsA.filter((p) => !B.byPc.has(p)).map((pc) => ({ pc, name: spellDegree(A.root, A.byPc.get(pc)!), deg: A.byPc.get(pc)! }));
  const onlyB = pcsB.filter((p) => !A.byPc.has(p)).map((pc) => ({ pc, name: spellDegree(B.root, B.byPc.get(pc)!), deg: B.byPc.get(pc)! }));
  const bOverA = pcsB.map((p) => DEG_FROM_SEMI[pc12(p - A.item.rootPc)]!);

  // Formula changes, matched by degree number (3 ↔ b3, 7 ↔ b7, 5 ↔ #5 …).
  const formula: Comparison["formula"] = [];
  const sameRoot = A.item.rootPc === B.item.rootPc;
  if (sameRoot) {
    const byNum = (r: Resolved) => {
      const m = new Map<number, Degree>();
      for (const d of r.degrees) {
        const n = simple(parseDegree(d).number);
        if (!m.has(n)) m.set(n, d);
      }
      return m;
    };
    const na = byNum(A);
    const nb = byNum(B);
    for (const n of [...new Set([...na.keys(), ...nb.keys()])].sort((x, y) => x - y)) {
      const a = na.get(n);
      const b = nb.get(n);
      if (a && b && pc12(degreeToSemitones(a)) === pc12(degreeToSemitones(b))) continue;
      const name = NUM_NAME[n] ?? `${n}th`;
      if (a && b) {
        const diff = pc12(degreeToSemitones(b)) - pc12(degreeToSemitones(a));
        const dir = diff > 0 ? "raised" : "lowered";
        formula.push({ label: name, a, b, text: `${quality(a)} ${name} → ${quality(b)} ${name} (${dir} a ${Math.abs(diff) === 1 ? "half step" : Math.abs(diff) === 2 ? "whole step" : `${Math.abs(diff)} half steps`})` });
      } else if (a) formula.push({ label: name, a, b: "—", text: `the ${a} is only in A` });
      else if (b) formula.push({ label: name, a: "—", b: b!, text: `B adds the ${b}` });
    }
  }

  const summary: string[] = [];
  const setEq = pcsA.length === pcsB.length && pcsA.every((p) => B.byPc.has(p));
  const aInB = pcsA.every((p) => B.byPc.has(p));
  const bInA = pcsB.every((p) => A.byPc.has(p));
  if (setEq && sameRoot) summary.push("Exactly the same notes — two names for one sound.");
  else if (setEq) summary.push(`Exactly the same notes with a different home note: ${B.root.name} is the centre of B, ${A.root.name} of A — like relative major and minor.`);
  else if (bInA) summary.push(`Every note of B is inside A — B fits over A (A has ${onlyA.length} extra: ${onlyA.map((x) => x.name).join(" ")}).`);
  else if (aInB) summary.push(`Every note of A is inside B — A fits over B (B has ${onlyB.length} extra: ${onlyB.map((x) => x.name).join(" ")}).`);
  else summary.push(`${shared.length} note${shared.length === 1 ? "" : "s"} in common; ${onlyA.length} only in A, ${onlyB.length} only in B.`);
  if (!sameRoot) {
    const iv = pc12(B.item.rootPc - A.item.rootPc);
    summary.push(`B's root ${B.root.name} is a ${INTERVAL_LONG[iv]} above A's root ${A.root.name}${iv > 6 ? ` (a ${INTERVAL_LONG[12 - iv]} below)` : ""}.`);
  }
  if (formula.length) summary.push(`Formula: ${formula.slice(0, 3).map((f) => f.text).join("; ")}${formula.length > 3 ? "; …" : ""}.`);
  const third = (r: Resolved) => r.degrees.find((d) => simple(parseDegree(d).number) === 3);
  const ta = third(A);
  const tb = third(B);
  if (ta && tb && ta !== tb && !sameRoot) summary.push(`A is ${ta === "b3" ? "minor" : "major"}-sounding, B is ${tb === "b3" ? "minor" : "major"}-sounding.`);
  if (A.degrees.length !== B.degrees.length) summary.push(`A has ${A.degrees.length} notes, B has ${B.degrees.length}.`);

  let moves: Move[] | null = null;
  if (A.item.kind !== "scale" && B.item.kind !== "scale") {
    const vl = voiceLead(pcsA, pcsB);
    moves = vl.map(({ from, to }) => {
      const d = pc12(to - from);
      return { from: A.byPc.has(from) ? spellDegree(A.root, A.byPc.get(from)!) : "", to: B.byPc.has(to) ? spellDegree(B.root, B.byPc.get(to)!) : "", by: d > 6 ? d - 12 : d };
    });
    const moving = moves.filter((m) => m.by !== 0);
    summary.push(moving.length ? `To change from A to B: ${moving.map((m) => `${m.from} ${m.by > 0 ? "up" : "down"} ${Math.abs(m.by) === 1 ? "a half step" : Math.abs(m.by) === 2 ? "a whole step" : `${Math.abs(m.by)} half steps`} to ${m.to}`).join(", ")}${moves.length - moving.length ? `; ${moves.length - moving.length} stay put` : ""}.` : "No note needs to move.");
  }
  return { shared, onlyA, onlyB, formula, summary, moves, bOverA };
}

/** Pitch classes on the neck for an item. */
export const itemPcs = (r: Resolved) => [...r.byPc.keys()];

/** Handy starting pairs. */
export const COMPARE_PRESETS: { label: string; a: CompareItem; b: CompareItem }[] = [
  { label: "C vs Cm", a: { kind: "chord", rootPc: 0, id: "maj" }, b: { kind: "chord", rootPc: 0, id: "min" } },
  { label: "Cmaj7 vs C7", a: { kind: "chord", rootPc: 0, id: "maj7" }, b: { kind: "chord", rootPc: 0, id: "7" } },
  { label: "G vs Em", a: { kind: "chord", rootPc: 7, id: "maj" }, b: { kind: "chord", rootPc: 4, id: "min" } },
  { label: "A minor pent vs A blues", a: { kind: "scale", rootPc: 9, id: "minor-pentatonic" }, b: { kind: "scale", rootPc: 9, id: "blues" } },
  { label: "A minor pent vs A natural minor", a: { kind: "scale", rootPc: 9, id: "minor-pentatonic" }, b: { kind: "scale", rootPc: 9, id: "aeolian" } },
  { label: "C major vs A minor", a: { kind: "scale", rootPc: 0, id: "ionian" }, b: { kind: "scale", rootPc: 9, id: "aeolian" } },
  { label: "Dorian vs Aeolian", a: { kind: "scale", rootPc: 2, id: "dorian" }, b: { kind: "scale", rootPc: 2, id: "aeolian" } },
  { label: "Am7 vs Cmaj7 arpeggio", a: { kind: "arpeggio", rootPc: 9, id: "m7" }, b: { kind: "arpeggio", rootPc: 0, id: "maj7" } },
  { label: "G7 vs Cmaj7 (V→I)", a: { kind: "chord", rootPc: 7, id: "7" }, b: { kind: "chord", rootPc: 0, id: "maj7" } },
];

export const ROOT_CHOICES = ROOTS.filter((r) => ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].includes(r.name));
