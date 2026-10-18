/**
 * Choosing where to play notes. Given pitches (from note names today, from a recording later),
 * pick a string and fret for each so the hand moves as little as possible — the core of
 * describe-by-note-name and the future audio-to-tab.
 */
import { MAX_FRET, type TabTuning } from "./model";

export interface Placed {
  s: number;
  fret: number;
}

/** Every string/fret that plays this MIDI note. */
export function positionsFor(midi: number, tuning: TabTuning, maxFret = MAX_FRET): Placed[] {
  const out: Placed[] = [];
  tuning.midis.forEach((open, s) => {
    const f = midi - open;
    if (f >= 0 && f <= maxFret) out.push({ s, fret: f });
  });
  return out;
}

/** One note, near the hand's current fret (or as low on the neck as possible). */
export function placeNote(midi: number, tuning: TabTuning, handAt?: number, onString?: number): Placed | null {
  const all = positionsFor(midi, tuning).filter((p) => onString === undefined || p.s === onString);
  if (!all.length) return null;
  const at = handAt ?? 0;
  return all.sort((a, b) => {
    const da = a.fret === 0 ? Math.min(at, 3) : Math.abs(a.fret - at);
    const db = b.fret === 0 ? Math.min(at, 3) : Math.abs(b.fret - at);
    return da - db || a.fret - b.fret;
  })[0]!;
}

/**
 * A melody (one pitch at a time) laid out with as little hand movement as possible: a shortest path
 * through the possible positions, where moving the hand costs more than staying in position.
 */
export function placeMelody(midis: number[], tuning: TabTuning, startAt = 0): (Placed | null)[] {
  const options = midis.map((m) => positionsFor(m, tuning));
  type Node = { cost: number; prev: number; hand: number };
  const layers: Node[][] = [];
  /** The hand covers four frets from its index finger: [hand, hand + 3]. Open strings fit anywhere. */
  const shiftTo = (hand: number, f: number) => (f === 0 || (f >= hand && f <= hand + 3) ? hand : f < hand ? f : f - 3);
  const shiftCost = (from: number, to: number) => (from === to ? 0 : 1 + 0.25 * Math.abs(to - from));
  options.forEach((opts, i) => {
    const prevLayer = i ? layers[i - 1]! : null;
    const prevOpts = i ? options[i - 1]! : null;
    layers.push(
      opts.map((o) => {
        if (!prevLayer || !prevOpts || !prevOpts.length) {
          const to = shiftTo(startAt, o.fret);
          return { cost: (to === startAt ? 0 : 0.5 + 0.2 * Math.abs(to - startAt)) + o.fret * 0.02, prev: -1, hand: to };
        }
        let best = { cost: Infinity, prev: -1, hand: 0 };
        prevLayer.forEach((p, j) => {
          const to = shiftTo(p.hand, o.fret);
          const skip = Math.max(0, Math.abs(o.s - prevOpts[j]!.s) - 1) * 0.4;
          const c = p.cost + shiftCost(p.hand, to) + skip + o.fret * 0.02;
          if (c < best.cost) best = { cost: c, prev: j, hand: to };
        });
        return best;
      }),
    );
  });
  // Walk back from the cheapest end.
  const out: (Placed | null)[] = new Array(midis.length).fill(null);
  let i = layers.length - 1;
  while (i >= 0 && !layers[i]!.length) i--;
  if (i < 0) return out;
  let j = layers[i]!.reduce((b, n, k) => (n.cost < layers[i]![b]!.cost ? k : b), 0);
  for (; i >= 0; i--) {
    if (!options[i]!.length) continue;
    out[i] = options[i]![j]!;
    const p = layers[i]![j]!.prev;
    if (p < 0) {
      // Restart the walk on the previous non-empty layer.
      let k = i - 1;
      while (k >= 0 && !layers[k]!.length) k--;
      if (k >= 0) j = layers[k]!.reduce((b, n, m) => (n.cost < layers[k]![b]!.cost ? m : b), 0);
    } else j = p;
  }
  return out;
}
