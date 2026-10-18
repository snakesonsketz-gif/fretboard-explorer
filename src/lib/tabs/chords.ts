/** Chord names → playable shapes on any tuning (open shapes on standard guitar, the chord finder otherwise). */
import { CHORDS, ROOTS, degreeToSemitones, type ChordDef } from "@/lib/theory";
import { findVoicings, type Shape } from "@/lib/voicings";
import type { Tuning } from "@/lib/fretboard";
import type { TabTuning } from "./model";

/** Well-known open and barre shapes for standard tuning (low E first). */
const STANDARD: Record<string, string> = {
  C: "x32010", D: "xx0232", E: "022100", F: "133211", G: "320003", A: "x02220", B: "x24442",
  Cm: "x35543", Dm: "xx0231", Em: "022000", Fm: "133111", Gm: "355333", Am: "x02210", Bm: "x24432",
  "F#m": "244222", "C#m": "x46654", "G#m": "466444", Bb: "x13331", Eb: "x68886", Ab: "466544", "F#": "244322",
  C7: "x32310", D7: "xx0212", E7: "020100", G7: "320001", A7: "x02020", B7: "x21202", F7: "131211",
  Cmaj7: "x32000", Dmaj7: "xx0222", Emaj7: "021100", Fmaj7: "xx3210", Gmaj7: "320002", Amaj7: "x02120",
  Am7: "x02010", Em7: "022030", Dm7: "xx0211", Bm7: "x20202", "F#m7": "242222", Cm7: "x35343", Gm7: "353333",
  Asus2: "x02200", Asus4: "x02230", Dsus2: "xx0230", Dsus4: "xx0233", Esus4: "022200", Csus2: "x30033", Gsus4: "330013",
  Cadd9: "x32030", Gadd9: "320203", Dadd9: "xx0230",
  E5: "022xxx", A5: "x022xx", D5: "xx023x", G5: "355xxx", C5: "x355xx", F5: "133xxx", B5: "x244xx",
  Bdim: "x2343x", Edim: "0120xx", Caug: "x3211x",
};

