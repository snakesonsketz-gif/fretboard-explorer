/**
 * Progression builder: pick a key and mode, see every diatonic chord with its job (tonic, subdominant,
 * dominant), borrow chords from other modes or keys, add any chord, set each chord's length in beats,
 * and hand the result to Jam, an Explore song or the Sequencer (and take one back from any of them).
 * Pure — no DOM or audio — so it can be tested.
 */
import { CHORDS, ROOTS, SCALES, degreeToSemitones, rootByName, spellDegree, type ChordDef, type ScaleDef } from "@/lib/theory";
import { rootFor } from "@/lib/modes";
import { newId } from "@/lib/timeline";

export type Fn = "tonic" | "subdominant" | "dominant";

export interface ProgChord {
  id: string;
  rootName: string;
  chordId: string;
  /** Slash bass, if any ("G/B"). */
  bassName?: string | undefined;
  beats: number;
  /** Where it was borrowed from, for display ("A Aeolian"). */
  from?: string | undefined;
}

export interface Progression {
  keyRoot: string;
  scaleId: string;
  beatsPerBar: number;
  bpm: number;
  chords: ProgChord[];
}

export const emptyProgression = (): Progression => ({ keyRoot: "C", scaleId: "ionian", beatsPerBar: 4, bpm: 90, chords: [] });

export const FN_LABEL: Record<Fn, string> = { tonic: "Tonic", subdominant: "Subdominant", dominant: "Dominant" };
export const FN_SHORT: Record<Fn, string> = { tonic: "T", subdominant: "S", dominant: "D" };
export const FN_MEANING: Record<Fn, string> = {
  tonic: "Home — rest, arrival.",
  subdominant: "Leaves home — lift, movement.",
  dominant: "Tension that wants to return home.",
};

/** Seven-note scales usable as a key / mode. */
export const KEY_MODES: ScaleDef[] = SCALES.filter((s) => s.degrees.length === 7);
export const modeDef = (id: string): ScaleDef => KEY_MODES.find((s) => s.id === id) ?? KEY_MODES[0]!;
export const chordById = (id: string): ChordDef => CHORDS.find((c) => c.id === id) ?? CHORDS[0]!;

const pc12 = (n: number) => ((n % 12) + 12) % 12;
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** A chord's pitch classes. */
export function pcsOf(rootName: string, chordId: string): number[] {
  const root = rootByName(rootName);
  return [...new Set(chordById(chordId).degrees.map((d) => pc12(root.pc + degreeToSemitones(d))))];
}

/** The scale's pitch classes. */
export function scalePcs(keyRoot: string, scaleId: string): number[] {
  const root = rootByName(keyRoot);
  return modeDef(scaleId).degrees.map((d) => pc12(root.pc + degreeToSemitones(d)));
}

/** First chord type whose interval set equals `intervals` (semitones above its root). */
export function chordIdForIntervals(intervals: number[]): string | null {
  const set = [...new Set(intervals.map(pc12))];
  return CHORDS.find((c) => sameSet([...new Set(c.degrees.map((d) => pc12(degreeToSemitones(d))))], set))?.id ?? null;
}

/** Chord type from a list of degrees (e.g. an Explore song slot), by its sound. */
export const chordIdForDegrees = (degrees: string[]): string | null => chordIdForIntervals(degrees.map((d) => degreeToSemitones(d)));

/* ------------------------------------------------------------------ roman numerals and function */

const NUMERALS = ["I", "bII", "II", "bIII", "III", "IV", "bV", "V", "bVI", "VI", "bVII", "VII"];

/** Roman numeral of a chord against the home tonic (numerals read against the major scale: bIII, bVI, bVII…). */
export function romanOf(homePc: number, chordRootPc: number, def: ChordDef): string {
  const d = pc12(chordRootPc - homePc);
  const minorish = def.degrees.includes("b3");
  let base = NUMERALS[d]!;
  if (minorish) base = base.toLowerCase();
  let s = def.suffix;
  if (minorish && s.startsWith("m") && !s.startsWith("maj")) s = s.slice(1);
  if (s === "7b5" || s === "m7b5") s = minorish ? "ø" : s;
  s = s.replace(/^dim/, "°").replace(/^aug$/, "+");
  return base + s;
}

