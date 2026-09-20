/**
 * Core music theory engine.
 *
 * Everything is defined in terms of degree labels ("1", "b3", "#11", "13"),
 * from which semitone values are derived. This keeps spelling (letter names +
 * accidentals) and interval math consistent across scales, chords and arpeggios.
 */

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Base semitone value of a diatonic degree number. */
const DEGREE_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
  8: 12,
  9: 14,
  10: 16,
  11: 17,
  12: 19,
  13: 21,
};

export type Degree = string;

export function parseDegree(label: Degree): { number: number; alter: number } {
  const m = label.trim().match(/^([b#x♭♯]*)(\d{1,2})$/);
  if (!m) return { number: 1, alter: 0 };
  const acc = m[1] ?? "";
  let alter = 0;
  for (const ch of acc) {
    if (ch === "b" || ch === "♭") alter -= 1;
    if (ch === "#" || ch === "♯") alter += 1;
    if (ch === "x") alter += 2;
  }
  return { number: parseInt(m[2] ?? "1", 10), alter };
}

/** Semitones above the root for a degree label (can exceed 12 for extensions). */
export function degreeToSemitones(label: Degree): number {
  const { number, alter } = parseDegree(label);
  const base = DEGREE_SEMITONES[number] ?? (DEGREE_SEMITONES[((number - 1) % 7) + 1] ?? 0) + 12;
  return base + alter;
}

/** Pitch classes (0-11, relative to root) for a degree list. */
export function degreesToPitchClasses(degrees: Degree[]): number[] {
  const set = new Set<number>();
  for (const d of degrees) set.add(((degreeToSemitones(d) % 12) + 12) % 12);
  return [...set].sort((a, b) => a - b);
}

export function accidentalString(alter: number): string {
  if (alter === 0) return "";
  if (alter > 0) return "#".repeat(alter);
  return "b".repeat(-alter);
}

/** Pretty accidental glyphs for display. */
export function pretty(text: string): string {
  return text.replace(/b(?=\d|$|\)|\/|,| )/g, "♭").replace(/#/g, "♯");
}

/* ------------------------------------------------------------------ roots */

export interface Root {
  /** Display name, e.g. "Eb" */
  name: string;
  pc: number;
  letter: string;
  alter: number;
}

export const ROOTS: Root[] = [
  { name: "C", pc: 0 },
  { name: "C#", pc: 1 },
  { name: "Db", pc: 1 },
  { name: "D", pc: 2 },
  { name: "D#", pc: 3 },
  { name: "Eb", pc: 3 },
  { name: "E", pc: 4 },
  { name: "F", pc: 5 },
  { name: "F#", pc: 6 },
  { name: "Gb", pc: 6 },
  { name: "G", pc: 7 },
  { name: "G#", pc: 8 },
  { name: "Ab", pc: 8 },
  { name: "A", pc: 9 },
  { name: "A#", pc: 10 },
  { name: "Bb", pc: 10 },
  { name: "B", pc: 11 },
].map((r) => ({
  ...r,
  letter: r.name[0]!,
  alter: r.name.length > 1 ? (r.name[1] === "#" ? 1 : -1) : 0,
}));

export function rootByName(name: string): Root {
  return ROOTS.find((r) => r.name === name) ?? ROOTS[0]!;
}

/** Spell the note for a degree label above a root (proper enharmonic spelling). */
export function spellDegree(root: Root, degree: Degree): string {
  const { number, alter } = parseDegree(degree);
  const letterIdx = (LETTERS.indexOf(root.letter) + (number - 1)) % 7;
  const letter = LETTERS[letterIdx]!;
  const octaves = Math.floor((LETTERS.indexOf(root.letter) + (number - 1)) / 7);
  const natural = (LETTER_SEMITONES[letter] ?? 0) + octaves * 12;
  const target = (LETTER_SEMITONES[root.letter] ?? 0) + root.alter + degreeToSemitones(degree);
  return letter + accidentalString(target - natural);
}

/** Fallback chromatic name, used when a pitch class has no degree in the set. */
export function chromaticName(pc: number, preferFlats: boolean): string {
  const i = ((pc % 12) + 12) % 12;
  return (preferFlats ? FLAT_NAMES[i] : SHARP_NAMES[i])!;
}

export function preferFlatsFor(root: Root): boolean {
  if (root.alter < 0) return true;
  if (root.alter > 0) return false;
  return root.letter === "F";
}

/* ------------------------------------------------------------------ intervals */

export const INTERVAL_SHORT: Record<number, string> = {
  0: "R",
  1: "m2",
  2: "M2",
  3: "m3",
  4: "M3",
  5: "P4",
  6: "TT",
  7: "P5",
  8: "m6",
  9: "M6",
  10: "m7",
  11: "M7",
};

export const INTERVAL_LONG: Record<number, string> = {
  0: "unison",
  1: "minor 2nd",
  2: "major 2nd",
  3: "minor 3rd",
  4: "major 3rd",
  5: "perfect 4th",
  6: "tritone",
  7: "perfect 5th",
  8: "minor 6th",
  9: "major 6th",
  10: "minor 7th",
  11: "major 7th",
};

/* ------------------------------------------------------------------ scales */

export interface ScaleDef {
  id: string;
  name: string;
  aliases?: string[];
  degrees: Degree[];
  family: "Major modes" | "Minor" | "Pentatonic / Blues" | "Symmetric" | "Exotic";
  /** Notes that give the scale its identity against its parent. */
  characteristic?: string;
  theory: string;
  /** Chord quality suffixes per scale degree, for 7-note scales. */
  chordScale?: string;
  /** Modal rotation family id + rotation index, used for relative-mode views. */
  modeOf?: { family: string; index: number };
}

export const MAJOR_MODE_NAMES = [
  "Ionian",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
];

export const SCALES: ScaleDef[] = [
  {
    id: "ionian",
    name: "Ionian (Major)",
    aliases: ["Major"],
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
    family: "Major modes",
    characteristic: "Major 3rd and major 7th; the reference brightness.",
    theory:
      "The parent of the seven diatonic modes. Two semitone steps sit between 3-4 and 7-1, which drive the classic V-I resolution. Avoid dwelling on the 4th over a I chord — it clashes with the 3rd a semitone below it.",
    chordScale: "Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø",
    modeOf: { family: "major", index: 0 },
  },
  {
    id: "dorian",
    name: "Dorian",
    degrees: ["1", "2", "b3", "4", "5", "6", "b7"],
    family: "Major modes",
    characteristic: "Minor 3rd with a natural 6 — the bright minor.",
    theory:
      "Minor mode with a natural 6th. That 6th is the whole story: it makes Dorian sound hopeful rather than sad, and it is the standard choice over static m7 vamps in modal jazz, funk and rock.",
    modeOf: { family: "major", index: 1 },
  },
  {
    id: "phrygian",
    name: "Phrygian",
    degrees: ["1", "b2", "b3", "4", "5", "b6", "b7"],
    family: "Major modes",
    characteristic: "Flat 2 — the Spanish/metal half-step above the root.",
    theory:
      "Minor mode with a b2. The half step straight off the root gives an unmistakable Spanish or metal colour. Its dominant-flavoured sibling (Phrygian dominant) raises the 3rd.",
    modeOf: { family: "major", index: 2 },
  },
  {
    id: "lydian",
    name: "Lydian",
    degrees: ["1", "2", "3", "4+", "5", "6", "7"].map((d) => (d === "4+" ? "#4" : d)),
    family: "Major modes",
    characteristic: "Sharp 4 — floating, filmic brightness.",
    theory:
      "Major mode with a #4. Because it has no semitone clash above the 3rd, Lydian sounds more open than Ionian and is the standard sound over maj7#11 chords.",
    modeOf: { family: "major", index: 3 },
  },
  {
    id: "mixolydian",
    name: "Mixolydian",
    degrees: ["1", "2", "3", "4", "5", "6", "b7"],
    family: "Major modes",
    characteristic: "Major 3rd with a flat 7 — the dominant / blues-rock mode.",
    theory:
      "Major mode with a b7, the home sound of dominant 7th chords, blues and rock. The 4th is the tension note against the major 3rd; treat it as a passing colour.",
    modeOf: { family: "major", index: 4 },
  },
  {
    id: "aeolian",
    name: "Aeolian (Natural minor)",
    aliases: ["Natural minor", "Minor"],
    degrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
    family: "Major modes",
    characteristic: "Flat 6 — the darker of the two common minors.",
    theory:
      "The relative minor of the major scale, sharing exactly the same notes from the 6th degree. Flat 6 and flat 7 mean no natural dominant chord, which is why harmonic minor exists.",
    modeOf: { family: "major", index: 5 },
  },
  {
    id: "locrian",
    name: "Locrian",
    degrees: ["1", "b2", "b3", "4", "b5", "b6", "b7"],
    family: "Major modes",
    characteristic: "Flat 5 plus flat 2 — unstable, no perfect fifth.",
    theory:
      "The only diatonic mode without a perfect 5th, so its tonic chord is half-diminished. Used almost always in passing, over m7b5 chords resolving onward.",
    modeOf: { family: "major", index: 6 },
  },

  {
    id: "harmonic-minor",
    name: "Harmonic minor",
    degrees: ["1", "2", "b3", "4", "5", "b6", "7"],
    family: "Minor",
    characteristic: "Natural 7 over a minor 3rd; augmented 2nd from b6 to 7.",
    theory:
      "Natural minor with a raised 7th, creating a real V7 chord in minor keys. The augmented 2nd between b6 and 7 is its signature sound.",
    chordScale: "i(maj7) iiø III+ iv7 V7 VImaj7 vii°7",
  },
  {
    id: "melodic-minor",
    name: "Melodic minor (jazz)",
    degrees: ["1", "2", "b3", "4", "5", "6", "7"],
    family: "Minor",
    characteristic: "Minor 3rd with natural 6 and natural 7.",
    theory:
      "Ascending melodic minor. In jazz it is used in both directions, and its modes give altered dominant sounds — the 4th mode is Lydian dominant, the 7th is the altered scale.",
    chordScale: "i(maj7) ii7 III+maj7 IV7 V7 viø viiø",
  },
  {
    id: "phrygian-dominant",
    name: "Phrygian dominant",
    aliases: ["Spanish", "Mode 5 of harmonic minor"],
    degrees: ["1", "b2", "3", "4", "5", "b6", "b7"],
    family: "Minor",
    characteristic: "b2 and major 3rd together.",
    theory: "Fifth mode of harmonic minor: the flamenco and metal dominant sound over V7 in minor.",
  },
  {
    id: "lydian-dominant",
    name: "Lydian dominant",
    aliases: ["Mixolydian #11", "Mode 4 of melodic minor"],
    degrees: ["1", "2", "3", "#4", "5", "6", "b7"],
    family: "Minor",
    characteristic: "#11 over a dominant 7th.",
    theory: "Fourth mode of melodic minor, the go-to sound for 7#11 chords.",
  },
  {
    id: "altered",
    name: "Altered (Super Locrian)",
    aliases: ["Diminished whole tone", "Mode 7 of melodic minor"],
    degrees: ["1", "b2", "b3", "b4", "b5", "b6", "b7"],
    family: "Minor",
    characteristic: "Every possible dominant alteration: b9 #9 b5 #5.",
    theory:
      "Seventh mode of melodic minor. Spelled from the dominant it reads 1 b9 #9 3 b5 #5 b7 — the standard vocabulary for altered dominants resolving to minor.",
  },

  {
    id: "major-pentatonic",
    name: "Major pentatonic",
    degrees: ["1", "2", "3", "5", "6"],
    family: "Pentatonic / Blues",
    characteristic: "No 4th and no 7th — nothing can clash.",
    theory:
      "The major scale with the two semitone steps removed. Because it has no half steps, every note sounds consonant over a major or dominant chord.",
    modeOf: { family: "pentatonic", index: 0 },
  },
  {
    id: "minor-pentatonic",
    name: "Minor pentatonic",
    degrees: ["1", "b3", "4", "5", "b7"],
    family: "Pentatonic / Blues",
    characteristic: "b3 and b7 — the rock/blues backbone.",
    theory:
      "Relative of major pentatonic starting on its 6th degree. A minor pentatonic and C major pentatonic are the same five notes.",
    modeOf: { family: "pentatonic", index: 4 },
  },
  {
    id: "blues",
    name: "Blues scale",
    degrees: ["1", "b3", "4", "b5", "5", "b7"],
    family: "Pentatonic / Blues",
    characteristic: "The b5 'blue note' squeezed between 4 and 5.",
    theory:
      "Minor pentatonic plus b5. The blue note is a passing colour: bend or slide through it rather than sitting on it.",
  },
  {
    id: "major-blues",
    name: "Major blues scale",
    degrees: ["1", "2", "b3", "3", "5", "6"],
    family: "Pentatonic / Blues",
    characteristic: "b3 rubbing against the major 3rd.",
    theory: "Major pentatonic plus b3 — the country and gospel 'slip note' sound.",
  },

  {
    id: "whole-tone",
    name: "Whole tone",
    degrees: ["1", "2", "3", "#4", "#5", "b7"],
    family: "Symmetric",
    characteristic: "All whole steps; only two such scales exist.",
    theory:
      "Six notes a whole step apart. Perfectly symmetric, so it has no leading tone — used over 7#5 chords.",
  },
  {
    id: "dim-whole-half",
    name: "Diminished (whole-half)",
    degrees: ["1", "2", "b3", "4", "b5", "b6", "6", "7"],
    family: "Symmetric",
    characteristic: "Alternating whole and half steps over a diminished 7th.",
    theory: "Eight notes; the choice over dim7 chords. Repeats every minor 3rd.",
  },
  {
    id: "dim-half-whole",
    name: "Diminished (half-whole)",
    aliases: ["Dominant diminished"],
    degrees: ["1", "b2", "#2", "3", "#4", "5", "6", "b7"],
    family: "Symmetric",
    characteristic: "b9, #9, #11 and natural 13 over a dominant.",
    theory: "The dominant diminished scale: use over 7b9 and 13b9 chords.",
  },
  {
    id: "chromatic",
    name: "Chromatic",
    degrees: ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"],
    family: "Symmetric",
    characteristic: "Every pitch class.",
    theory: "All twelve notes. Useful as a reference layer and for approach-note practice.",
  },
  {
    id: "augmented",
    name: "Augmented scale",
    degrees: ["1", "b3", "3", "5", "#5", "7"],
    family: "Symmetric",
    characteristic: "Alternating minor 3rd and half step.",
    theory: "Symmetric hexatonic built from two augmented triads a semitone apart.",
  },

  {
    id: "harmonic-major",
    name: "Harmonic major",
    degrees: ["1", "2", "3", "4", "5", "b6", "7"],
    family: "Exotic",
    characteristic: "Major scale with a flat 6.",
    theory: "Parent of several altered-dominant and maj7 sounds; strong for iv-chord borrowings.",
  },
  {
    id: "hungarian-minor",
    name: "Hungarian minor",
    degrees: ["1", "2", "b3", "#4", "5", "b6", "7"],
    family: "Exotic",
    characteristic: "#4 and natural 7 in a minor scale.",
    theory: "Harmonic minor with a raised 4th — two augmented seconds give it its dramatic pull.",
  },
  {
    id: "double-harmonic",
    name: "Double harmonic major",
    aliases: ["Byzantine"],
    degrees: ["1", "b2", "3", "4", "5", "b6", "7"],
    family: "Exotic",
    characteristic: "b2 and b6 around a major 3rd and natural 7.",
    theory: "Byzantine/Arabic sound: two augmented seconds, symmetric around the 5th.",
  },
  {
    id: "japanese-insen",
    name: "Insen",
    degrees: ["1", "b2", "4", "5", "b7"],
    family: "Exotic",
    characteristic: "Pentatonic with b2 and no third.",
    theory: "Japanese pentatonic; ambiguous quality because it omits the third.",
  },
];

export const SCALE_FAMILIES: ScaleDef["family"][] = [
  "Major modes",
  "Minor",
  "Pentatonic / Blues",
  "Symmetric",
  "Exotic",
];

/* ------------------------------------------------------------------ chords */

export interface ChordDef {
  id: string;
  name: string;
  /** Suffix appended to the root, e.g. "maj7" */
  suffix: string;
  degrees: Degree[];
  family:
    | "Triads"
    | "Sixths"
    | "Sevenths"
    | "Sus & add"
    | "Extensions"
    | "Altered dominants"
    | "Diminished & augmented";
  theory: string;
  /** Recommended scales (ids) */
  scales?: string[];
}

export const CHORDS: ChordDef[] = [
  {
    id: "maj",
    name: "Major triad",
    suffix: "",
    degrees: ["1", "3", "5"],
    family: "Triads",
    theory: "Root, major 3rd, perfect 5th. The stable reference chord.",
    scales: ["ionian", "lydian", "major-pentatonic"],
  },
  {
    id: "min",
    name: "Minor triad",
    suffix: "m",
    degrees: ["1", "b3", "5"],
    family: "Triads",
    theory: "Lowering the 3rd a semitone turns major into minor.",
    scales: ["aeolian", "dorian", "minor-pentatonic"],
  },
  {
    id: "dim",
    name: "Diminished triad",
    suffix: "dim",
    degrees: ["1", "b3", "b5"],
    family: "Triads",
    theory: "Two stacked minor 3rds; unstable, wants to resolve.",
    scales: ["locrian", "dim-whole-half"],
  },
  {
    id: "aug",
    name: "Augmented triad",
    suffix: "aug",
    degrees: ["1", "3", "#5"],
    family: "Triads",
    theory: "Two stacked major 3rds; symmetric, so any note can act as root.",
    scales: ["whole-tone", "augmented"],
  },
  {
    id: "5",
    name: "Power chord",
    suffix: "5",
    degrees: ["1", "5"],
    family: "Triads",
    theory: "No third, so neither major nor minor — the rock staple.",
  },
  {
    id: "6",
    name: "Major 6th",
    suffix: "6",
    degrees: ["1", "3", "5", "6"],
    family: "Sixths",
    theory: "Major triad plus the 6th. Softer and less directional than maj7.",
    scales: ["ionian", "major-pentatonic"],
  },
  {
    id: "m6",
    name: "Minor 6th",
    suffix: "m6",
    degrees: ["1", "b3", "5", "6"],
    family: "Sixths",
    theory: "Minor triad with a natural 6 — implies Dorian or melodic minor.",
    scales: ["dorian", "melodic-minor"],
  },
  {
    id: "69",
    name: "6/9",
    suffix: "6/9",
    degrees: ["1", "3", "5", "6", "9"],
    family: "Sixths",
    theory: "Major pentatonic stacked as a chord: lush and completely stable.",
    scales: ["major-pentatonic", "ionian"],
  },
  {
    id: "maj7",
    name: "Major 7th",
    suffix: "maj7",
    degrees: ["1", "3", "5", "7"],
    family: "Sevenths",
    theory: "Major triad plus major 7th. Tonic colour in major keys.",
    scales: ["ionian", "lydian"],
  },
  {
    id: "m7",
    name: "Minor 7th",
    suffix: "m7",
    degrees: ["1", "b3", "5", "b7"],
    family: "Sevenths",
    theory: "The workhorse minor chord; Dorian or Aeolian both fit.",
    scales: ["dorian", "aeolian", "minor-pentatonic"],
  },
  {
    id: "7",
    name: "Dominant 7th",
    suffix: "7",
    degrees: ["1", "3", "5", "b7"],
    family: "Sevenths",
    theory: "Major triad plus b7. The tritone between 3 and b7 creates the pull to I.",
    scales: ["mixolydian", "lydian-dominant", "blues"],
  },
  {
    id: "m7b5",
    name: "Half-diminished",
    suffix: "m7b5",
    degrees: ["1", "b3", "b5", "b7"],
    family: "Sevenths",
    theory: "The ii chord of minor keys. Locrian, or Locrian natural 2.",
    scales: ["locrian"],
  },
  {
    id: "dim7",
    name: "Diminished 7th",
    suffix: "dim7",
    degrees: ["1", "b3", "b5", "bb7"],
    family: "Diminished & augmented",
    theory: "Four stacked minor 3rds — fully symmetric, four possible roots.",
    scales: ["dim-whole-half"],
  },
  {
    id: "mmaj7",
    name: "Minor-major 7th",
    suffix: "m(maj7)",
    degrees: ["1", "b3", "5", "7"],
    family: "Sevenths",
    theory: "Minor triad with a natural 7 — melodic/harmonic minor tonic.",
    scales: ["melodic-minor", "harmonic-minor"],
  },
  {
    id: "maj7s5",
    name: "Major 7th #5",
    suffix: "maj7#5",
    degrees: ["1", "3", "#5", "7"],
    family: "Diminished & augmented",
    theory: "Augmented triad plus major 7th; third mode of melodic minor.",
    scales: ["melodic-minor"],
  },
  {
    id: "sus2",
    name: "Suspended 2nd",
    suffix: "sus2",
    degrees: ["1", "2", "5"],
    family: "Sus & add",
    theory: "The 3rd is replaced by the 2nd: open and unresolved.",
  },
  {
    id: "sus4",
    name: "Suspended 4th",
    suffix: "sus4",
    degrees: ["1", "4", "5"],
    family: "Sus & add",
    theory: "The 3rd is replaced by the 4th, classically resolving down to the 3rd.",
  },
  {
    id: "7sus4",
    name: "7sus4",
    suffix: "7sus4",
    degrees: ["1", "4", "5", "b7"],
    family: "Sus & add",
    theory: "Dominant with the 3rd suspended — a whole tone of delayed resolution.",
    scales: ["mixolydian"],
  },
  {
    id: "add9",
    name: "Add 9",
    suffix: "add9",
    degrees: ["1", "3", "5", "9"],
    family: "Sus & add",
    theory: "Triad plus 9th but no 7th — bright without jazz weight.",
  },
  {
    id: "madd9",
    name: "Minor add 9",
    suffix: "m(add9)",
    degrees: ["1", "b3", "5", "9"],
    family: "Sus & add",
    theory: "Minor triad with a 9th and no 7th; a favourite of atmospheric rock.",
  },
  {
    id: "add11",
    name: "Add 11",
    suffix: "add11",
    degrees: ["1", "3", "5", "11"],
    family: "Sus & add",
    theory: "The 11 sits a semitone above the 3rd — voice them far apart.",
  },
  {
    id: "maj9",
    name: "Major 9th",
    suffix: "maj9",
    degrees: ["1", "3", "5", "7", "9"],
    family: "Extensions",
    theory: "maj7 plus 9. Guitarists usually drop the 5th.",
    scales: ["ionian", "lydian"],
  },
  {
    id: "m9",
    name: "Minor 9th",
    suffix: "m9",
    degrees: ["1", "b3", "5", "b7", "9"],
    family: "Extensions",
    theory: "m7 plus 9; the smooth modal minor sound.",
    scales: ["dorian", "aeolian"],
  },
  {
    id: "9",
    name: "Dominant 9th",
    suffix: "9",
    degrees: ["1", "3", "5", "b7", "9"],
    family: "Extensions",
    theory: "Dominant 7th plus 9 — funk's default.",
    scales: ["mixolydian"],
  },
  {
    id: "11",
    name: "Dominant 11th",
    suffix: "11",
    degrees: ["1", "5", "b7", "9", "11"],
    family: "Extensions",
    theory: "The 3rd is normally omitted, making this effectively a 9sus4.",
    scales: ["mixolydian"],
  },
  {
    id: "m11",
    name: "Minor 11th",
    suffix: "m11",
    degrees: ["1", "b3", "5", "b7", "9", "11"],
    family: "Extensions",
    theory: "All-consonant minor stack: no tension notes to avoid.",
    scales: ["dorian"],
  },
  {
    id: "13",
    name: "Dominant 13th",
    suffix: "13",
    degrees: ["1", "3", "5", "b7", "9", "13"],
    family: "Extensions",
    theory: "Full dominant stack; the 11 is left out to protect the 3rd.",
    scales: ["mixolydian", "lydian-dominant"],
  },
  {
    id: "maj7s11",
    name: "Major 7th #11",
    suffix: "maj7#11",
    degrees: ["1", "3", "5", "7", "#11"],
    family: "Extensions",
    theory: "The Lydian chord — bright and floating.",
    scales: ["lydian"],
  },
  {
    id: "7b9",
    name: "7b9",
    suffix: "7b9",
    degrees: ["1", "3", "5", "b7", "b9"],
    family: "Altered dominants",
    theory: "Classic V7 into minor; a diminished 7th chord hides inside it.",
    scales: ["dim-half-whole", "phrygian-dominant"],
  },
  {
    id: "7s9",
    name: "7#9",
    suffix: "7#9",
    degrees: ["1", "3", "5", "b7", "#9"],
    family: "Altered dominants",
    theory: "The Hendrix chord: major 3rd and #9 (an enharmonic minor 3rd) together.",
    scales: ["altered", "dim-half-whole", "blues"],
  },
  {
    id: "7s11",
    name: "7#11",
    suffix: "7#11",
    degrees: ["1", "3", "5", "b7", "#11"],
    family: "Altered dominants",
    theory: "Lydian dominant chord; common on non-resolving dominants.",
    scales: ["lydian-dominant"],
  },
  {
    id: "7b13",
    name: "7b13",
    suffix: "7b13",
    degrees: ["1", "3", "b7", "b13"],
    family: "Altered dominants",
    theory: "b13 replaces the 5th (it is the same pitch as #5).",
    scales: ["altered", "whole-tone"],
  },
  {
    id: "7alt",
    name: "7alt",
    suffix: "7alt",
    degrees: ["1", "3", "b7", "b9", "#9", "b13"],
    family: "Altered dominants",
    theory: "Every alteration at once — play the altered scale over it.",
    scales: ["altered"],
  },
  {
    id: "7s5",
    name: "7#5",
    suffix: "7#5",
    degrees: ["1", "3", "#5", "b7"],
    family: "Altered dominants",
    theory: "Whole-tone dominant; the 5th is raised rather than added to.",
    scales: ["whole-tone", "altered"],
  },
  {
    id: "7b5",
    name: "7b5",
    suffix: "7b5",
    degrees: ["1", "3", "b5", "b7"],
    family: "Altered dominants",
    theory: "Two tritones stacked; sits between dominant and whole tone.",
    scales: ["whole-tone", "lydian-dominant"],
  },
  {
    id: "dim9",
    name: "Diminished 9th",
    suffix: "dim9",
    degrees: ["1", "b3", "b5", "bb7", "9"],
    family: "Diminished & augmented",
    theory: "dim7 with a 9th added, from the whole-half diminished scale.",
    scales: ["dim-whole-half"],
  },
];

export const CHORD_FAMILIES: ChordDef["family"][] = [
  "Triads",
  "Sixths",
  "Sevenths",
  "Sus & add",
  "Extensions",
  "Altered dominants",
  "Diminished & augmented",
];

/* ------------------------------------------------------------------ arpeggios */

export interface ArpeggioVariant {
  id: string;
  name: string;
  /** Which degrees of the source chord to keep, by index shortcut */
  transform: (degrees: Degree[]) => Degree[];
  theory: string;
}

export const ARPEGGIO_VARIANTS: ArpeggioVariant[] = [
  {
    id: "full",
    name: "Full chord arpeggio",
    transform: (d) => d,
    theory: "Every chord tone in order — the literal spelling of the harmony.",
  },
  {
    id: "triad",
    name: "Core triad only",
    transform: (d) => d.filter((x) => ["1", "3", "b3", "5", "b5", "#5"].includes(x)),
    theory: "Strip to the triad to outline harmony cleanly at speed.",
  },
  {
    id: "shell",
    name: "Shell (1-3-7)",
    transform: (d) =>
      d.filter((x) => ["1", "3", "b3", "7", "b7", "bb7"].includes(x)),
    theory: "Root, third, seventh: the smallest set that states the quality.",
  },
  {
    id: "rootless",
    name: "Rootless (3-5-7-9)",
    transform: (d) => d.filter((x) => x !== "1"),
    theory: "Drop the root and let the bass imply it — instant upper-structure colour.",
  },
  {
    id: "upper",
    name: "Upper structure (from the 3rd)",
    transform: (d) => {
      const rotated = [...d.slice(1), d[0]!];
      return rotated;
    },
    theory: "Start from the 3rd so the arpeggio implies a superimposed chord.",
  },
  {
    id: "add9",
    name: "Add the 9th",
    transform: (d) => (d.includes("9") ? d : [...d, "9"]),
    theory: "Extending the arpeggio to the 9th widens the shape without changing function.",
  },
  {
    id: "sixths",
    name: "Add the 6th / 13th",
    transform: (d) => (d.includes("6") || d.includes("13") ? d : [...d, "13"]),
    theory: "The 13th sits a whole tone above the 5th and softens dominant sounds.",
  },
];

/* ------------------------------------------------------------------ naming / detection */

export interface Detection {
  /** Conventional name if the set matches a known structure. */
  known?: { kind: "chord" | "scale"; name: string; suffix?: string; def: ChordDef | ScaleDef };
  /** Extra recognised readings (rotations / alternate spellings). */
  alternates: string[];
  /** Always available fallback description. */
  formula: string;
}

function pcKey(pcs: number[]): string {
  return [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
}

const CHORD_INDEX = new Map<string, ChordDef>();
for (const c of CHORDS) {
  const k = pcKey(degreesToPitchClasses(c.degrees));
  if (!CHORD_INDEX.has(k)) CHORD_INDEX.set(k, c);
}
const SCALE_INDEX = new Map<string, ScaleDef>();
for (const s of SCALES) {
  const k = pcKey(degreesToPitchClasses(s.degrees));
  if (!SCALE_INDEX.has(k)) SCALE_INDEX.set(k, s);
}

/** Best-effort degree labels for an arbitrary pitch-class set. */
export function pcsToDegrees(pcs: number[]): Degree[] {
  const sharpish = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  return [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))]
    .sort((a, b) => a - b)
    .map((p) => sharpish[p]!);
}

/**
 * Identify a custom pitch-class set (relative to a root).
 * Returns the conventional name when the set matches a recognised structure,
 * otherwise a clearly-labelled custom formula.
 */
export function identify(root: Root, pcs: number[]): Detection {
  const unique = [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b);
  const key = pcKey(unique);
  const degrees = pcsToDegrees(unique);
  const formula = degrees.join(" ");
  const alternates: string[] = [];

  const chord = CHORD_INDEX.get(key);
  const scale = SCALE_INDEX.get(key);

  // Rotations: name the same collection from other roots.
  for (let rot = 1; rot < 12; rot++) {
    const rotated = pcKey(unique.map((p) => (p - rot + 12) % 12));
    const other = ROOTS.find((r) => r.pc === (root.pc + rot) % 12);
    if (!other) continue;
    const rc = CHORD_INDEX.get(rotated);
    const rs = SCALE_INDEX.get(rotated);
    if (rc && unique.length <= 6) alternates.push(`${other.name}${rc.suffix} (same notes)`);
    if (rs && unique.length >= 5) alternates.push(`${other.name} ${rs.name} (same notes)`);
  }

  if (chord && (!scale || unique.length <= 6)) {
    return {
      known: { kind: "chord", name: `${root.name}${chord.suffix}`, suffix: chord.suffix, def: chord },
      alternates: alternates.slice(0, 6),
      formula,
    };
  }
  if (scale) {
    return {
      known: { kind: "scale", name: `${root.name} ${scale.name}`, def: scale },
      alternates: alternates.slice(0, 6),
      formula,
    };
  }
  return { alternates: alternates.slice(0, 6), formula };
}

export function customName(root: Root, pcs: number[]): string {
  const det = identify(root, pcs);
  if (det.known) return det.known.name;
  return `${root.name} custom (${det.formula})`;
}

/* ------------------------------------------------------------------ tensions */

/**
 * Classify each note of a scale against a chord: chord tone, colour tension,
 * or avoid note (a semitone above a chord tone that is not the root).
 */
export function classifyAgainstChord(
  scaleDegrees: Degree[],
  chordDegrees: Degree[],
): { degree: Degree; role: "chord tone" | "tension" | "avoid" }[] {
  const chordPcs = new Set(degreesToPitchClasses(chordDegrees));
  const guideTones = new Set(
    degreesToPitchClasses(chordDegrees.filter((d) => d !== "1" && d !== "5")),
  );
  return scaleDegrees.map((d) => {
    const pc = ((degreeToSemitones(d) % 12) + 12) % 12;
    if (chordPcs.has(pc)) return { degree: d, role: "chord tone" as const };
    if (guideTones.has((pc + 11) % 12)) return { degree: d, role: "avoid" as const };
    return { degree: d, role: "tension" as const };
  });
}

/* ------------------------------------------------------------------ harmonizer */

export interface HarmonizedChord {
  roman: string;
  name: string;
  quality: string;
  degrees: Degree[];
  notes: string[];
  function: string;
  substitutions: string[];
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function qualityFromIntervals(iv: number[]): { suffix: string; label: string; roman: string } {
  const s = iv.join(",");
  const table: Record<string, { suffix: string; label: string; roman: string }> = {
    "0,4,7,11": { suffix: "maj7", label: "major 7th", roman: "upper" },
    "0,4,7,10": { suffix: "7", label: "dominant 7th", roman: "upper" },
    "0,3,7,10": { suffix: "m7", label: "minor 7th", roman: "lower" },
    "0,3,6,10": { suffix: "m7b5", label: "half-diminished", roman: "lowerdim" },
    "0,3,6,9": { suffix: "dim7", label: "diminished 7th", roman: "lowerdim" },
    "0,3,7,11": { suffix: "m(maj7)", label: "minor-major 7th", roman: "lower" },
    "0,4,8,11": { suffix: "maj7#5", label: "augmented major 7th", roman: "aug" },
    "0,4,8,10": { suffix: "7#5", label: "augmented dominant", roman: "aug" },
    "0,4,7": { suffix: "", label: "major triad", roman: "upper" },
    "0,3,7": { suffix: "m", label: "minor triad", roman: "lower" },
    "0,3,6": { suffix: "dim", label: "diminished triad", roman: "lowerdim" },
    "0,4,8": { suffix: "aug", label: "augmented triad", roman: "aug" },
  };
  return table[s] ?? { suffix: "?", label: "custom stack", roman: "upper" };
}

const FUNCTIONS = [
  "Tonic — home.",
  "Subdominant / predominant — moves toward the dominant.",
  "Tonic substitute — shares two notes with I.",
  "Subdominant — the classic lift away from home.",
  "Dominant — carries the tritone pull back to I.",
  "Relative minor / tonic substitute.",
  "Leading-tone chord — resolves upward to I.",
];

const SUBS = [
  ["iii7 or vi7 as tonic substitutes", "Imaj9 / I6 as re-voicings"],
  ["IV as a subdominant swap", "bII7 tritone sub when ii becomes a dominant"],
  ["I as a tonic substitute", "V/vi secondary dominant"],
  ["ii7 as a subdominant swap", "iv borrowed from the parallel minor"],
  ["bII7 tritone substitution", "V7alt, V7sus4, or vii° for the same pull"],
  ["I as tonic", "IV/vi modal borrowing"],
  ["V7 with the root omitted", "vii°7 borrowed from harmonic minor"],
];

export function harmonize(root: Root, scale: ScaleDef, seventh: boolean): HarmonizedChord[] {
  const degs = scale.degrees;
  if (degs.length !== 7) return [];
  const semis = degs.map(degreeToSemitones);
  const out: HarmonizedChord[] = [];

  for (let i = 0; i < 7; i++) {
    const pick = seventh ? [0, 2, 4, 6] : [0, 2, 4];
    const idxs = pick.map((p) => (i + p) % 7);
    const abs = idxs.map((idx, n) => {
      const v = semis[idx] ?? 0;
      const wraps = Math.floor((i + (pick[n] ?? 0)) / 7);
      return v + wraps * 12;
    });
    const iv = abs.map((v) => v - (abs[0] ?? 0));
    const q = qualityFromIntervals(iv.map((v) => v % 12).sort((a, b) => a - b));
    const chordRootDegree = degs[i]!;
    const chordRootName = spellDegree(root, chordRootDegree);
    const chordRoot: Root = {
      name: chordRootName,
      pc: ((degreeToSemitones(chordRootDegree) + root.pc) % 12 + 12) % 12,
      letter: chordRootName[0]!,
      alter: chordRootName.length > 1 ? (chordRootName[1] === "#" ? 1 : -1) : 0,
    };
    const { alter } = parseDegree(chordRootDegree);
    let roman = ROMAN[i]!;
    if (q.roman === "lower" || q.roman === "lowerdim") roman = roman.toLowerCase();
    if (q.roman === "lowerdim") roman += q.suffix.includes("b5") ? "ø" : "°";
    if (q.roman === "aug") roman += "+";
    if (alter < 0) roman = "b".repeat(-alter) + roman;
    if (alter > 0) roman = "#".repeat(alter) + roman;
    if (seventh && q.roman !== "lowerdim") roman += "7";

    const notes = idxs.map((idx) => spellDegree(root, degs[idx]!));

    out.push({
      roman,
      name: `${chordRoot.name}${q.suffix}`,
      quality: q.label,
      degrees: idxs.map((idx) => degs[idx]!),
      notes,
      function: FUNCTIONS[i] ?? "",
      substitutions: SUBS[i] ?? [],
    });
  }
  return out;
}

/* ------------------------------------------------------------------ modal views */

/** The seven modal readings of one pitch collection (e.g. C Ionian family). */
export interface ModalView {
  modeName: string;
  root: string;
  degrees: Degree[];
  notes: string[];
  characteristic: string;
  scaleId: string;
}

export function majorModeViews(parentRoot: Root): ModalView[] {
  const ionian = SCALES.find((s) => s.id === "ionian")!;
  const parentNotes = ionian.degrees.map((d) => spellDegree(parentRoot, d));
  return MAJOR_MODE_NAMES.map((modeName, i) => {
    const def = SCALES.find((s) => s.modeOf?.family === "major" && s.modeOf.index === i)!;
    const modeRootName = parentNotes[i]!;
    const modeRoot: Root = {
      name: modeRootName,
      pc: (parentRoot.pc + degreeToSemitones(ionian.degrees[i]!)) % 12,
      letter: modeRootName[0]!,
      alter: modeRootName.length > 1 ? (modeRootName[1] === "#" ? 1 : -1) : 0,
    };
    return {
      modeName,
      root: modeRootName,
      degrees: def.degrees,
      notes: def.degrees.map((d) => spellDegree(modeRoot, d)),
      characteristic: def.characteristic ?? "",
      scaleId: def.id,
    };
  });
}

/** Parallel modes: same root, the seven different mode formulas. */
export function parallelModeViews(root: Root): ModalView[] {
  return MAJOR_MODE_NAMES.map((modeName, i) => {
    const def = SCALES.find((s) => s.modeOf?.family === "major" && s.modeOf.index === i)!;
    return {
      modeName,
      root: root.name,
      degrees: def.degrees,
      notes: def.degrees.map((d) => spellDegree(root, d)),
      characteristic: def.characteristic ?? "",
      scaleId: def.id,
    };
  });
}

/** Which major key does this mode of this root belong to? */
export function parentMajorOf(root: Root, modeIndex: number): string {
  const ionian = SCALES.find((s) => s.id === "ionian")!;
  const offset = degreeToSemitones(ionian.degrees[modeIndex] ?? "1");
  const pc = ((root.pc - offset) % 12 + 12) % 12;
  const preferFlats = preferFlatsFor(root);
  return chromaticName(pc, preferFlats);
}
