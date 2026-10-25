/**
 * Every way to play a scale or arpeggio on the neck, as fingerable patterns:
 * - CAGED position boxes (all the notes inside one hand position), and
 * - N-notes-per-string patterns (3 per string for 6+ note scales, 2 per string for
 *   pentatonics and arpeggios), one starting on each note of the set on the lowest string.
 * Each is rated for the hand: playable, a big stretch, or impossible for a human.
 */
import { cagedPositions, scaleWindow } from "./caged";
import type { Tuning } from "./fretboard";
import type { VoicingLevel } from "./voicings";

export interface PatternNote {
  string: number;
  fret: number;
  midi: number;
  pc: number;
}

export interface NeckPattern {
  kind: "position" | "per-string" | "one-per-string";
  /** Stable id, e.g. "pos-E-7" or "nps3-5". */
  id: string;
  /** Short name: "E shape", "3 per string". */
  name: string;
  /** Pitch class the pattern starts from (lowest note) — for "from the 5th" labels. */
  startPc: number;
  from: number;
  to: number;
  /** The notes, low to high in pitch. */
  notes: PatternNote[];
  level: VoicingLevel;
  /** Widest reach on one string, in frets (last − first); for one-per-string shapes, the whole shape. */
  reach: number;
  /** Notes added for hammer-ons / pull-offs ("string-fret" keys). */
  extras?: Set<string> | undefined;
  /** Strings used (one-per-string shapes). */
  strings?: number | undefined;
}

export type ExtraNotes = "off" | "top" | "fit";

/**
 * One note per string arpeggios (sweep shapes): start on a chord tone on any string and climb
 * through the next chord tone on each higher string. With extra notes, a string also takes the
 * following chord tone when it lies within a short reach — played as a hammer-on going up and
 * a pull-off coming down ("top" = only the top string, the classic sweep turnaround; "fit" =
 * every string where it fits).
 */
export function onePerString(tuning: Tuning, pcs: number[], maxFret = 24, extras: ExtraNotes = "off"): NeckPattern[] {
  const set = new Set(pcs.map((p) => ((p % 12) + 12) % 12));
  if (set.size < 3) return [];
  const n = tuning.strings.length;
  const out: NeckPattern[] = [];
  const seen = new Set<string>();
  const nextTone = (m: number) => {
    let x = m + 1;
    while (!set.has(x % 12)) x++;
    return x;
  };
  for (let s0 = 0; s0 <= n - 3; s0++)
    for (let f0 = 0; f0 <= maxFret; f0++) {
      const pc0 = (tuning.strings[s0]!.pc + f0) % 12;
      if (!set.has(pc0)) continue;
      const notes: PatternNote[] = [];
      const extra = new Set<string>();
      let midi = openMidi(tuning, s0) + f0;
      let ok = true;
      for (let si = s0; si < n && ok; si++) {
        if (si > s0) midi = nextTone(midi);
        const fret = midi - openMidi(tuning, si);
        if (fret < 0 || fret > maxFret) {
          ok = false;
          break;
        }
        notes.push({ string: si, fret, midi, pc: midi % 12 });
        const wantExtra = extras === "fit" || (extras === "top" && si === n - 1);
        if (wantExtra) {
          const m2 = nextTone(midi);
          const f2 = m2 - openMidi(tuning, si);
          const fr = [...notes.map((x) => x.fret), f2].filter((f) => f > 0);
          const compact = Math.max(...fr) - Math.min(...fr) <= 4;
          if (compact && f2 <= maxFret && (si === n - 1 || m2 - openMidi(tuning, si + 1) >= 0)) {
            notes.push({ string: si, fret: f2, midi: m2, pc: m2 % 12 });
            extra.add(`${si}-${f2}`);
            midi = m2;
          }
        }
      }
      if (!ok || notes.length < 3) continue;
      const key = notes.map((x) => `${x.string}-${x.fret}`).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      const frets = notes.map((x) => x.fret).filter((f) => f > 0);
      const from = frets.length ? Math.min(...frets) : 0;
      const to = Math.max(0, ...notes.map((x) => x.fret));
      const span = to - (notes.some((x) => x.fret === 0) ? 0 : from);
      const strings = n - s0;
      out.push({
        kind: "one-per-string",
        id: `ops-${s0}-${f0}-${extras}`,
        name: extra.size ? `1 per string + hammer-ons, ${strings} strings` : `1 per string, ${strings} strings`,
        startPc: pc0,
        from: notes.some((x) => x.fret === 0) ? 0 : from,
        to,
        notes,
        level: span >= 6 ? "impossible" : span === 5 ? "stretch" : "easy",
        reach: span,
        extras: extra.size ? extra : undefined,
        strings,
      });
    }
  const order: Record<VoicingLevel, number> = { known: 0, easy: 1, stretch: 2, impossible: 3 };
  // Full sweeps first (most strings), then up the neck.
  return out.sort((a, b) => order[a.level] - order[b.level] || (b.strings ?? 0) - (a.strings ?? 0) || a.from - b.from);
}