const isDominantType = (def: ChordDef) => def.degrees.includes("3") && def.degrees.includes("b7");

const DETAIL: Record<number, { fn: Fn; text: string }> = {
  0: { fn: "tonic", text: "home" },
  1: { fn: "subdominant", text: "Neapolitan-style lift" },
  2: { fn: "subdominant", text: "predominant" },
  3: { fn: "tonic", text: "tonic substitute" },
  4: { fn: "tonic", text: "tonic substitute" },
  5: { fn: "subdominant", text: "the classic lift away" },
  6: { fn: "dominant", text: "tritone — tense" },
  7: { fn: "dominant", text: "pulls home" },
  8: { fn: "tonic", text: "tonic colour (modal)" },
  9: { fn: "tonic", text: "tonic substitute" },
  10: { fn: "subdominant", text: "modal subdominant" },
  11: { fn: "dominant", text: "leading tone — resolves up" },
};

export interface Analysis {
  roman: string;
  fn: Fn;
  /** Short note on its job ("tonic substitute", "secondary dominant V7/ii"…). */
  detail: string;
  /** Every note is in the home key's scale. */
  inKey: boolean;
}

/** What a chord does in the home key. */
export function analyze(keyRoot: string, scaleId: string, rootName: string, chordId: string): Analysis {
  const home = rootByName(keyRoot).pc;
  const def = chordById(chordId);
  const cpc = rootByName(rootName).pc;
  const d = pc12(cpc - home);
  const scale = scalePcs(keyRoot, scaleId);
  const inKey = pcsOf(rootName, chordId).every((p) => scale.includes(p));
  const base = DETAIL[d]!;
  let fn = base.fn;
  let detail = base.text;
  if (isDominantType(def) && d !== 0 && d !== 10 && d !== 7) {
    // A dominant chord that isn't V: it points a fifth lower.
    const target = pc12(cpc + 5);
    if (scale.includes(target)) {
      const tgt = diatonicChords(keyRoot, scaleId, false).find((c) => rootByName(c.rootName).pc === target);
      fn = "dominant";
      detail = `secondary dominant${tgt ? ` — V/${tgt.roman}` : ""}`;
    }
  } else if (isDominantType(def) && d === 7) {
    detail = "dominant — pulls home";
  }
  return { roman: romanOf(home, cpc, def), fn, detail, inKey };
}

export const analyzeChord = (p: Pick<Progression, "keyRoot" | "scaleId">, c: Pick<ProgChord, "rootName" | "chordId">): Analysis =>
  analyze(p.keyRoot, p.scaleId, c.rootName, c.chordId);

/* ------------------------------------------------------------------ chords of a key */

export interface ChordOption {
  rootName: string;
  chordId: string;
  label: string;
  notes: string[];
  roman: string;
  fn: Fn;
  detail: string;
  /** In the home key's scale (always true for the home key's own chords). */
  inKey: boolean;
  /** "A Aeolian" when it comes from another mode or key. */
  from: string;
}

export const chordLabel = (rootName: string, chordId: string, bassName?: string) => `${rootName}${chordById(chordId).suffix}${bassName ? `/${bassName}` : ""}`;

/**
 * Every diatonic chord of `keyRoot` + `scaleId`, stacked in thirds. `home` is the key the numerals
 * and functions are read against (defaults to the same key; pass the home key when borrowing).
 */
