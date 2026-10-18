/**
 * Tab playback: columns → timed notes on the shared sound engine. Techniques are sketched with
 * extra notes — a bend sounds its target, a trill alternates, tremolo picking repeats, a dive
 * drops away — so what you hear matches what's written.
 */
import { cellMidi, type TabDoc } from "./model";

export interface PlayEvent {
  /** Seconds from the start. */
  at: number;
  dur: number;
  col: number;
  midis: number[];
  /** Extra notes inside the column (bends, trills, tremolo picking, whammy, slides). */
  extras: { midi: number; at: number; vel: number }[];
  strum: number;
}

export function playEvents(doc: TabDoc, from = 0): PlayEvent[] {
  const spb = 60 / Math.max(30, doc.bpm);
  const out: PlayEvent[] = [];
  let t = 0;
  doc.cols.forEach((c, i) => {
    if (i < from) return;
    if (c.kind === "bar") return;
    const dur = c.beats * spb;
    if (c.kind === "notes") {
      const midis: number[] = [];
      const extras: PlayEvent["extras"] = [];
      const add = (midi: number, at: number, vel = 0.55) => extras.push({ midi, at: t + at, vel });
      c.cells.forEach((cell, s) => {
        const m = cellMidi(cell, doc.tuning.midis[s]!);
        if (m === null || !cell) return;
        const bend = cell.bend && cell.bend >= 1 ? Math.round(cell.bend) : 0;
        // A pre-bent note starts at the bent pitch.
        midis.push(cell.prebend && bend ? m + bend : m);
        if (bend && !cell.prebend) add(m + bend, Math.min(0.12, dur * 0.35));
        if (cell.release && bend) add(m, dur * 0.6, 0.45);
        if (cell.trill !== undefined) {
          const other = doc.tuning.midis[s]! + cell.trill;
          const step = Math.max(0.06, Math.min(0.1, dur / 6));
          for (let k = 1, x = step; x < dur - 0.02; k++, x += step) add(k % 2 ? other : m, x, 0.45);
        }
        if (c.fx?.includes("trem")) {
          const step = Math.max(0.055, Math.min(0.09, dur / 4));
          for (let x = step; x < dur - 0.02; x += step) add(m, x, 0.5);
        }
        if (c.fx?.includes("dive")) add(m - 7, dur * 0.5, 0.4);
        if (c.fx?.includes("dip")) {
          add(m - 1, dur * 0.3, 0.4);
          add(m, dur * 0.6, 0.4);
        }
        if (cell.out) add(m + (cell.out === "/" ? 3 : -3), dur * 0.7, 0.35);
      });
      out.push({ at: t, dur, col: i, midis, extras, strum: midis.length > 2 ? (c.strum === "up" ? -1 : 1) : 0 });
    }
    t += dur;
  });
  return out;
}

export const totalSeconds = (doc: TabDoc) => doc.cols.reduce((a, c) => a + (c.kind === "bar" ? 0 : c.beats), 0) * (60 / Math.max(30, doc.bpm));
