import type { Tuning } from "./fretboard";

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
    v.span * 1.2 + v.minFret * 0.15 - v.sounding * 0.8 + v.omitted.length * 1.5;
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

  // Finger count: notes at the lowest fret can be barred.
  const atMin = fretted.filter((f) => f === minFret).length;
  const fingers = atMin >= 2 ? fretted.length - atMin + 1 : fretted.length;
  if (fingers > 4) return null;

  return {
    shape: [...cur],
    bassPc,
    minFret,
    span,
    sounding: sounding.length,
    omitted: [...set].filter((p) => !present.has(p)),
  };
}

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
    const det = identify(root, rel);
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
