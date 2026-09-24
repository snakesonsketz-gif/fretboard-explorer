import { degreeToSemitones, parseDegree, type Degree } from "./theory";

/** Plain spelling for each semitone above the root, used when an edit leaves normal spelling. */
export const CANONICAL: Degree[] = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];

export const pcOf = (d: Degree) => ((degreeToSemitones(d) % 12) + 12) % 12;

export function sortDegrees(list: Degree[]): Degree[] {
  return [...new Set(list)].sort((a, b) => degreeToSemitones(a) - degreeToSemitones(b));
}

/** Raise/lower a degree by semitones, keeping its number (b3, #11, bb7) where sensible. */
export function shiftDegree(d: Degree, delta: number): Degree {
  const { number, alter } = parseDegree(d);
  const na = alter + delta;
  const ok = Math.abs(na) <= 1 || (number === 7 && na === -2);
  if (ok && number !== 1 && number !== 8) {
    const prefix = na === -2 ? "bb" : na === -1 ? "b" : na === 1 ? "#" : "";
    return `${prefix}${number}`;
  }
  return CANONICAL[(((degreeToSemitones(d) + delta) % 12) + 12) % 12]!;
}

/** Move one degree by delta semitones; if it lands on an existing pitch class, the two merge. */
export function moveDegreeInSet(set: Degree[], d: Degree, delta: number): Degree[] {
  const next = shiftDegree(d, delta);
  const rest = set.filter((x) => x !== d);
  if (rest.some((x) => pcOf(x) === pcOf(next))) return sortDegrees(rest);
  return sortDegrees([...rest, next]);
}

/** Toggle a pitch class (0-11 above root) in the set. The root itself stays. */
export function togglePc(set: Degree[], pc: number): Degree[] {
  if (pc === 0) return set;
  if (set.some((x) => pcOf(x) === pc)) return set.filter((x) => pcOf(x) !== pc);
  return sortDegrees([...set, CANONICAL[pc]!]);
}
