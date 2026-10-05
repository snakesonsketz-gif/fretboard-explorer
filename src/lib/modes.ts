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
}

/** All seven rotations of a heptatonic collection, keeping letter-based degree spelling. */
export function modeRotations(root: Root, degrees: Degree[]): ModeRotation[] {
  if (!isHeptatonic(degrees)) return [];
  const sorted = [...degrees]
    .map((d) => ({ d, n: simple(parseDegree(d).number), s: pc12(degreeToSemitones(d)) }))
    .sort((a, b) => a.n - b.n);
  return sorted.map((tonic, k) => {
    const r = rootFor(spellDegree(root, tonic.d), root.pc + tonic.s);
    const degs = sorted.map((x) => {
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
      ? `${r.name} ${preset.name}`
      : det.known?.name ?? `${r.name} custom (${degs.join(" ")})`;
    return { index: k, root: r, degrees: degs, name, ...(preset ? { preset } : {}) };
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
