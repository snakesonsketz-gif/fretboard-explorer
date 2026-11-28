/**
 * Parallel modes vs CAGED shapes.
 *
 * The idea being tested: play every mode from the SAME tonic and the pattern you land on looks like a
 * particular CAGED shape (Ionian → D shape, Dorian → C, Phrygian → A, Lydian → G, Mixolydian → G,
 * Aeolian → E, Locrian → C).
 *
 * What is actually true, and what this file computes:
 *  - A mode's notes are exactly its parent major key's notes (tonic − step). So the mode on tonic T
 *    contains every CAGED shape of the parent key K, at several places on the neck.
 *  - "Which shape does it look like" therefore needs an ANCHOR: the shape of K whose window starts
 *    where the tonic sits on one chosen string. The offset (in frets) of that window start from the
 *    tonic fret is the measurement. 0 = exact, ±1 = approximate.
 *  - Offsets depend only on the mode, the form and the anchor string — never on the key — so
 *    transposing a mode is just sliding its pattern (apart from the nut and the 24th fret).
 */
import { CAGED_ORDER, FORMS, MODE_INFO, type CagedForm } from "./caged";
import type { Tuning } from "./fretboard";

/** Open string pitch classes of a standard 6-string guitar, low → high (E A D G B E). */
export const STD_OPEN_PCS = [4, 9, 2, 7, 11, 4];
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
export const DEFAULT_ANCHOR = 2; // the D string

const mod = (n: number, m = 12) => ((n % m) + m) % m;
/** Signed distance between two frets, taken the short way round the octave (−6 … +5). */
const signed = (n: number) => { const x = mod(n); return x > 5 ? x - 12 : x; };

/** The idea as the user stated it (parallel mode → CAGED shape of its parent key). */
export const CLAIMED: Record<string, CagedForm> = {
  ionian: "D", dorian: "C", phrygian: "A", lydian: "G", mixolydian: "G", aeolian: "E", locrian: "C",
};

/** Interval labels of each mode from its own tonic (semitones → label). */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_LABELS = ["1", "2", "3", "4", "5", "6", "7"];
export function modeFormula(modeId: string): { semis: number; label: string; degree: number }[] {
  const info = MODE_INFO.find((m) => m.id === modeId);
  if (!info) return [];
  const i0 = MAJOR_STEPS.indexOf(info.step);
  return MAJOR_STEPS.map((_, k) => {
    const semis = mod(MAJOR_STEPS[(i0 + k) % 7]! - info.step);
    const major = MAJOR_STEPS[k]!;
    const diff = semis - major;
    const label = (diff < 0 ? "b".repeat(-diff) : diff > 0 ? "#".repeat(diff) : "") + MAJOR_LABELS[k];
    return { semis, label, degree: k + 1 };
  });
}

export interface ModeFormRel {
  form: CagedForm;
  /** Frets from the tonic (on the anchor string) to the start of this form's window in the parent key. −6 … +5. */
  offset: number;
  /** Real fret range of the form's chord window (may be shifted up an octave to stay on the neck). */
  from: number;
  to: number;
  /** Fret of the parent key's root under this form. */
  rootFret: number;
  rootString: number;
  exact: boolean;
  approx: boolean;
  /** The window would start below the nut, so it is shown one octave up. */
  wrapped: boolean;
  /** The window starts at the nut, so open strings are part of the shape. */
  usesOpen: boolean;
}

export interface ModeRelations {
  tonicPc: number;
  modeId: string;
  step: number;
  parentPc: number;
  anchor: number;
  tonicFret: number;
  rels: ModeFormRel[];
  /** Forms ordered by how close their window starts to the tonic (|offset|, then CAGED order). */
  ranked: ModeFormRel[];
}

