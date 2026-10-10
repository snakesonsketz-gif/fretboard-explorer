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
    const open = tuning.strings[si]!;
    const row: FretNote[] = [];
    for (let f = fretFrom; f <= fretTo; f++) {
      const pc = (open.pc + f) % 12;
      const hit = map.get(pc);
      row.push({
        string: si,
        fret: f,
        pc,
        inSet: !!hit,
        ...(hit ? { degree: hit.degree } : {}),
        noteName: hit ? hit.note : chromaticName(pc, preferFlats),
        ...(hit ? { intervalSemitones: hit.semis } : {}),
        isRoot: pc === root.pc,
      });
    }
    rows.push(row);
  }
  return rows;
}

export const INLAY_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
export const DOUBLE_INLAY = new Set([12, 24]);

export type Pathway = "none" | "vertical" | "horizontal" | "diagonal";

/**
 * Visual pathway through the notes already on the board (the set itself never changes).
 * vertical = every set note inside a fret window; horizontal = two adjacent strings
 * along the neck; diagonal = N notes per string climbing from the root on the lowest string.
 */
export function pathwayKeys(opts: {
  kind: Pathway;
  tuning: Tuning;
  root: Root;
  degrees: Degree[];
  fretFrom: number;
  fretTo: number;
  window?: { from: number; to: number } | null;
  stringPair?: number;
  perString?: number;
}): Set<string> | undefined {
  const { kind, tuning, root, degrees, fretFrom, fretTo } = opts;
  if (kind === "none") return undefined;
  const pcs = new Set([...degreeMap(root, degrees).keys()]);
  const keys = new Set<string>();
  const n = tuning.strings.length;
  if (kind === "vertical") {
    const from = opts.window?.from ?? fretFrom;
    const to = opts.window?.to ?? Math.min(fretTo, from + 4);
    for (let si = 0; si < n; si++)
      for (let f = from; f <= to; f++) if (pcs.has((tuning.strings[si]!.pc + f) % 12)) keys.add(`${si}-${f}`);
    return keys;
  }
  if (kind === "horizontal") {
    const a = Math.min(Math.max(0, opts.stringPair ?? 0), n - 2);
    for (const si of [a, a + 1])
      for (let f = fretFrom; f <= fretTo; f++) if (pcs.has((tuning.strings[si]!.pc + f) % 12)) keys.add(`${si}-${f}`);
    return keys;
  }
  // diagonal
  const per = opts.perString ?? 3;
  const midiOf = (si: number) => tuning.strings[si]!.pc + (tuning.strings[si]!.octave + 1) * 12;
  let start = (root.pc - tuning.strings[0]!.pc + 12) % 12;
  while (start < fretFrom) start += 12;
  if (start > fretTo) return keys;
  let pitch = midiOf(0) + start;
  for (let si = 0; si < n; si++) {
    let placed = 0;
    let p = pitch;
    while (placed < per && p - midiOf(si) <= 24) {
      if (pcs.has(((p % 12) + 12) % 12) && p - midiOf(si) >= 0) {
        keys.add(`${si}-${p - midiOf(si)}`);
        placed++;
      }
      p++;
    }
    pitch = p;
  }
  return keys;
}

export interface PathStep {
  string: number;
  fret: number;
  pc: number;
  midi: number;
}

/**
 * Ordered traversal of the set in true scale-degree (pitch) order, starting at the
 * lowest occurrence of `startPc` and continuing upward, so the degree order wraps
 * cyclically (e.g. 4-5-6-7-1-2-3-4...). Each pitch is played once, on the lowest
 * string that holds it within the allowed strings and fret window.
 */
export function orderedPathway(opts: {
  kind: Exclude<Pathway, "none">;
  tuning: Tuning;
  pcs: Set<number>;
  startPc: number;
  from: number;
  to: number;
  stringPair?: number;
  /**
   * Diagonal only: lowest fret later strings may use. A 3-notes-per-string shape often
   * drops a fret or two as it crosses strings, so it can sit below `from` (the window
   * start, which only decides where the start note is looked for). Defaults to `from`.
   */
  minFret?: number;
}): PathStep[] {
  const { kind, tuning, pcs, startPc, from, to } = opts;
  const n = tuning.strings.length;
  let strings: number[];
  if (kind === "horizontal") {
    const a = Math.min(Math.max(0, opts.stringPair ?? 0), n - 2);
    strings = [a, a + 1];
  } else if (kind === "diagonal") {
    const a = Math.min(Math.max(0, opts.stringPair ?? 0), Math.max(0, n - 3));
    strings = tuning.strings.map((_, i) => i).filter((x) => x >= a && x < a + 3);
  } else strings = tuning.strings.map((_, i) => i);
  if (kind === "diagonal") {
    // Classic 3-notes-per-string: the start degree on the chosen string, then the next
    // scale tones in pitch order, exactly three per string across three adjacent strings.
    // The shape is never bent to fit; it stops if a note would fall off the fret range.
    const s0 = strings[0];
    if (s0 === undefined || !pcs.has(startPc)) return [];
    const openMidi = (si: number) => tuning.strings[si]!.pc + (tuning.strings[si]!.octave + 1) * 12;
    const lo = Math.min(opts.minFret ?? from, from);
    const build = (startFret: number) => {
      const out: PathStep[] = [];
      let midi = openMidi(s0) + startFret;
      for (const si of strings) {
        for (let k = 0; k < 3; k++) {
          if (out.length) {
            do midi++;
            while (!pcs.has(midi % 12));
          }
          const fret = midi - openMidi(si);
          if (fret < lo || fret > to) return out;
          out.push({ string: si, fret, pc: midi % 12, midi });
        }
      }
      return out;
    };
    // Try the start note at/after the window start first, then just below it; take the
    // first occurrence whose shape fits completely (e.g. an open-string start whose next
    // string would need a negative fret moves up an octave), else the longest partial.
    const isStart = (f: number) => (tuning.strings[s0]!.pc + f) % 12 === startPc;
    const starts: number[] = [];
    for (let f = from; f <= to; f++) if (isStart(f)) starts.push(f);
    for (let f = from - 1; f >= lo; f--) if (isStart(f)) starts.push(f);
    let best: PathStep[] = [];
    for (const f of starts) {
      const path = build(f);
      if (path.length === strings.length * 3) return path;
      if (path.length > best.length) best = path;
    }
    return best;
  }
  const byMidi = new Map<number, PathStep>();
  for (const si of strings) {
    const s = tuning.strings[si]!;
    for (let f = from; f <= to; f++) {
      const pc = (s.pc + f) % 12;
      if (!pcs.has(pc)) continue;
      const midi = s.pc + (s.octave + 1) * 12 + f;
      if (!byMidi.has(midi)) byMidi.set(midi, { string: si, fret: f, pc, midi });
    }
  }
  const sorted = [...byMidi.values()].sort((x, y) => x.midi - y.midi);
  const i = sorted.findIndex((p) => p.pc === startPc);
  return i < 0 ? [] : sorted.slice(i);
}
