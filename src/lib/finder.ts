/**
 * Chord finder: from the notes fretted on the neck, every chord they could be, most likely first.
 *
 * Each reading tries every note as a possible root and every chord in the library. A reading is
 * kept when all the fretted notes belong to the chord, allowing the notes guitarists usually leave
 * out (the 5th; the 9th or 11th of a big chord; the root, when a bass player covers it). It's
 * scored on how players actually name chords: the lowest note as root first, common chords before
 * rare ones, complete chords before ones with notes missing, simple inversions before odd basses.
 */
import { CHORDS, bestRootFor, degreeToSemitones, parseDegree, spellDegree, type ChordDef, type Degree, type Root } from "./theory";

export interface FrettedNote {
  /** String index, low → high. */
  s: number;
  fret: number;
  midi: number;
}

export interface ChordReading {
  /** e.g. "Am7/C" or "C6 (no 5th)". */
  name: string;
  /** Name without slash or omissions, e.g. "Am7". */
  base: string;
  root: Root;
  def: ChordDef;
  /** Degree of each fretted note in this chord, same order as the input notes. */
  degrees: Degree[];
  /** Chord tones not played. */
  missing: Degree[];
  /** Short notes on why this reading ranks where it does. */
  why: string[];
  /** "root position", "1st inversion (3rd in the bass)", … */
  position: string;
  /** Raw score and the share of likelihood among all readings (0-1). */
  score: number;
  likelihood: number;
}

const pc12 = (n: number) => ((n % 12) + 12) % 12;

