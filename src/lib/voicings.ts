import type { Tuning } from "./fretboard";
import {
  ROOTS,
  chromaticName,
  degreeToSemitones,
  identify,
  preferFlatsFor,
  type Degree,
} from "./theory";

/** One playable shape: fret per string (low string first), null = muted. */
export type Shape = (number | null)[];

export interface Voicing {
  shape: Shape;
  bassPc: number;
  minFret: number;
  span: number;
  sounding: number;
  /** Pitch classes of the set that the shape leaves out. */
  omitted: number[];
  /**
   * Probably not playable: the lowest-fret notes would need a barre that also lies across an open
   * or muted string (or the fingers can't be placed). Still shown on Explore so the player can judge
   * it; never used where the app asks someone to play a chord (games, recordings).
   */
  doubtful: boolean;
}

export interface VoicingOptions {
  tuning: Tuning;
  rootPc: number;
  /** Absolute pitch classes of the user's set. */
  pcs: number[];
  fretFrom: number;
  fretTo: number;
  /** "root" = lowest note must be the root; "any" = inversions / slash bass allowed. */
  bass: "root" | "any";
  /** Max fret stretch between lowest and highest fretted (non-open) note. */
  maxSpan: number;
  limit?: number;
}

/**
 * Search the neck for playable shapes containing the user's notes.
 * Pure analysis: it only finds where the user's chosen notes can be fingered.
 */
export function findVoicings(o: VoicingOptions): Voicing[] {
  const n = o.tuning.strings.length;
  const set = new Set(o.pcs.map((p) => ((p % 12) + 12) % 12));
  const pcs = [...set];
  if (pcs.length === 0 || pcs.length > n) return [];
  const fifth = (o.rootPc + 7) % 12;
  // Notes that must be present. Fifth is optional for 5+ note sets.
  const required = pcs.filter((p) => !(pcs.length >= 5 && p === fifth && set.size > 4));
  const results = new Map<string, Voicing>();
  const openOk = o.fretFrom === 0;
  const startMin = Math.max(1, o.fretFrom);

  for (let w = startMin; w <= Math.max(startMin, o.fretTo - 1); w++) {
    const options: (number | null)[][] = [];
    for (let s = 0; s < n; s++) {
      const os = o.tuning.strings[s]!;
      const opts: (number | null)[] = [null];
      if (openOk && set.has(os.pc % 12)) opts.push(0);
      for (let f = w; f <= Math.min(o.fretTo, w + o.maxSpan); f++) {
        if (set.has((os.pc + f) % 12)) opts.push(f);
      }
      options.push(opts);
    }
    const cur: (number | null)[] = new Array(n).fill(null);
    const dfs = (s: number) => {
      if (s === n) {
        const v = evaluate(cur, o, set, required);
        if (v) {
          const key = v.shape.map((x) => (x === null ? "x" : x)).join(",");
          if (!results.has(key)) results.set(key, v);
        }
        return;
      }
      for (const f of options[s]!) {
        cur[s] = f;
        dfs(s + 1);
      }
      cur[s] = null;
    };
    dfs(0);
  }

  const score = (v: Voicing) =>
    v.span * 1.2 + v.minFret * 0.15 - v.sounding * 0.8 + v.omitted.length * 1.5 + (v.doubtful ? 100 : 0);
  return [...results.values()].sort((a, b) => score(a) - score(b)).slice(0, o.limit ?? 40);
}

function evaluate(
  cur: (number | null)[],
  o: VoicingOptions,
  set: Set<number>,
  required: number[],
): Voicing | null {
  const sounding = cur.map((f, i) => (f === null ? -1 : i)).filter((i) => i >= 0);
  if (sounding.length < Math.min(3, set.size)) return null;
  const lo = sounding[0]!;
  const hi = sounding[sounding.length - 1]!;
  let internalMutes = 0;
  for (let i = lo; i <= hi; i++) if (cur[i] === null) internalMutes++;
  if (internalMutes > 1) return null;

  const present = new Set<number>();
  const fretted: number[] = [];
  for (const i of sounding) {
    const f = cur[i]!;
    present.add((o.tuning.strings[i]!.pc + f) % 12);
    if (f > 0) fretted.push(f);
  }
  for (const r of required) if (!present.has(r)) return null;

  const bassPc = (o.tuning.strings[lo]!.pc + cur[lo]!) % 12;
  if (o.bass === "root" && bassPc !== o.rootPc) return null;

  const minFret = fretted.length ? Math.min(...fretted) : 0;
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const span = fretted.length ? maxFret - minFret : 0;
  if (span > o.maxSpan) return null;

  // Lenient count (notes on the lowest fret as one barre); the strict check only flags.
  const atMin = fretted.filter((f) => f === minFret).length;
  if ((atMin >= 2 ? fretted.length - atMin + 1 : fretted.length) > 4) return null;

  return {
    shape: [...cur],
    bassPc,
    minFret,
    span,
    sounding: sounding.length,
    omitted: [...set].filter((p) => !present.has(p)),
    doubtful: fingersNeeded(cur) > 4,
  };
}

