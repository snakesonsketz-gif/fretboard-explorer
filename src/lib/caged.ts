import type { Tuning } from "./fretboard";

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
