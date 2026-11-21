import type { Tuning } from "./fretboard";
import { CAGED_TEMPLATES } from "./voicings";
import { degreesToPitchClasses, identify, ownChord, parseDegree, spellDegree, type Degree, type Root } from "./theory";

/**
 * CAGED positions. Each form is located by the string that carries its root
 * (counted from the low E-string side of a 6-string layout) and the fret window
 * the open-position form occupies relative to that root fret.
 */
export type CagedForm = "C" | "A" | "G" | "E" | "D";

const FORMS: Record<CagedForm, { rootString: number; lo: number; hi: number }> = {
  C: { rootString: 1, lo: -3, hi: 0 },
  A: { rootString: 1, lo: 0, hi: 3 },
  G: { rootString: 0, lo: -3, hi: 0 },
  E: { rootString: 0, lo: 0, hi: 3 },
  D: { rootString: 2, lo: 0, hi: 3 },
};

export interface CagedPosition {
  form: CagedForm;
  rootString: number;
  rootFret: number;
  from: number;
  to: number;
}

/** CAGED is only meaningful on instruments with at least six strings. */
export function cagedSupported(tuning: Tuning): boolean {
  return tuning.strings.length >= 6;
}

/** Every CAGED position for a root pitch class, sorted up the neck. */
export function cagedPositions(tuning: Tuning, rootPc: number, maxFret = 24): CagedPosition[] {
  if (!cagedSupported(tuning)) return [];
  const offset = tuning.strings.length - 6;
  const out: CagedPosition[] = [];
  for (const form of Object.keys(FORMS) as CagedForm[]) {
    const def = FORMS[form];
    const si = offset + def.rootString;
    const open = tuning.strings[si]!;
    for (let f = (rootPc - open.pc + 12) % 12; f <= maxFret; f += 12) {
      const from = f + def.lo;
      const to = f + def.hi;
      if (from < 0 || to > maxFret) continue;
      out.push({ form, rootString: si, rootFret: f, from, to });
    }
  }
  return out.sort((a, b) => a.from - b.from || a.to - b.to);
}

/** Positions whose window overlaps the visible fret range. */
export function visiblePositions(all: CagedPosition[], fretFrom: number, fretTo: number) {
  return all.filter((p) => p.to >= fretFrom && p.from <= fretTo);
}

/**
 * Scale span for a CAGED form: the chord window widened by one fret each side,
 * which is where the full scale "box" for that form lives.
 */
export function scaleWindow(p: CagedPosition, fretFrom: number, fretTo: number) {
  return { from: Math.max(fretFrom, p.from - 1), to: Math.min(fretTo, p.to + 1) };
}

export interface MappedNote {
  string: number;
  fret: number;
  pc: number;
  midi: number;
}