/**
 * How many fretting fingers a shape needs (Infinity when a hand can't hold it). The fingers are
 * placed in order — index on the lowest fret, pinky on the highest — and one finger may lie across
 * several strings at the same fret (a barre) only if every string under it is pressed at that fret
 * or higher: a barre presses all of them, so it can't leave an open or muted string in the middle
 * (an F barre can't let the B string ring open). Two separate fingers on the lowest fret that are
 * far apart, with other fingers pressing strings between them, can't both reach — that needs a barre.
 */
export function fingersNeeded(shape: readonly (number | null)[]): number {
  const notes = shape
    .map((f, i) => ({ f, i }))
    .filter((x): x is { f: number; i: number } => x.f !== null && x.f > 0)
    .sort((a, b) => a.f - b.f || a.i - b.i);
  if (!notes.length) return 0;
  const minFret = notes[0]!.f;
  const barreOk = (fret: number, lo: number, hi: number) => {
    for (let s = lo; s <= hi; s++) {
      const f = shape[s];
      if (f === null || f === undefined || f < fret || f === 0) return false;
    }
    return true;
  };
  // finger -> { fret, strings }
  const used: { fret: number; lo: number; hi: number }[] = [];
  let best = Infinity;
  const place = (k: number) => {
    if (used.length >= best) return;
    if (k === notes.length) {
      best = used.length;
      return;
    }
    const n = notes[k]!;
    const last = used[used.length - 1];
    // Same finger as the last note: a barre at the same fret.
    if (last && last.fret === n.f) {
      const lo = Math.min(last.lo, n.i), hi = Math.max(last.hi, n.i);
      if (barreOk(n.f, lo, hi)) {
        const prev = { ...last };
        last.lo = lo;
        last.hi = hi;
        place(k + 1);
        Object.assign(last, prev);
      }
    }
    // The next finger.
    if (used.length < 4) {
      // Two separate fingers on the lowest fret, far apart with other fingers pressing strings in
      // between them, can't both reach — that takes a barre.
      const between = (a: number, b: number) => notes.some((m) => m.f > minFret && m.i > Math.min(a, b) && m.i < Math.max(a, b));
      const clash = n.f === minFret && used.some((u) => {
        if (u.fret !== n.f) return false;
        const near = Math.abs(u.lo - n.i) < Math.abs(u.hi - n.i) ? u.lo : u.hi;
        return Math.abs(near - n.i) > 2 && between(near, n.i);
      });
      if (!clash) {
        used.push({ fret: n.f, lo: n.i, hi: n.i });
        place(k + 1);
        used.pop();
      }
    }
  };
  place(0);
  return best;
}

/** A shape that can't be held with four fingers (and an optional barre). */
export const isImpossibleShape = (shape: readonly (number | null)[]) => fingersNeeded(shape) > 4;

export function shapeToTab(shape: Shape): string {
  const wide = shape.some((f) => f !== null && f > 9);
  return shape.map((f) => (f === null ? "x" : String(f))).join(wide ? "-" : "");
}

export function shapeMidis(shape: Shape, tuning: Tuning): number[] {
  const out: number[] = [];
  shape.forEach((f, i) => {
    const os = tuning.strings[i];
    if (os && f !== null) out.push(os.pc + (os.octave + 1) * 12 + f);
  });
  return out;
}

/** Analyse a user-marked shape (fret per string, null = not played). Never suggests anything. */
export function analyzeShape(shape: (number | null)[], tuning: Tuning) {
  const played = shape
    .map((f, si) => (f === null || f === undefined ? null : { si, f, midi: tuning.strings[si]!.pc + (tuning.strings[si]!.octave + 1) * 12 + f }))
    .filter((x): x is { si: number; f: number; midi: number } => !!x)
    .sort((a, b) => a.midi - b.midi);
  if (!played.length) return null;
  const pcsAbs = [...new Set(played.map((p) => p.midi % 12))];
  const bassPc = played[0]!.midi % 12;
  const NAMES: Degree[] = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  const readFor = (rootPc: number) => {
    const root = ROOTS.find((r) => r.pc === rootPc)!;
    const rel = pcsAbs.map((p) => (p - rootPc + 12) % 12);
    const det = identify(root, rel, "chord");
    const degrees: Degree[] =
      det.known?.kind === "chord"
        ? det.known.def.degrees.filter((d) => rel.includes(((degreeToSemitones(d) % 12) + 12) % 12))
        : [...rel].sort((a, b) => a - b).map((p) => NAMES[p]!);
    return { root, det, degrees };
  };
  // Bass note as root first; other marked notes give alternative (slash) readings.
  const primary = readFor(bassPc);
  const alternatives = pcsAbs
    .filter((p) => p !== bassPc)
    .map(readFor)
    .filter((r) => r.det.known?.kind === "chord");
  const bassName = primary.root.name;
  return {
    played,
    bassName,
    primary,
    alternatives,
    notes: played.map((p) => chromaticName(p.midi % 12, preferFlatsFor(primary.root))),
    midis: played.map((p) => p.midi),
  };
}