const openMidi = (t: Tuning, si: number) => t.strings[si]!.pc + (t.strings[si]!.octave + 1) * 12;

/**
 * A reach of up to 4 frets on one string (one finger per fret, plus a slide or small stretch)
 * is normal; 5 is a big stretch; 6 or more no hand covers without shifting — "impossible" as a
 * fixed hand shape.
 */
function levelFor(reach: number): VoicingLevel {
  if (reach >= 6) return "impossible";
  return reach === 5 ? "stretch" : "easy";
}

function reachOf(notes: PatternNote[]) {
  const by = new Map<number, number[]>();
  for (const n of notes) by.set(n.string, [...(by.get(n.string) ?? []), n.fret]);
  let r = 0;
  for (const fs of by.values()) r = Math.max(r, Math.max(...fs) - Math.min(...fs));
  return r;
}

export function neckPatterns(tuning: Tuning, rootPc: number, pcs: number[], maxFret = 24): NeckPattern[] {
  const set = new Set(pcs.map((p) => ((p % 12) + 12) % 12));
  if (!set.size) return [];
  const n = tuning.strings.length;
  const out: NeckPattern[] = [];

  // CAGED position boxes (six strings and up).
  for (const pos of cagedPositions(tuning, rootPc, maxFret)) {
    const win = scaleWindow(pos, 0, maxFret);
    const notes: PatternNote[] = [];
    for (let si = 0; si < n; si++)
      for (let f = win.from; f <= win.to; f++) {
        const pc = (tuning.strings[si]!.pc + f) % 12;
        if (set.has(pc)) notes.push({ string: si, fret: f, midi: openMidi(tuning, si) + f, pc });
      }
    if (!notes.length) continue;
    notes.sort((a, b) => a.midi - b.midi || a.string - b.string);
    // A position box is played with one finger per fret plus a one-fret stretch either side,
    // so a five-fret reach is normal there.
    const reach = reachOf(notes);
    out.push({ kind: "position", id: `pos-${pos.form}-${pos.rootFret}`, name: `${pos.form} shape`, startPc: notes[0]!.pc, from: win.from, to: win.to, notes, level: reach >= 6 ? "stretch" : "easy", reach });
  }

  // N notes per string, starting on each note of the set on the lowest string.
  const per = set.size >= 6 ? 3 : 2;
  if (set.size >= 3)
    for (let f0 = 0; f0 <= maxFret; f0++) {
      const pc0 = (tuning.strings[0]!.pc + f0) % 12;
      if (!set.has(pc0)) continue;
      const notes: PatternNote[] = [];
      let midi = openMidi(tuning, 0) + f0;
      let ok = true;
      for (let si = 0; si < n && ok; si++)
        for (let k = 0; k < per; k++) {
          if (notes.length) {
            do midi++;
            while (!set.has(midi % 12));
          }
          const fret = midi - openMidi(tuning, si);
          if (fret < 0 || fret > maxFret) {
            ok = false;
            break;
          }
          notes.push({ string: si, fret, midi, pc: midi % 12 });
        }
      if (!ok) continue;
      const frets = notes.map((x) => x.fret);
      const reach = reachOf(notes);
      out.push({ kind: "per-string", id: `nps${per}-${f0}`, name: `${per} per string`, startPc: pc0, from: Math.min(...frets), to: Math.max(...frets), notes, level: levelFor(reach), reach });
    }

  const order: Record<VoicingLevel, number> = { known: 0, easy: 1, stretch: 2, impossible: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level] || (a.kind === b.kind ? 0 : a.kind === "position" ? -1 : 1) || a.from - b.from);
}
