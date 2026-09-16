import { chromaticName, degreeToSemitones, spellDegree, type Degree, type Root } from "./theory";

export interface Tuning {
  id: string;
  name: string;
  /** Low string first, as MIDI-ish pitch classes with octave offsets. */
  strings: { note: string; pc: number; octave: number }[];
  instrument: "guitar" | "bass" | "other";
}

function s(note: string, pc: number, octave: number) {
  return { note, pc, octave };
}

/**
 * Tunings are listed low string first. The architecture supports any number of
 * strings, so bass and extended-range instruments work with no UI changes.
 */
export const TUNINGS: Tuning[] = [
  {
    id: "standard",
    name: "Standard (E A D G B E)",
    instrument: "guitar",
    strings: [s("E", 4, 2), s("A", 9, 2), s("D", 2, 3), s("G", 7, 3), s("B", 11, 3), s("E", 4, 4)],
  },
  {
    id: "drop-d",
    name: "Drop D (D A D G B E)",
    instrument: "guitar",
    strings: [s("D", 2, 2), s("A", 9, 2), s("D", 2, 3), s("G", 7, 3), s("B", 11, 3), s("E", 4, 4)],
  },
  {
    id: "eb",
    name: "Eb standard (half step down)",
    instrument: "guitar",
    strings: [
      s("Eb", 3, 2),
      s("Ab", 8, 2),
      s("Db", 1, 3),
      s("Gb", 6, 3),
      s("Bb", 10, 3),
      s("Eb", 3, 4),
    ],
  },
  {
    id: "d-standard",
    name: "D standard (whole step down)",
    instrument: "guitar",
    strings: [s("D", 2, 2), s("G", 7, 2), s("C", 0, 3), s("F", 5, 3), s("A", 9, 3), s("D", 2, 4)],
  },
  {
    id: "dadgad",
    name: "DADGAD",
    instrument: "guitar",
    strings: [s("D", 2, 2), s("A", 9, 2), s("D", 2, 3), s("G", 7, 3), s("A", 9, 3), s("D", 2, 4)],
  },
  {
    id: "open-g",
    name: "Open G (D G D G B D)",
    instrument: "guitar",
    strings: [s("D", 2, 2), s("G", 7, 2), s("D", 2, 3), s("G", 7, 3), s("B", 11, 3), s("D", 2, 4)],
  },
  {
    id: "open-d",
    name: "Open D (D A D F# A D)",
    instrument: "guitar",
    strings: [s("D", 2, 2), s("A", 9, 2), s("D", 2, 3), s("F#", 6, 3), s("A", 9, 3), s("D", 2, 4)],
  },
  {
    id: "seven",
    name: "7-string (B E A D G B E)",
    instrument: "guitar",
    strings: [
      s("B", 11, 1),
      s("E", 4, 2),
      s("A", 9, 2),
      s("D", 2, 3),
      s("G", 7, 3),
      s("B", 11, 3),
      s("E", 4, 4),
    ],
  },
  {
    id: "eight",
    name: "8-string (F# B E A D G B E)",
    instrument: "guitar",
    strings: [
      s("F#", 6, 1),
      s("B", 11, 1),
      s("E", 4, 2),
      s("A", 9, 2),
      s("D", 2, 3),
      s("G", 7, 3),
      s("B", 11, 3),
      s("E", 4, 4),
    ],
  },
  {
    id: "bass4",
    name: "Bass 4-string (E A D G)",
    instrument: "bass",
    strings: [s("E", 4, 1), s("A", 9, 1), s("D", 2, 2), s("G", 7, 2)],
  },
  {
    id: "bass5",
    name: "Bass 5-string (B E A D G)",
    instrument: "bass",
    strings: [s("B", 11, 0), s("E", 4, 1), s("A", 9, 1), s("D", 2, 2), s("G", 7, 2)],
  },
];

export interface FretNote {
  string: number;
  fret: number;
  pc: number;
  inSet: boolean;
  degree?: Degree;
  noteName: string;
  intervalSemitones?: number;
  isRoot: boolean;
}

export interface BuildOptions {
  tuning: Tuning;
  fretFrom: number;
  fretTo: number;
  root: Root;
  degrees: Degree[];
  preferFlats: boolean;
}

/** Map every degree of the set to its pitch class and label. */
export function degreeMap(root: Root, degrees: Degree[]) {
  const map = new Map<number, { degree: Degree; note: string; semis: number }>();
  for (const d of degrees) {
    const semis = degreeToSemitones(d);
    const pc = ((root.pc + semis) % 12 + 12) % 12;
    if (!map.has(pc)) map.set(pc, { degree: d, note: spellDegree(root, d), semis: semis % 12 });
  }
  return map;
}

export function buildFretboard(opts: BuildOptions): FretNote[][] {
  const { tuning, fretFrom, fretTo, root, degrees, preferFlats } = opts;
  const map = degreeMap(root, degrees);
  const rows: FretNote[][] = [];
  for (let si = 0; si < tuning.strings.length; si++) {
    const open = tuning.strings[si];
    const row: FretNote[] = [];
    for (let f = fretFrom; f <= fretTo; f++) {
      const pc = (open.pc + f) % 12;
      const hit = map.get(pc);
      row.push({
        string: si,
        fret: f,
        pc,
        inSet: !!hit,
        degree: hit?.degree,
        noteName: hit ? hit.note : chromaticName(pc, preferFlats),
        intervalSemitones: hit?.semis,
        isRoot: pc === root.pc,
      });
    }
    rows.push(row);
  }
  return rows;
}

export const INLAY_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
export const DOUBLE_INLAY = new Set([12, 24]);