/** How often a chord type is the name people reach for. */
const COMMON: Record<string, number> = {
  maj: 22, min: 22, "5": 18, "7": 18, m7: 17, maj7: 15, sus4: 13, sus2: 13, add9: 12, "6": 11, dim: 11, m7b5: 11,
  m6: 10, "9": 11, "7sus4": 11, m9: 10, maj9: 10, aug: 9, dim7: 10, madd9: 9, "69": 8, "13": 8, "11": 6, m11: 7,
  mmaj7: 6, "7b9": 7, "7s9": 8, "7s11": 5, add11: 7, "7b5": 5, "7s5": 6, maj7s11: 6, m69: 6, "5add9": 6, "7no5": 4,
};
const FAMILY_COMMON: Record<ChordDef["family"], number> = {
  Triads: 8, Sixths: 5, Sevenths: 7, "Sus & add": 5, Extensions: 4, "Altered dominants": 3, "Diminished & augmented": 3,
  "Suspended & quartal": 2, "Shell & rootless": 0, "Upper structures & slash": 0, Clusters: 0,
};
/** The library's shell / slash / upper-structure entries are other names for chords read here with notes left out. */
const SKIP_FAMILIES = new Set<ChordDef["family"]>(["Shell & rootless", "Upper structures & slash"]);
const POOL = CHORDS.filter((c) => !SKIP_FAMILIES.has(c.family) && c.id !== "octave" && c.degrees.length >= 2);

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/** A note name a player would write: no double sharps/flats, no B#, E#, Cb, Fb. */
function plainName(spelled: string, pc: number, root: Root): string {
  if (!/(##|bb|x)$/.test(spelled) && !/^(B#|E#|Cb|Fb)$/.test(spelled)) return spelled;
  return (root.alter < 0 ? FLATS : SHARPS)[pc12(pc)]!;
}

const ORD = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Which missing chord tones are normal to leave out, and what each costs. */
function omissionCost(d: Degree, def: ChordDef): { cost: number; note: string } | null {
  const { number, alter } = parseDegree(d);
  const has = (n: number) => def.degrees.some((x) => parseDegree(x).number === n);
  if (number === 5 && alter === 0) return { cost: 4, note: "no 5th (often left out)" };
  if (number === 1) return { cost: 30, note: "no root (rootless — the bass would play it)" };
  if (number === 9 && (has(11) || has(13))) return { cost: 6, note: "no 9th (often left out of 11/13 chords)" };
  if (number === 11 && has(13)) return { cost: 3, note: "no 11th (usually left out of 13 chords)" };
  return null;
}

export function findChords(notes: FrettedNote[], limit = 40): ChordReading[] {
  if (notes.length < 2) return [];
  const sorted = [...notes].sort((a, b) => a.midi - b.midi);
  const pcs = [...new Set(sorted.map((n) => pc12(n.midi)))];
  if (pcs.length < 2) return [];
  const bassPc = pc12(sorted[0]!.midi);
  const out: ChordReading[] = [];
  for (let r = 0; r < 12; r++) {
    for (const def of POOL) {
      const tonePc = new Map<number, Degree>();
      for (const d of def.degrees) if (!tonePc.has(pc12(r + degreeToSemitones(d)))) tonePc.set(pc12(r + degreeToSemitones(d)), d);
      if (!pcs.every((p) => tonePc.has(p))) continue;
      const missing = def.degrees.filter((d) => !pcs.includes(pc12(r + degreeToSemitones(d))));
      let score = COMMON[def.id] ?? FAMILY_COMMON[def.family];
      const why: string[] = [];
      let bad = 0;
      const omitted: string[] = [];
      for (const d of missing) {
        const o = omissionCost(d, def);
        if (o) {
          score -= o.cost;
          why.push(o.note);
          omitted.push(parseDegree(d).number === 1 ? "no root" : `no ${ORD(parseDegree(d).number)}`);
        } else bad++;
      }
      // A chord tone that defines the chord (its 3rd, 7th, 6th, a sus or added note) has to be there.
      if (bad) continue;
      // A big chord with half its notes missing isn't a sensible name for a small shape.
      if (missing.length > Math.max(1, Math.floor(def.degrees.length / 2))) continue;
      if (!missing.length) {
        score += 30;
        why.unshift("every chord tone is there");
      }
      const root = bestRootFor(r, def.degrees);
      const bassDeg = tonePc.get(bassPc)!;
      let position: string;
      if (bassPc === r) {
        score += 28;
        position = "root position";
        why.unshift("lowest note is the root");
      } else {
        const { number, alter } = parseDegree(bassDeg);
        const rootPlayed = pcs.includes(r);
        score += rootPlayed ? 6 : 0;
        if (number === 3) {
          score -= 2;
          position = `1st inversion (${bassDeg} in the bass)`;
        } else if (number === 5 && alter === 0) {
          score -= 6;
          position = "2nd inversion (5th in the bass)";
        } else if (number === 7) {
          score -= 9;
          position = `3rd inversion (${bassDeg} in the bass)`;
        } else {
          score -= 15;
          position = `${bassDeg} in the bass`;
        }
        why.push(`lowest note is the ${bassDeg}, not the root`);
      }
      const base = `${root.name}${def.suffix}`;
      const slash = bassPc !== r ? `/${plainName(spellDegree(root, bassDeg), bassPc, root)}` : "";
      const omit = omitted.length ? ` (${omitted.join(", ")})` : "";
      out.push({
        name: `${base}${slash}${omit}`,
        base,
        root,
        def,
        degrees: notes.map((n) => tonePc.get(pc12(n.midi))!),
        missing,
        why,
        position,
        score,
        likelihood: 0,
      });
    }
  }
  // One entry per sound: two library chords with the same notes on the same root (C6 and
  // C(add13)) are one reading — the better-known name wins.
  const best = new Map<string, ChordReading>();
  for (const c of out) {
    const key = `${c.root.pc}|${c.def.degrees.map((d) => pc12(degreeToSemitones(d))).sort((a, b) => a - b).join(",")}|${c.missing.length}`;
    if (!best.has(key) || best.get(key)!.score < c.score) best.set(key, c);
  }
  const list = [...best.values()].sort((a, b) => b.score - a.score || a.def.degrees.length - b.def.degrees.length);
  const top = list[0]?.score ?? 0;
  const weights = list.map((c) => Math.exp((c.score - top) / 12));
  const sum = weights.reduce((a, b) => a + b, 0);
  list.forEach((c, i) => (c.likelihood = weights[i]! / sum));
  return list.slice(0, limit);
}

/** Display name of a fretted note's pitch, spelled for a reading. */
export function noteNameIn(reading: ChordReading, degree: Degree) {
  return spellDegree(reading.root, degree);
}