export function diatonicChords(keyRoot: string, scaleId: string, seventh: boolean, home?: { keyRoot: string; scaleId: string }): ChordOption[] {
  const scale = modeDef(scaleId);
  const root = rootByName(keyRoot);
  const semis = scale.degrees.map(degreeToSemitones);
  const h = home ?? { keyRoot, scaleId };
  const out: ChordOption[] = [];
  for (let i = 0; i < 7; i++) {
    const pick = seventh ? [0, 2, 4, 6] : [0, 2, 4];
    const idxs = pick.map((p) => (i + p) % 7);
    const abs = pick.map((p) => semis[(i + p) % 7]! + (i + p >= 7 ? 12 : 0));
    const chordId = chordIdForIntervals(abs.map((v) => v - abs[0]!));
    if (!chordId) continue;
    const spelled = spellDegree(root, scale.degrees[i]!);
    const rootName = rootFor(spelled, root.pc + semis[i]!).name;
    const a = analyze(h.keyRoot, h.scaleId, rootName, chordId);
    out.push({
      rootName,
      chordId,
      label: chordLabel(rootName, chordId),
      notes: idxs.map((idx) => spellDegree(root, scale.degrees[idx]!)),
      roman: a.roman,
      fn: a.fn,
      detail: a.detail,
      inKey: a.inKey,
      from: `${keyRoot} ${scale.name}`,
    });
  }
  return out;
}

/** Quick borrowing sources: same-root modes (modal interchange) and the neighbouring keys. */
export function borrowSources(keyRoot: string, scaleId: string): { root: string; scaleId: string; label: string }[] {
  const root = rootByName(keyRoot);
  const names = (pcOff: 5 | 7) => rootFor(spellDegree(root, pcOff === 7 ? "5" : "4"), root.pc + pcOff).name;
  const same = ["aeolian", "dorian", "phrygian", "lydian", "mixolydian", "ionian", "locrian", "harmonic-minor", "melodic-minor"]
    .filter((id) => id !== scaleId && KEY_MODES.some((m) => m.id === id))
    .map((id) => ({ root: keyRoot, scaleId: id, label: `${keyRoot} ${modeDef(id).name}` }));
  return [
    ...same,
    { root: names(7), scaleId, label: `${names(7)} ${modeDef(scaleId).name} (V key)` },
    { root: names(5), scaleId, label: `${names(5)} ${modeDef(scaleId).name} (IV key)` },
  ];
}

/* ------------------------------------------------------------------ editing */

export function makeProgChord(rootName: string, chordId: string, beats: number, opts: { bassName?: string | undefined; from?: string | undefined } = {}): ProgChord {
  return { id: newId(), rootName, chordId, beats: Math.max(0.5, Math.min(64, beats)), bassName: opts.bassName, from: opts.from };
}

export const totalBeats = (p: Pick<Progression, "chords">) => p.chords.reduce((n, c) => n + c.beats, 0);

/** Distinct functions in playing order, e.g. "Tonic → Subdominant → Dominant → Tonic". */
export function functionPath(p: Progression): string {
  const out: string[] = [];
  for (const c of p.chords) {
    const f = FN_LABEL[analyzeChord(p, c).fn];
    if (out[out.length - 1] !== f) out.push(f);
  }
  return out.join(" → ");
}

/** Text form, same syntax as Jam: "G D Em C*2 Am:3" (":n" = n beats, "*n" = n bars). */
export function progressionToText(p: Progression): string {
  return p.chords
    .map((c) => {
      const label = chordLabel(c.rootName, c.chordId, c.bassName);
      return c.beats === p.beatsPerBar ? label : c.beats % p.beatsPerBar === 0 ? `${label}*${c.beats / p.beatsPerBar}` : `${label}:${c.beats}`;
    })
    .join(" ");
}

/** Raise (+1) or lower (-1) a note name by a semitone: lands on a natural note when it can, else sharp going up, flat going down. */
export function shiftNote(name: string, dir: 1 | -1): string {
  const pc = pc12(rootByName(name).pc + dir);
  const hit = (pred: (n: string) => boolean) => ROOTS.find((r) => r.pc === pc && pred(r.name))?.name;
  return hit((n) => n.length === 1) ?? hit((n) => (dir === 1 ? n.endsWith("#") : n.endsWith("b"))) ?? rootFor("", pc).name;
}

/** The same chord moved a semitone: root and slash bass both shift, quality stays. */
export function shiftChord(c: ProgChord, dir: 1 | -1): ProgChord {
  return { ...c, rootName: shiftNote(c.rootName, dir), bassName: c.bassName ? shiftNote(c.bassName, dir) : undefined, from: undefined };
}
