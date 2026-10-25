/** MIDI → tab: picks string and fret for every note, quantizes the rhythm and adds bar lines. */
import { barCol, colId, emptyCells, emptyDoc, MAX_FRET, restCol, type Column, type TabDoc, type TabTuning } from "@/lib/tabs/model";
import { placeChord, placeNote, placeMelody } from "@/lib/tabs/place";
import type { MidiFile } from "./parse";

export interface MidiToTabOptions {
  tracks: number[];
  /** Grid in beats: 0.25 = sixteenths, 0.125 = 32nds, 1/3 = eighth-note triplets. */
  grid: number;
  /** Move notes too low or too high for the instrument by octaves until they fit. */
  fit: boolean;
  /** Highest fret to use. */
  maxFret?: number;
}

export interface MidiToTabResult {
  doc: TabDoc;
  /** Notes moved by an octave to fit, and notes left out. */
  moved: number;
  dropped: number;
}

export function midiToTab(f: MidiFile, tuning: TabTuning, o: MidiToTabOptions, title = "MIDI"): MidiToTabResult {
  const maxFret = o.maxFret ?? Math.min(MAX_FRET, 22);
  const lo = Math.min(...tuning.midis);
  const hi = Math.max(...tuning.midis) + maxFret;
  const gridTicks = Math.max(1, Math.round(f.ppq * o.grid));
  let moved = 0;
  let dropped = 0;
  const all = o.tracks.flatMap((i) => f.tracks[i]?.notes ?? []);
  // Group notes that start on the same grid step.
  const groups = new Map<number, { midis: number[]; end: number }>();
  for (const nt of all) {
    let m = nt.midi;
    if (o.fit) {
      while (m < lo) {
        m += 12;
        moved++;
      }
      while (m > hi) {
        m -= 12;
        moved++;
      }
    }
    if (m < lo || m > hi) {
      dropped++;
      continue;
    }
    const q = Math.round(nt.ticks / gridTicks) * gridTicks;
    const g = groups.get(q) ?? { midis: [], end: 0 };
    if (!g.midis.includes(m)) g.midis.push(m);
    g.end = Math.max(g.end, q + Math.max(gridTicks, Math.round(nt.durTicks / gridTicks) * gridTicks));
    groups.set(q, g);
  }
  const onsets = [...groups.keys()].sort((a, b) => a - b);
  const n = tuning.midis.length;
  const barTicks = Math.round((f.ppq * 4 * f.timeSig.num) / f.timeSig.den);
  const cols: Column[] = [];
  let hand = 0;
  let nextBar = barTicks;
  // Single-note runs are laid out together so the hand moves as little as possible.
  const singles = new Map<number, ReturnType<typeof placeMelody>[number]>();
  let run: number[] = [];
  const flush = () => {
    if (!run.length) return;
    const placed = placeMelody(run.map((t) => groups.get(t)!.midis[0]!), tuning, hand);
    run.forEach((t, i) => singles.set(t, placed[i]!));
    const last = [...placed].reverse().find((p) => p && p.fret > 0);
    if (last) hand = Math.max(0, last.fret - 1);
    run = [];
  };
  for (const t of onsets) {
    if (groups.get(t)!.midis.length === 1) run.push(t);
    else flush();
  }
  flush();
  hand = 0;
  // Leading silence.
  if (onsets.length && onsets[0]! > 0) {
    let lead = onsets[0]!;
    while (lead >= barTicks) {
      cols.push(restCol(n, (barTicks / f.ppq) as number), barCol(n));
      lead -= barTicks;
      nextBar += barTicks;
    }
    if (lead > 0) cols.push(restCol(n, lead / f.ppq));
  }
  onsets.forEach((t, i) => {
    while (t >= nextBar) {
      if (cols.length && cols[cols.length - 1]!.kind !== "bar") cols.push(barCol(n));
      nextBar += barTicks;
    }
    const g = groups.get(t)!;
    const next = onsets[i + 1] ?? g.end;
    let placed = g.midis.length === 1 ? [singles.get(t) ?? placeNote(g.midis[0]!, tuning, hand)].filter((x): x is NonNullable<typeof x> => !!x) : placeChord(g.midis, tuning, hand, maxFret);
    if (!placed.length) {
      dropped += g.midis.length;
      placed = [];
    } else dropped += g.midis.length - placed.length;
    const fr = placed.filter((p) => p.fret > 0).map((p) => p.fret);
    if (fr.length) hand = Math.min(...fr);
    const cells = emptyCells(n);
    for (const p of placed) cells[p.s] = { fret: p.fret };
    const sounding = Math.min(next, g.end) - t;
    const gap = next - t;
    // A note that stops well before the next one leaves a rest.
    if (next - g.end >= f.ppq && gap > sounding) {
      cols.push({ id: colId(), kind: "notes", cells, beats: sounding / f.ppq });
      cols.push(restCol(n, (next - g.end) / f.ppq));
    } else cols.push({ id: colId(), kind: "notes", cells, beats: Math.max(gridTicks, gap) / f.ppq });
  });
  const doc = emptyDoc(tuning.id);
  doc.tuning = tuning;
  doc.title = title;
  doc.bpm = Math.max(30, Math.min(300, Math.round(f.bpm)));
  doc.cols = cols;
  return { doc, moved, dropped };
}
