import type { Tuning } from "./fretboard";
import KNOWN from "./known-chords.json";
import {
  pretty,
  ROOTS,
  bestRootFor,
  chromaticName,
  degreeToSemitones,
  identify,
  preferFlatsFor,
  spellDegree,
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
  /** Keep shapes that need more than four fingers (they come back flagged `doubtful`). */
  allowExtraFingers?: boolean;
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
  if (!o.allowExtraFingers && (atMin >= 2 ? fretted.length - atMin + 1 : fretted.length) > 4) return null;

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
 * Which inversion a chord is in, from the degree in its bass: the 3rd (or b3) = 1st inversion,
 * the 5th = 2nd, the 7th = 3rd; any other note (a 9, 11, sus 4…) is named as "the 9 in the bass".
 */
export function inversionName(bassDegree: string): { name: string; short: string } {
  const num = Number(bassDegree.replace(/[^0-9]/g, ""));
  if (num === 1) return { name: "Root position", short: "root position" };
  const ord = num === 3 ? 1 : num === 5 ? 2 : num === 7 ? 3 : 0;
  const what = num === 3 ? "3rd" : num === 5 ? "5th" : num === 7 ? "7th" : bassDegree;
  if (ord) {
    const o = ["", "1st", "2nd", "3rd"][ord]!;
    return { name: `${o} inversion — the ${what} in the bass`, short: `${o} inversion` };
  }
  return { name: `The ${bassDegree} in the bass (slash chord)`, short: `${bassDegree} in the bass` };
}

/**
 * How the note order changes: the degrees low to high, and a sentence comparing it with root
 * position (where the 1 is lowest and the rest stack above it).
 */
export function inversionOrder(lowToHigh: string[]): string {
  const first: string[] = [];
  for (const d of lowToHigh) if (!first.includes(d)) first.push(d);
  const bass = first[0];
  if (!bass) return "";
  if (bass === "1") return `Root position: the 1 is the lowest note, the other notes stack above it (${first.join("–")}).`;
  const below = first.slice(0, first.indexOf("1") < 0 ? first.length : first.indexOf("1"));
  const rootPart = first.includes("1") ? ` The 1 has moved up above ${below.length > 1 ? `the ${below.slice(0, -1).join(", ")} and ${below[below.length - 1]}` : `the ${bass}`}.` : " The 1 isn't played.";
  return `The ${bass} is now the lowest note instead of the 1 (order low → high ${first.join("–")}).${rootPart}`;
}

/**
 * How a shape rates for a human hand:
 * known = a shape printed in chord books (the standard ways people actually play it);
 * easy = four fingers (a barre counts as one) inside four frets, no muted string in the middle;
 * stretch = hard: a five-fret reach, a four-fret reach down by the nut, or a muted string in the
 * middle that another finger has to deaden; impossible = more than four fingers, a barre across
 * an open or muted string, or a reach of six frets or more.
 */
export type VoicingLevel = "known" | "easy" | "stretch" | "impossible";

export const LEVEL_NAME: Record<VoicingLevel, string> = { known: "Chord-book shape", easy: "Playable", stretch: "Hard / stretch", impossible: "Impossible" };

const gapsIn = (shape: readonly (number | null)[]) => {
  const played = shape.map((f, i) => (f === null ? -1 : i)).filter((i) => i >= 0);
  let gaps = 0;
  if (played.length) for (let i = played[0]!; i <= played[played.length - 1]!; i++) if (shape[i] === null) gaps++;
  return gaps;
};

/** Why a shape is hard or impossible (empty when it's comfortable). */
export function hardReason(v: Pick<Voicing, "shape" | "span" | "minFret" | "doubtful">): string {
  if (v.doubtful) return fingersNeeded(v.shape) === Infinity || fingering(v.shape).count > 4 ? "needs more than 4 fingers or a barre over an open or muted string" : "a barre would lie over an open or muted string";
  if (v.span >= 5) return `${v.span + 1}-fret reach`;
  if (v.span === 4) return "5-fret reach";
  if (v.span === 3 && v.minFret > 0 && v.minFret <= 3) return "4-fret reach down by the nut, where frets are widest";
  if (gapsIn(v.shape)) return "a muted string in the middle — another finger has to deaden it";
  const fg = fingering(v.shape);
  const second = fg.barres.find((b) => b.finger >= 2);
  if (second && fg.count >= 4) return `needs a second barre with the ${FINGER_NAME[second.finger] ?? "pinky"} as well as three other fingers`;
  // Two fingers on the same fret far apart, with lower notes fretted between them.
  const byFret = new Map<number, number[]>();
  v.shape.forEach((f, i) => {
    if (f !== null && f > v.minFret && fg.fingers[i] !== null) byFret.set(f, [...(byFret.get(f) ?? []), i]);
  });
  for (const [f, ss] of byFret) {
    const lo = Math.min(...ss), hi = Math.max(...ss);
    const fingersHere = new Set(ss.map((i) => fg.fingers[i]));
    if (fingersHere.size > 1 && hi - lo >= 3 && v.shape.some((g, i) => i > lo && i < hi && g !== null && g > 0 && g < f)) return "two fingers on the same fret far apart, reaching around the others";
  }
  return "";
}

export function voicingLevel(v: Pick<Voicing, "shape" | "span" | "minFret" | "doubtful">): VoicingLevel {
  if (v.doubtful || v.span >= 5) return "impossible";
  return hardReason(v) ? "stretch" : "easy";
}

export const LEVEL_ORDER: Record<VoicingLevel, number> = { known: 0, easy: 1, stretch: 2, impossible: 3 };

/** Standard tuning (E A D G B E) — the chord-book shapes are written for it. */
const isStandard = (t: Tuning) => t.strings.map((x) => x.pc + (x.octave + 1) * 12).join() === "40,45,50,55,59,64";

/**
 * The CAGED forms: the open C, A, G, E and D chord shapes, which slide up the neck with the
 * index finger (or a barre) taking the nut's place. Written in standard tuning as open chords;
 * `root` is the open chord's root pitch class and `iv` the chord's intervals.
 */
export const CAGED_TEMPLATES: { quality: string; iv: number[]; forms: [form: string, root: number, frets: string][] }[] = [
  { quality: "major", iv: [0, 4, 7], forms: [["C", 0, "x32010"], ["A", 9, "x02220"], ["G", 7, "320003"], ["E", 4, "022100"], ["D", 2, "xx0232"]] },
  { quality: "minor", iv: [0, 3, 7], forms: [["A", 9, "x02210"], ["E", 4, "022000"], ["D", 2, "xx0231"]] },
  { quality: "7", iv: [0, 4, 7, 10], forms: [["C", 0, "x32310"], ["A", 9, "x02020"], ["G", 7, "320001"], ["E", 4, "020100"], ["D", 2, "xx0212"]] },
  { quality: "maj7", iv: [0, 4, 7, 11], forms: [["C", 0, "x32000"], ["A", 9, "x02120"], ["E", 4, "021100"], ["D", 2, "xx0222"]] },
  { quality: "m7", iv: [0, 3, 7, 10], forms: [["A", 9, "x02010"], ["E", 4, "020000"], ["D", 2, "xx0211"]] },
  { quality: "sus4", iv: [0, 5, 7], forms: [["A", 9, "x02230"], ["E", 4, "022200"], ["D", 2, "xx0233"]] },
  { quality: "sus2", iv: [0, 2, 7], forms: [["A", 9, "x02200"], ["D", 2, "xx0230"]] },
  { quality: "6", iv: [0, 4, 7, 9], forms: [["C", 0, "x32210"], ["A", 9, "x02222"], ["D", 2, "xx0202"]] },
  { quality: "m6", iv: [0, 3, 7, 9], forms: [["A", 9, "x02212"], ["D", 2, "xx0201"]] },
  { quality: "dim7", iv: [0, 3, 6, 9], forms: [["D", 2, "xx0101"]] },
];

/** CAGED shapes for a chord (its root and interval set), every place they fit on the neck. */
export function cagedShapes(rootPc: number, ivs: Set<number>, maxFret = 24): { shape: Shape; name: string }[] {
  const out: { shape: Shape; name: string }[] = [];
  for (const t of CAGED_TEMPLATES) {
    if (t.iv.length !== ivs.size || !t.iv.every((x) => ivs.has(x))) continue;
    for (const [form, r, frets] of t.forms) {
      const base = [...frets].map((c) => (c === "x" ? null : Number(c)));
      for (let n = (rootPc - r + 12) % 12; n <= maxFret; n += 12) {
        const shape = base.map((f) => (f === null ? null : f + n));
        if (shape.some((f) => f !== null && f > maxFret)) continue;
        out.push({ shape, name: n === 0 ? `open ${form} shape (CAGED)` : `${form} shape (CAGED), slid up ${n}` });
      }
    }
  }
  return out;
}

/** Book shapes for a root: frets and the book's fingering. */
const BOOK: { rootPc: number; shape: Shape; fingers: (number | null)[]; name: string }[] = (KNOWN.shapes as [number, string, string, string][]).map(([rootPc, fr, fg, name]) => {
  const shape = [...fr].map((c) => (c === "x" ? null : parseInt(c, 36)));
  return { rootPc, shape, fingers: [...fg].map((c, i) => (shape[i] === null ? null : Number(c))), name };
});

/**
 * A book shape belongs to the chord when it's filed under the same root, plays only notes of the
 * chord, and has every note except the ones chord books leave out: the 5th, the 9th under an 11
 * or 13, the 11th under a 13, and the 3rd under an 11.
 */
function bookFits(shape: Shape, tuning: Tuning, set: Set<number>, rootPc: number) {
  const present = new Set<number>();
  for (let i = 0; i < shape.length; i++) if (shape[i] !== null) present.add((tuning.strings[i]!.pc + shape[i]!) % 12);
  for (const p of present) if (!set.has(p)) return false;
  const rel = (iv: number) => (rootPc + iv) % 12;
  const optional = new Set([rel(7)]);
  if (set.has(rel(9)) || set.has(rel(5))) optional.add(rel(2));
  if (set.has(rel(9))) optional.add(rel(5));
  if (set.has(rel(5)) && set.has(rel(4))) optional.add(rel(4));
  for (const p of set) if (!present.has(p) && !optional.has(p)) return false;
  return present.size >= Math.min(3, set.size);
}

export type RatedVoicing = Voicing & { level: VoicingLevel; why: string; bookFingers?: (number | null)[] | undefined; bookName?: string | undefined };

/**
 * Every way to play the chord on the whole neck (or the given frets): chord-book shapes first,
 * then other playable shapes, then hard ones and stretches, then the shapes no human hand can
 * hold. Inside each group the most familiar come first.
 */
export function everyVoicing(o: Omit<VoicingOptions, "maxSpan" | "limit" | "allowExtraFingers">): RatedVoicing[] {
  const all = findVoicings({ ...o, maxSpan: 5, limit: Infinity, allowExtraFingers: true });
  const rootPc = ((o.rootPc % 12) + 12) % 12;
  const key = (sh: readonly (number | null)[]) => sh.map((x) => (x === null ? "x" : x)).join(",");
  const byKey = new Map(all.map((v) => [key(v.shape), v]));
  const rated: RatedVoicing[] = all.map((v) => {
    const why = hardReason(v);
    return { ...v, level: v.doubtful || v.span >= 5 ? "impossible" : why ? "stretch" : "easy", why };
  });
  const index = new Map(rated.map((v, i) => [key(v.shape), i]));
  if (isStandard(o.tuning)) {
    const set = new Set(o.pcs.map((p) => ((p % 12) + 12) % 12));
    for (const b of BOOK) {
      if (b.rootPc !== rootPc || !bookFits(b.shape, o.tuning, set, rootPc)) continue;
      if (b.shape.some((f) => f !== null && (f < o.fretFrom || f > o.fretTo) && f !== 0)) continue;
      const k = key(b.shape);
      const lo = b.shape.findIndex((f) => f !== null);
      const bassPc = (o.tuning.strings[lo]!.pc + b.shape[lo]!) % 12;
      if (o.bass === "root" && bassPc !== rootPc) continue;
      const at = index.get(k);
      if (at !== undefined) {
        rated[at] = { ...rated[at]!, level: "known", bookFingers: b.fingers, bookName: b.name };
        continue;
      }
      // A book shape the search didn't reach (e.g. two muted strings inside): add it.
      const fretted = b.shape.filter((f): f is number => f !== null && f > 0);
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      const present = new Set(b.shape.map((f, i) => (f === null ? -1 : (o.tuning.strings[i]!.pc + f) % 12)).filter((p) => p >= 0));
      const v: Voicing = {
        shape: [...b.shape],
        bassPc,
        minFret,
        span: fretted.length ? Math.max(...fretted) - minFret : 0,
        sounding: b.shape.filter((f) => f !== null).length,
        omitted: [...set].filter((p) => !present.has(p)),
        doubtful: fingersNeeded(b.shape) > 4,
      };
      if (!byKey.has(k)) {
        index.set(k, rated.length);
        rated.push({ ...v, level: "known", why: "", bookFingers: b.fingers, bookName: b.name });
      }
    }
  }
  // CAGED forms of the chord (standard tuning).
  if (isStandard(o.tuning)) {
    const ivs = new Set(o.pcs.map((p) => (((p - rootPc) % 12) + 12) % 12));
    for (const c of cagedShapes(rootPc, ivs, o.fretTo)) {
      const k = key(c.shape);
      const lo = c.shape.findIndex((f) => f !== null);
      const bassPc = (o.tuning.strings[lo]!.pc + c.shape[lo]!) % 12;
      if (o.bass === "root" && bassPc !== rootPc) continue;
      const at = index.get(k);
      if (at !== undefined) {
        if (rated[at]!.level !== "known") rated[at] = { ...rated[at]!, level: "known", bookName: c.name, why: "" };
        continue;
      }
      const fretted = c.shape.filter((f): f is number => f !== null && f > 0);
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      index.set(k, rated.length);
      rated.push({ shape: c.shape, bassPc, minFret, span: fretted.length ? Math.max(...fretted) - minFret : 0, sounding: c.shape.filter((f) => f !== null).length, omitted: [], doubtful: fingersNeeded(c.shape) > 4, level: "known", why: "", bookName: c.name });
    }
  }
  // The voicing systems teachers publish for every chord: close triads on three adjacent strings,
  // and drop-2 / drop-3 voicings of four-note chords — every inversion on every string set.
  for (let i = 0; i < rated.length; i++) {
    const v = rated[i]!;
    if (v.level === "known" || v.level === "impossible") continue;
    const sys = voicingSystem(v.shape, o.tuning, o.pcs.length);
    if (sys) rated[i] = { ...v, level: "known", bookName: sys, why: "" };
  }
  // Familiar shapes first: compact, full, no gaps, and open strings only down by the nut.
  const score = (v: Voicing) => {
    const top = Math.max(0, ...v.shape.map((f) => f ?? 0));
    const farOpen = v.shape.includes(0) && top > 5 ? 3 + (top - 5) * 0.3 : 0;
    const inverted = v.bassPc !== rootPc ? 2 : 0;
    // Above the 12th fret the same shapes repeat an octave up.
    const high = v.minFret > 12 ? 3 : 0;
    return high + v.span * 1.2 + v.minFret * 0.12 - v.sounding * 0.8 + v.omitted.length * 1.5 + gapsIn(v.shape) * 2.5 + farOpen + inverted;
  };
  return rated.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || score(a) - score(b));
}

