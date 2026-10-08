import {
  ROOTS,
  SCALES,
  degreeToSemitones,
  degreesToPitchClasses,
  identify,
  parseDegree,
  spellDegree,
  type Degree,
  type Root,
  type ScaleDef,
} from "./theory";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const pc12 = (n: number) => ((n % 12) + 12) % 12;
const simple = (n: number) => ((n - 1) % 7) + 1;

export function prefix(alter: number): string {
  if (alter === 2) return "x";
  if (alter > 0) return "#".repeat(alter);
  return "b".repeat(-alter);
}

/** Root object for a spelled name, falling back to an enharmonic if the name isn't a selectable root. */
export function rootFor(name: string, pc: number): Root {
  return ROOTS.find((r) => r.name === name) ?? ROOTS.find((r) => r.pc === pc12(pc))!;
}

/** True when the set has seven notes using each degree number 1-7 once. */
export function isHeptatonic(degrees: Degree[]): boolean {
  if (degrees.length !== 7) return false;
  return new Set(degrees.map((d) => simple(parseDegree(d).number))).size === 7;
}

export interface ModeRotation {
  index: number;
  root: Root;
  degrees: Degree[];
  name: string;
  preset?: ScaleDef;
  /** Note names in the parent collection's spelling, starting from this mode's tonic. */
  notes: string[];
}

/** All seven rotations of a heptatonic collection, keeping letter-based degree spelling. */
export function modeRotations(root: Root, degrees: Degree[]): ModeRotation[] {
  if (!isHeptatonic(degrees)) return [];
  const sorted = [...degrees]
    .map((d) => ({ d, n: simple(parseDegree(d).number), s: pc12(degreeToSemitones(d)) }))
    .sort((a, b) => a.n - b.n);
  return sorted.map((tonic, k) => {
    const spelled = spellDegree(root, tonic.d);
    const r = rootFor(spelled, root.pc + tonic.s);
    // When the letter-correct tonic (e.g. E#) is not a selectable root, say so instead of silently renaming it.
    const label = r.name === spelled ? r.name : `${spelled} (= ${r.name})`;
    const rotated = [...sorted.slice(k), ...sorted.slice(0, k)];
    const degs = rotated.map((x) => {
      const n = ((x.n - tonic.n + 7) % 7) + 1;
      let alter = pc12(x.s - tonic.s) - MAJOR[n - 1]!;
      if (alter > 6) alter -= 12;
      if (alter < -6) alter += 12;
      return `${prefix(alter)}${n}`;
    });
    const key = degreesToPitchClasses(degs).join(",");
    const preset = SCALES.find((s) => degreesToPitchClasses(s.degrees).join(",") === key);
    const det = identify(r, degreesToPitchClasses(degs));
    const name = preset
      ? `${label} ${preset.name}`
      : det.known ? det.known.name.replace(r.name, label) : `${label} custom (${degs.join(" ")})`;
    const notes = rotated.map((x) => spellDegree(root, x.d));
    return { index: k, root: r, degrees: degs, name, notes, ...(preset ? { preset } : {}) };
  });
}

/** Set a degree's accidental while keeping its number. Returns null when it would collide or hit the root. */
export function alterDegree(set: Degree[], target: Degree, alter: number): Degree[] | null {
  const { number } = parseDegree(target);
  if (number === 1 || number === 8) return null;
  const next = `${prefix(alter)}${number}`;
  if (next === target) return set;
  const pc = pc12(degreeToSemitones(next));
  if (pc === 0) return null;
  if (set.some((d) => d !== target && pc12(degreeToSemitones(d)) === pc)) return null;
  return set.map((d) => (d === target ? next : d));
}
