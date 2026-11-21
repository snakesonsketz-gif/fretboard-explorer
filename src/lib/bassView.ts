import { parseDegree, spellDegree, type Degree, type Root } from "./theory";

export interface BassChoice {
  degree: Degree;
  /** Note name (raw, apply pretty() when showing). */
  note: string;
  /** What the chord becomes with this note in the bass. */
  name: string;
  effect: string;
}

/** What each chord tone does when the bass plays it under the same upper notes. */
export function bassChoices(root: Root, degrees: readonly Degree[], suffix?: string): BassChoice[] {
  const out: BassChoice[] = [];
  for (const d of degrees) {
    const { number } = parseDegree(d);
    const note = spellDegree(root, d);
    let name: string;
    let effect: string;
    if (number === 1) {
      name = suffix === undefined ? `${root.name} chord` : `${root.name}${suffix}`;
      effect = "Root: grounded, the chord sounds as written.";
    } else if (number === 3) {
      name = suffix === undefined ? `over ${note}` : `${root.name}${suffix}/${note}`;
      effect = "3rd in bass (1st inversion): lighter and smoother, leans toward moving on.";
    } else if (number === 5) {
      name = suffix === undefined ? `over ${note}` : `${root.name}${suffix}/${note}`;
      effect = "5th in bass (2nd inversion): floaty and unstable, wants to resolve.";
    } else if (number === 7) {
      name = suffix === undefined ? `over ${note}` : `${root.name}${suffix}/${note}`;
      effect = "7th in bass (3rd inversion): tense, wants to step down.";
    } else {
      name = suffix === undefined ? `over ${note}` : `${root.name}${suffix}/${note}`;
      effect = "Colour note in the bass: strong flavour, use on purpose.";
    }
    out.push({ degree: d, note, name, effect });
  }
  return out;
}

/** The four simple jobs a bass note can do, in the order to learn them. */
export const BASS_JOBS = [
  { title: "Root", body: "Names the chord. The safe default." },
  { title: "5th", body: "Keeps the chord's name, adds movement. Pairs with the root for a classic pulse." },
  { title: "Octave", body: "Same note, more energy. Keeps the harmony clear." },
  { title: "Approach", body: "A step or semitone into the next root. Drives the change." },
] as const;