/**
 * Names a shape that follows a standard voicing system: a close triad (three adjacent strings,
 * inside an octave), a drop-2 (four adjacent strings: a close chord with its second-highest note
 * dropped an octave) or a drop-3 (a close chord with its third-highest note dropped, skipping one
 * string). Returns "" for anything else.
 */
export function voicingSystem(shape: readonly (number | null)[], tuning: Tuning, setSize: number): string {
  const strings = shape.map((f, i) => (f === null ? -1 : i)).filter((i) => i >= 0);
  const midis = strings.map((i) => tuning.strings[i]!.pc + (tuning.strings[i]!.octave + 1) * 12 + shape[i]!);
  const pcs = new Set(midis.map((m) => m % 12));
  if (pcs.size !== strings.length || pcs.size !== setSize) return "";
  const sorted = [...midis].sort((a, b) => a - b);
  const close = (ms: number[]) => {
    const t = [...ms].sort((a, b) => a - b);
    return t[t.length - 1]! - t[0]! < 12;
  };
  const adjacent = strings.every((s, k) => k === 0 || s === strings[k - 1]! + 1);
  const set = `${pretty(tuning.strings[strings[0]!]!.note)}–${pretty(tuning.strings[strings[strings.length - 1]!]!.note)} strings`;
  if (setSize === 3 && adjacent && close(midis)) return `close triad, ${set}`;
  if (setSize === 4) {
    if (adjacent && close(midis)) return `close voicing, ${set}`;
    const raised = [sorted[0]! + 12, ...sorted.slice(1)];
    if (close(raised)) {
      const pos = [...raised].sort((a, b) => a - b).indexOf(sorted[0]! + 12);
      if (adjacent && pos === 2) return `drop 2, ${set}`;
      const gapOne = strings.length === 4 && strings[1] === strings[0]! + 2 && strings[2] === strings[1]! + 1 && strings[3] === strings[2]! + 1;
      if (gapOne && pos === 1) return `drop 3, ${set}`;
    }
  }
  return "";
}