export function modeRelations(tonicPc: number, modeId: string, anchor = DEFAULT_ANCHOR): ModeRelations | null {
  const info = MODE_INFO.find((m) => m.id === modeId);
  if (!info) return null;
  const parentPc = mod(tonicPc - info.step);
  const tonicFret = mod(tonicPc - STD_OPEN_PCS[anchor]!);
  const rels = CAGED_ORDER.map((form): ModeFormRel => {
    const def = FORMS[form];
    const rootFretBase = mod(parentPc - STD_OPEN_PCS[def.rootString]!);
    const off = signed(rootFretBase + def.lo - tonicFret);
    let from = tonicFret + off;
    let wrapped = false;
    if (from < 0) { from += 12; wrapped = true; }
    const rootFret = from - def.lo;
    return {
      form, offset: off, from, to: rootFret + def.hi, rootFret, rootString: def.rootString,
      exact: off === 0, approx: Math.abs(off) === 1, wrapped,
      usesOpen: from === 0,
    };
  });
  const ranked = rels.slice().sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset) || CAGED_ORDER.indexOf(a.form) - CAGED_ORDER.indexOf(b.form));
  return { tonicPc, modeId, step: info.step, parentPc, anchor, tonicFret, rels, ranked };
}

export type ClaimStatus = "exact" | "approx" | "no";
export interface ClaimResult {
  modeId: string;
  claimed: CagedForm;
  status: ClaimStatus;
  offset: number;
  /** The form that actually sits closest to the tonic on this anchor. */
  best: CagedForm;
  bestOffset: number;
}

export function checkClaim(tonicPc: number, modeId: string, anchor = DEFAULT_ANCHOR): ClaimResult | null {
  const r = modeRelations(tonicPc, modeId, anchor);
  const claimed = CLAIMED[modeId];
  if (!r || !claimed) return null;
  const c = r.rels.find((x) => x.form === claimed)!;
  const b = r.ranked[0]!;
  return { modeId, claimed, status: c.exact ? "exact" : c.approx ? "approx" : "no", offset: c.offset, best: b.form, bestOffset: b.offset };
}

/** Across anchors: which string, if any, makes the claimed form land within one fret. */
export function anchorsSupporting(modeId: string): { anchor: number; offset: number }[] {
  const claimed = CLAIMED[modeId];
  return [0, 1, 2, 3, 4, 5].flatMap((anchor) => {
    const c = modeRelations(0, modeId, anchor)!.rels.find((x) => x.form === claimed)!;
    return Math.abs(c.offset) <= 1 ? [{ anchor, offset: c.offset }] : [];
  });
}

export interface ShapeNote {
  string: number;
  fret: number;
  pc: number;
  /** Interval from the mode's tonic, e.g. "b3". */
  label: string;
  degree: number;
  isTonic: boolean;
}

/** The mode's notes inside a form's scale box (window widened by one fret each side), labelled from the tonic. */
export function modeShapeNotes(tuning: Tuning, tonicPc: number, modeId: string, rel: ModeFormRel, maxFret = 24): ShapeNote[] {
  const formula = modeFormula(modeId);
  const byPc = new Map(formula.map((f) => [mod(tonicPc + f.semis), f]));
  const out: ShapeNote[] = [];
  const lo = Math.max(0, rel.from - 1), hi = Math.min(maxFret, rel.to + 1);
  tuning.strings.forEach((s, si) => {
    for (let f = lo; f <= hi; f++) {
      const f0 = byPc.get((s.pc + f) % 12);
      if (f0) out.push({ string: si, fret: f, pc: (s.pc + f) % 12, label: f0.label, degree: f0.degree, isTonic: f0.semis === 0 });
    }
  });
  return out;
}

/** The pattern with frets measured from the window start — identical in every key when nothing is clipped. */
export function shapeSignature(notes: ShapeNote[], windowFrom: number): string {
  return notes.map((n) => `${n.string}:${n.fret - windowFrom}:${n.degree}`).sort().join("|");
}

/**
 * The five modes that start on a note of the parent key's major pentatonic (steps 0, 2, 4, 7, 9) follow the
 * CAGED order when sorted by step (Dorian C, Phrygian A, Mixolydian G, Aeolian E, Ionian D). Lydian (5) and
 * Locrian (11) start on the two notes the pentatonic leaves out and sit outside the pattern.
 */
export const PENTATONIC_STEPS = [0, 2, 4, 7, 9];
export const inCagedPattern = (modeId: string): boolean => PENTATONIC_STEPS.includes(MODE_INFO.find((m) => m.id === modeId)?.step ?? -1);
/** Mode ids in the order their claimed shapes run C, A, G, E, D. */
export const PATTERN_ORDER = ["dorian", "phrygian", "mixolydian", "aeolian", "ionian"];