/** Every note of a pitch-class set inside a fret window, per string (low string first). */
export function mapSetInWindow(tuning: Tuning, pcs: Set<number>, from: number, to: number): MappedNote[][] {
  return tuning.strings.map((s, si) => {
    const row: MappedNote[] = [];
    for (let f = from; f <= to; f++) {
      const pc = (s.pc + f) % 12;
      if (pcs.has(pc)) row.push({ string: si, fret: f, pc, midi: s.pc + (s.octave + 1) * 12 + f });
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// Chord forms, shape-to-shape connections and modes
// ---------------------------------------------------------------------------

/** The five shapes in the order they climb the neck (and wrap around an octave higher). */
export const CAGED_ORDER: CagedForm[] = ["C", "A", "G", "E", "D"];

const STANDARD_PCS = [4, 9, 2, 7, 11, 4];

/** The open-chord templates are standard-tuning, 6-string shapes. */
export function isStandardSix(tuning: Tuning): boolean {
  return tuning.strings.length === 6 && tuning.strings.every((s, i) => s.pc === STANDARD_PCS[i]);
}

export interface FormShape {
  /** The chord form: fret per string, null = muted. */
  shape: (number | null)[];
  /** e.g. "Em-form" */
  label: string;
}

const QUALITY_SUFFIX: Record<string, string> = {
  major: "", minor: "m", "7": "7", maj7: "maj7", m7: "m7", sus4: "sus4", sus2: "sus2", "6": "6", m6: "m6", dim7: "dim7",
};

/**
 * The real chord form for a CAGED position, when the chord's quality has one
 * (major, minor, 7, maj7, m7, sus, 6, m6, dim7). Returns null otherwise, e.g. there is
 * no everyday C-shaped minor chord. `ivs` are the chord's semitones above the root.
 */
export function formShapeFor(tuning: Tuning, pos: CagedPosition, ivs: Set<number>): FormShape | null {
  if (!isStandardSix(tuning)) return null;
  const t = CAGED_TEMPLATES.find((q) => q.iv.length === ivs.size && q.iv.every((x) => ivs.has(x)));
  const f = t?.forms.find(([form]) => form === pos.form);
  if (!t || !f) return null;
  const base = [...f[2]].map((c) => (c === "x" ? null : Number(c)));
  const n = pos.rootFret - (base[pos.rootString] ?? 0);
  if (n < 0) return null;
  const shape = base.map((x) => (x === null ? null : x + n));
  return { shape, label: `${pos.form}${QUALITY_SUFFIX[t.quality] ?? ""}-form` };
}

export interface Connection {
  /** Form name of the neighbour. */
  next: CagedForm;
  /** Frets the two scale windows share, or null when they only touch. */
  overlap: { from: number; to: number } | null;
  /** Notes (of the set) sitting in the shared frets. */
  shared: MappedNote[];
}

/** How a position joins the next one up the neck: shared frets and the notes in them. */
export function connection(tuning: Tuning, pcs: Set<number>, a: CagedPosition, b: CagedPosition, fretFrom = 0, fretTo = 24): Connection {
  const wa = scaleWindow(a, fretFrom, fretTo);
  const wb = scaleWindow(b, fretFrom, fretTo);
  const from = Math.max(wa.from, wb.from);
  const to = Math.min(wa.to, wb.to);
  if (from > to) return { next: b.form, overlap: null, shared: [] };
  return { next: b.form, overlap: { from, to }, shared: mapSetInWindow(tuning, pcs, from, to).flat() };
}

/** Index of the next / previous position up/down the neck, wrapping from the highest to the lowest. */
export const stepIndex = (i: number, len: number, dir: 1 | -1) => (i + dir + len) % len;

// ---- modes of the major scale on CAGED

export interface ModeInfo {
  id: string;
  /** Semitones the mode's tonic sits above its parent major key's root. */
  step: number;
  /** Scale degree that sets this mode apart from the nearest plain major/minor sound. */
  colour: string;
  colourWhy: string;
}

export const MODE_INFO: ModeInfo[] = [
  { id: "ionian", step: 0, colour: "7", colourWhy: "the major 7th (the plain major sound)" },
  { id: "dorian", step: 2, colour: "6", colourWhy: "the natural 6th (minor, but brighter)" },
  { id: "phrygian", step: 4, colour: "b2", colourWhy: "the flat 2nd (dark, Spanish)" },
  { id: "lydian", step: 5, colour: "#4", colourWhy: "the sharp 4th (major, dreamy)" },
  { id: "mixolydian", step: 7, colour: "b7", colourWhy: "the flat 7th (major, bluesy)" },
  { id: "aeolian", step: 9, colour: "b6", colourWhy: "the flat 6th (natural minor)" },
  { id: "locrian", step: 11, colour: "b5", colourWhy: "the flat 5th (unstable)" },
];

export const modeInfo = (id: string) => MODE_INFO.find((m) => m.id === id);

/** Pitch class of the parent major key a mode belongs to. */
export const parentKeyPc = (modeRootPc: number, step: number) => (((modeRootPc - step) % 12) + 12) % 12;

/** Where the mode's home note sits inside a position's scale window (string index, fret). */
export function tonicsInWindow(tuning: Tuning, tonicPc: number, from: number, to: number): { string: number; fret: number }[] {
  const out: { string: number; fret: number }[] = [];
  tuning.strings.forEach((s, si) => {
    for (let f = from; f <= to; f++) if ((s.pc + f) % 12 === tonicPc) out.push({ string: si, fret: f });
  });
  return out;
}

// ---- 1–7 labels and mode target notes

/** A degree as a plain scale number: 9→2, 11→4, 13→6 (accidentals kept). */
export function simpleDegree(d: string): string {
  const m = d.trim().match(/^([b#x♭♯]*)(\d{1,2})$/);
  if (!m) return d;
  return `${m[1]}${((Number(m[2]) - 1) % 7) + 1}`;
}

const NAME_OF = (n: number) => ["", "root", "2nd", "3rd", "4th", "5th", "6th", "7th"][n]!;

export interface ModeTargets {
  /** The 1-3-5-7 of the mode, as degrees and as note names. */
  degrees: Degree[];
  notes: string[];
  /** The chord those notes make, e.g. "Cm7". */
  chordName: string;
}

export interface ModeChange {
  degree: string;
  from: string;
  to: string;
  /** e.g. "3rd" */
  place: string;
  /** true when the note is one of the 1-3-5-7 target notes in the new mode */
  target: boolean;
}

/** The target (chord) notes of a mode over its root. */
export function modeTargets(root: Root, scaleDegrees: Degree[]): ModeTargets | null {
  const own = ownChord(scaleDegrees);
  if (!own) return null;
  const det = identify(root, degreesToPitchClasses(own), "chord");
  return {
    degrees: own,
    notes: own.map((d) => spellDegree(root, d)),
    chordName: det.known?.name ?? `${root.name} (${det.formula})`,
  };
}

/** Which notes change (by scale number) when a root moves from one scale/mode to another. */
export function modeChanges(root: Root, from: Degree[], to: Degree[]): ModeChange[] {
  const targets = new Set(ownChord(to) ?? []);
  const out: ModeChange[] = [];
  for (let n = 1; n <= 7; n++) {
    const a = from.find((d) => parseDegree(d).number === n);
    const b = to.find((d) => parseDegree(d).number === n);
    if (!a || !b || a === b) continue;
    out.push({ degree: b, from: spellDegree(root, a), to: spellDegree(root, b), place: NAME_OF(n), target: targets.has(b) });
  }
  return out;
}