const SUFFIX_ALIASES: [RegExp, string][] = [
  [/^(?:maj|major|M)$/, ""],
  [/^(?:min|minor|mi|-)$/, "m"],
  [/^(?:M7|Δ7?|Δ|maj7|major7|major 7)$/, "maj7"],
  [/^(?:min7|minor7|minor 7|mi7|-7)$/, "m7"],
  [/^(?:dom7|dominant7|dominant 7|seven|7th)$/, "7"],
  [/^(?:power|power chord|5th)$/, "5"],
  [/^(?:sus)$/, "sus4"],
  [/^(?:°|o)$/, "dim"],
  [/^(?:ø|ø7|m7-5|min7b5)$/, "m7b5"],
  [/^(?:\+|#5)$/, "aug"],
  [/^(?:mmaj7|m\(maj7\)|minmaj7)$/, "m(maj7)"],
  [/^(?:madd9|m add9)$/, "m(add9)"],
];

export interface ChordName {
  root: (typeof ROOTS)[number];
  def: ChordDef;
  /** Bass note for slash chords ("G/B"), as a pitch class. */
  bassPc: number | null;
  /** The name as written for display, e.g. "F#m7". */
  label: string;
}

const ROOT_RE = /^([A-Ga-g])([#b♯♭]?)/;

/** Parse "Am7", "F#", "Bbmaj7", "G/B", "E5", "C major" … Returns null when it isn't a chord name. */
export function parseChordName(raw: string): ChordName | null {
  const s = raw.trim().replace(/♯/g, "#").replace(/♭/g, "b").replace(/\s+chord$/i, "");
  const m = ROOT_RE.exec(s);
  if (!m) return null;
  const rootName = m[1]!.toUpperCase() + (m[2] ?? "");
  const root = ROOTS.find((r) => r.name === rootName);
  if (!root) return null;
  let rest = s.slice(m[0].length).trim();
  let bassPc: number | null = null;
  const slash = /\/([A-Ga-g][#b]?)$/.exec(rest);
  if (slash) {
    const b = ROOTS.find((r) => r.name === slash[1]![0]!.toUpperCase() + slash[1]!.slice(1));
    if (!b) return null;
    bassPc = b.pc;
    rest = rest.slice(0, slash.index).trim();
  }
  for (const [re, to] of SUFFIX_ALIASES) if (re.test(rest)) rest = to;
  rest = rest.replace(/^minor\s*/i, "m").replace(/^major\s*/i, "maj");
  const def = CHORDS.find((c) => c.suffix === rest) ?? CHORDS.find((c) => c.suffix.toLowerCase() === rest.toLowerCase());
  if (!def) return null;
  const label = `${rootName}${def.suffix}${bassPc !== null ? `/${ROOTS.find((r) => r.pc === bassPc && r.name.length === 1)?.name ?? slash![1]}` : ""}`;
  return { root, def, bassPc, label };
}

const toFretboardTuning = (t: TabTuning): Tuning => ({
  id: t.id,
  name: t.name,
  instrument: "guitar",
  strings: t.midis.map((m, i) => ({ note: t.names[i] ?? "", pc: ((m % 12) + 12) % 12, octave: Math.floor(m / 12) - 1 })),
});

const parseShape = (s: string): Shape => [...s].map((c) => (c === "x" ? null : Number(c)));

const isStandardSix = (t: TabTuning) => t.midis.join(",") === "40,45,50,55,59,64";

/**
 * A shape for a chord on this tuning. `near` asks for a shape around a fret (e.g. "at the 5th fret").
 * Returns frets low → high (null = not played), or null when nothing playable exists.
 */
export function chordShape(name: ChordName, tuning: TabTuning, near?: number): Shape | null {
  const key = `${name.root.name}${name.def.suffix}`;
  if (isStandardSix(tuning) && name.bassPc === null && near === undefined) {
    const alias = key.replace(/^Db/, "C#").replace(/^Gb/, "F#").replace(/^A#/, "Bb").replace(/^D#/, "Eb").replace(/^G#(?!m)/, "Ab");
    const hit = STANDARD[key] ?? STANDARD[alias];
    if (hit) return parseShape(hit);
  }
  if (name.def.suffix === "5" && name.bassPc === null) {
    // Power chords: root on one of the two lowest strings, as low on the neck as it goes.
    const opts = [0, 1]
      .filter((st) => st < tuning.midis.length - 1)
      .map((st) => {
        let f = (((name.root.pc - tuning.midis[st]!) % 12) + 12) % 12;
        if (near !== undefined) while (f + 12 <= 24 && Math.abs(f + 12 - near) < Math.abs(f - near)) f += 12;
        return { st, f };
      })
      .sort((a, b) => (near === undefined ? a.f - b.f : Math.abs(a.f - near) - Math.abs(b.f - near)) || a.st - b.st);
    if (opts[0]) return powerChord(tuning, opts[0].st, opts[0].f);
  }
  const pcs = name.def.degrees.map((d) => (name.root.pc + degreeToSemitones(d)) % 12);
  if (name.bassPc !== null && !pcs.includes(name.bassPc)) pcs.push(name.bassPc);
  const ft = toFretboardTuning(tuning);
  const from = near === undefined ? 0 : Math.max(0, near - 1);
  const to = near === undefined ? 12 : Math.min(24, near + 5);
  const list = findVoicings({ tuning: ft, rootPc: name.root.pc, pcs, fretFrom: from, fretTo: to, bass: name.bassPc === null ? "root" : "any", maxSpan: 4, limit: 60 });
  const wanted = name.bassPc === null ? list : list.filter((v) => v.bassPc === name.bassPc);
  const pool = wanted.filter((v) => !v.doubtful);
  const pick = (pool.length ? pool : wanted).sort((a, b) => {
    const da = near === undefined ? a.minFret : Math.abs(a.minFret - near);
    const db = near === undefined ? b.minFret : Math.abs(b.minFret - near);
    return da - db || b.sounding - a.sounding || a.span - b.span;
  })[0];
  return pick ? pick.shape : null;
}

/** A power chord with its root on string `s` at fret `f`: root, fifth and (when it fits) the octave. */
export function powerChord(tuning: TabTuning, s: number, f: number): Shape {
  const shape: Shape = new Array(tuning.midis.length).fill(null);
  shape[s] = f;
  const root = tuning.midis[s]! + f;
  const want = [root + 7, root + 12];
  let k = 0;
  for (let i = s + 1; i < tuning.midis.length && k < want.length; i++) {
    const fret = want[k]! - tuning.midis[i]!;
    if (fret < 0 || fret > 24 || Math.abs(fret - f) > 4) break;
    shape[i] = fret;
    k++;
  }
  return shape;
}