/** The fingering printed in the chord book (barres where one finger covers several strings). */
export function bookFingering(shape: readonly (number | null)[], fingers: readonly (number | null)[]): Fingering {
  const fs: (number | null)[] = shape.map((f, i) => (f === null ? null : f === 0 ? 0 : (fingers[i] ?? null)));
  const barres: Fingering["barres"] = [];
  const used = new Set<number>();
  for (let k = 1; k <= 4; k++) {
    const on = fs.map((f, i) => (f === k ? i : -1)).filter((i) => i >= 0);
    if (on.length) used.add(k);
    if (on.length > 1) barres.push({ finger: k, fret: shape[on[0]!]!, from: on[0]!, to: on[on.length - 1]! });
  }
  return { fingers: fs, barres, count: used.size };
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

/** Which finger presses each string: 1 index, 2 middle, 3 ring, 4 pinky (5+ = a finger you don't have). */
export interface Fingering {
  /** Per string, low first: null = not played, 0 = open, 1–4 = finger. */
  fingers: (number | null)[];
  /** Fingers that lie flat across several strings. */
  barres: { finger: number; fret: number; from: number; to: number }[];
  /** How many fingers it takes (more than 4 = impossible). */
  count: number;
}

/**
 * The most natural fingering for a shape: fingers go in order up the frets (index lowest), a
 * finger lies flat as a barre only when every string under it is pressed at that fret or higher,
 * and with room to spare it keeps one finger per fret (x35553: index on 3, ring barre on 5).
 * Shapes that need more than four fingers still get one, numbered past 4, so you can see why.
 */
export function fingering(shape: readonly (number | null)[]): Fingering {
  const notes = shape
    .map((f, i) => ({ f, i }))
    .filter((x): x is { f: number; i: number } => x.f !== null && x.f > 0)
    .sort((a, b) => a.f - b.f || a.i - b.i);
  const fingers: (number | null)[] = shape.map((f) => (f === null ? null : f === 0 ? 0 : null));
  if (!notes.length) return { fingers, barres: [], count: 0 };
  const minFret = notes[0]!.f;
  const barreOk = (fret: number, lo: number, hi: number) => {
    for (let s = lo; s <= hi; s++) {
      const f = shape[s];
      if (f === null || f === undefined || f < fret || f === 0) return false;
    }
    return true;
  };
  type Slot = { fret: number; lo: number; hi: number; strings: number[] };
  // Cost of a fingering: a full barre on the lowest fret is natural; a partial barre is used
  // only when the fingers run out; past four fingers it isn't a real fingering at all.
  const cost = (sl: Slot[]) =>
    sl.reduce((c, u) => c + (u.strings.length > 1 ? (u.fret === minFret && u.strings.length >= 4 ? 0.2 : 1.5) : 0), 0) + Math.max(0, sl.length - 4) * 10;
  const solve = (cap: number, strict: boolean) => {
    const used: Slot[] = [];
    let best: Slot[] | null = null;
    let bestCost = Infinity;
    const place = (k: number) => {
      if (k === notes.length) {
        const c = cost(used);
        if (c < bestCost) {
          bestCost = c;
          best = used.map((u) => ({ ...u, strings: [...u.strings] }));
        }
        return;
      }
      const n = notes[k]!;
      const last = used[used.length - 1];
      if (last && last.fret === n.f) {
        const lo = Math.min(last.lo, n.i), hi = Math.max(last.hi, n.i);
        if (barreOk(n.f, lo, hi)) {
          const prev = { ...last, strings: [...last.strings] };
          last.lo = lo;
          last.hi = hi;
          last.strings.push(n.i);
          place(k + 1);
          Object.assign(last, prev);
        }
      }
      if (used.length < cap) {
        const between = (a: number, b: number) => notes.some((m) => m.f > minFret && m.i > Math.min(a, b) && m.i < Math.max(a, b));
        const clash =
          strict &&
          n.f === minFret &&
          used.some((u) => {
            if (u.fret !== n.f) return false;
            const near = Math.abs(u.lo - n.i) < Math.abs(u.hi - n.i) ? u.lo : u.hi;
            return Math.abs(near - n.i) > 2 && between(near, n.i);
          });
        if (!clash) {
          used.push({ fret: n.f, lo: n.i, hi: n.i, strings: [n.i] });
          place(k + 1);
          used.pop();
        }
      }
    };
    place(0);
    return best as Slot[] | null;
  };
  const slots = solve(4, true) ?? solve(8, false) ?? [];
  // Number the fingers: in order, but one finger per fret when there's room (stay ≤ 4 if possible).
  let prev = 0;
  const labels = slots.map((sl, k) => {
    const left = slots.length - k - 1;
    const want = sl.fret - minFret + 1;
    const lab = Math.max(prev + 1, slots.length <= 4 ? Math.min(want, 4 - left) : prev + 1);
    prev = lab;
    return lab;
  });
  const barres: Fingering["barres"] = [];
  slots.forEach((sl, k) => {
    for (const st of sl.strings) fingers[st] = labels[k]!;
    if (sl.strings.length > 1) barres.push({ finger: labels[k]!, fret: sl.fret, from: sl.lo, to: sl.hi });
  });
  return { fingers, barres, count: slots.length };
}

export const FINGER_NAME = ["open", "index", "middle", "ring", "pinky"];

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
    const rel = pcsAbs.map((p) => (p - rootPc + 12) % 12);
    const first = identify(ROOTS.find((r) => r.pc === rootPc)!, rel, "chord");
    const degrees: Degree[] =
      first.known?.kind === "chord"
        ? first.known.def.degrees.filter((d) => rel.includes(((degreeToSemitones(d) % 12) + 12) % 12))
        : [...rel].sort((a, b) => a - b).map((p) => NAMES[p]!);
    // Named on the enharmonic root that spells it best: Eb (Eb G Bb), not D# (D# F## A#).
    const root = bestRootFor(rootPc, degrees);
    const det = identify(root, rel, "chord");
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
    // Spelled from the reading (C minor: C Eb G, not C D# G); a note outside it falls back to a plain name.
    notes: played.map((p) => {
      const rel = (p.midi - primary.root.pc + 1200) % 12;
      const d = primary.degrees.find((x) => ((degreeToSemitones(x) % 12) + 12) % 12 === rel);
      return d ? spellDegree(primary.root, d) : chromaticName(p.midi % 12, preferFlatsFor(primary.root));
    }),
    midis: played.map((p) => p.midi),
  };
}
