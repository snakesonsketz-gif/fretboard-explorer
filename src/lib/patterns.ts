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
  kind: "position" | "per-string";
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
  /** Widest reach on one string, in frets (last − first). */
  reach: number;
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

  const order: Record<VoicingLevel, number> = { easy: 0, stretch: 1, impossible: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level] || (a.kind === b.kind ? 0 : a.kind === "position" ? -1 : 1) || a.from - b.from);
}
