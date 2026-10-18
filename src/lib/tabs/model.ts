/**
 * Tablature: the document model shared by the Tab Maker's describe box, grid editor, text editor,
 * playback and (later) audio-to-tab. A tab is a row of columns; each column is one moment in time —
 * a single note, a chord, a rest or a bar line — with one cell per string.
 *
 * Strings are stored LOW to HIGH (index 0 = the thickest string), the same as the tuner and the
 * chord finder. Tab is drawn the other way up (thinnest string on top), which the renderer handles.
 */
import { stringsOf, tuningById, type TuningString } from "@/lib/tuner/tunings";

/** How a note leads into the next note on the same string. */
export type Link = "h" | "p" | "/" | "\\";

export interface Cell {
  /** Fret number, or "x" for a dead (muted) note. */
  fret: number | "x";
  /** Hammer-on, pull-off or slide into the next note on this string. */
  link?: Link | undefined;
  /** Bend amount in half steps (0.5 = quarter-tone curl, 1 = half, 2 = whole / full, 3 = 1½, 4 = two steps). */
  bend?: number | undefined;
  /** Pre-bend: bend the string up before picking it. */
  prebend?: boolean | undefined;
  /** Bend, then release back to the fretted note. */
  release?: boolean | undefined;
  vibrato?: boolean | undefined;
  /** Wide vibrato (~~). */
  wide?: boolean | undefined;
  /** Natural harmonic: touch the string over the fret. */
  harmonic?: boolean | undefined;
  /** Pinch / artificial harmonic, written [12]. */
  pinch?: boolean | undefined;
  /** Trill: rapid hammer-ons and pull-offs with this fret. */
  trill?: number | undefined;
  /** How the note starts: hammer-on from nowhere (h), slide in from below (/) or from above (\). */
  into?: "h" | "/" | "\\" | undefined;
  /** Slide off the note at the end, up (/) or down (\) — when it doesn't lead into another note. */
  out?: "/" | "\\" | undefined;
  /** Tapped with the picking hand. */
  tap?: boolean | undefined;
  /** Ghost note: barely played. */
  ghost?: boolean | undefined;
}

export interface Column {
  id: string;
  kind: "notes" | "rest" | "bar";
  /** One per string, low → high. null = string not played. */
  cells: (Cell | null)[];
  /** Length in beats (1 = quarter note, 0.5 = eighth). */
  beats: number;
  /** Palm muted. */
  pm?: boolean | undefined;
  /** Let ring. */
  ring?: boolean | undefined;
  /** Chord name written above the tab. */
  chord?: string | undefined;
  /** Pick or strum direction written above the tab. */
  strum?: "down" | "up" | undefined;
  /** Soloing effects marked above the tab (tremolo picking, whammy bar, rake, accents…). */
  fx?: Fx[] | undefined;
}

export type Fx = "trem" | "dip" | "dive" | "flutter" | "barvib" | "scoop" | "rake" | "swell" | "accent" | "staccato";

/** How each effect is written on the line above the tab, and its name. */
export const FX: Record<Fx, { mark: string; name: string }> = {
  trem: { mark: "T.P.", name: "tremolo picking" },
  dip: { mark: "w/bar dip", name: "whammy dip" },
  dive: { mark: "dive", name: "whammy dive-bomb" },
  flutter: { mark: "flutter", name: "whammy flutter" },
  barvib: { mark: "w/bar~", name: "whammy vibrato" },
  scoop: { mark: "scoop", name: "whammy scoop" },
  rake: { mark: "rake", name: "rake" },
  swell: { mark: "swell", name: "volume swell" },
  accent: { mark: ">", name: "accent" },
  staccato: { mark: ".", name: "staccato" },
};

export interface TabTuning {
  /** A tuner tuning id, or "custom". */
  id: string;
  name: string;
  /** MIDI note per string, low → high. */
  midis: number[];
  /** Display names per string, low → high (with ♯/♭). */
  names: string[];
}

export interface TabDoc {
  id: string;
  title: string;
  tuning: TabTuning;
  bpm: number;
  cols: Column[];
  updated: number;
}

export const DEFAULT_BEATS = 0.5;
export const MAX_FRET = 24;

let seq = 0;
export const colId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const docId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function tabTuning(id: string): TabTuning {
  const t = tuningById(id) ?? tuningById("standard")!;
  const strings = stringsOf(t);
  return { id: t.id, name: t.name, midis: strings.map((s) => s.midi), names: strings.map((s) => s.name) };
}

export function tuningStrings(t: TabTuning): TuningString[] {
  return t.midis.map((midi, i) => ({ number: t.midis.length - i, midi, name: t.names[i] ?? "?", octave: Math.floor(midi / 12) - 1 }));
}

export function emptyDoc(tuningId = "standard"): TabDoc {
  return { id: docId(), title: "Untitled tab", tuning: tabTuning(tuningId), bpm: 100, cols: [], updated: Date.now() };
}

export const emptyCells = (n: number): (Cell | null)[] => new Array(n).fill(null);

export function noteCol(n: number, notes: { s: number; cell: Cell }[], extra: Partial<Column> = {}): Column {
  const cells = emptyCells(n);
  for (const { s, cell } of notes) if (s >= 0 && s < n) cells[s] = cell;
  return { id: colId(), kind: "notes", cells, beats: DEFAULT_BEATS, ...extra };
}
export const barCol = (n: number): Column => ({ id: colId(), kind: "bar", cells: emptyCells(n), beats: 0 });
export const restCol = (n: number, beats = DEFAULT_BEATS): Column => ({ id: colId(), kind: "rest", cells: emptyCells(n), beats });

/** A fresh copy of columns (new ids), e.g. for repeats. */
export const cloneCols = (cols: Column[]): Column[] => cols.map((c) => ({ ...c, id: colId(), cells: c.cells.map((x) => (x ? { ...x } : null)) }));

/** Pitch of a cell on a string (null for dead notes / empty). Harmonics at 12/7/5 sound their harmonic. */
export function cellMidi(cell: Cell | null, stringMidi: number): number | null {
  if (!cell || cell.fret === "x") return null;
  if (cell.pinch) return stringMidi + cell.fret + 24;
  if (cell.harmonic) {
    const H: Record<number, number> = { 12: 12, 7: 19, 19: 19, 5: 24, 24: 24, 4: 28, 9: 28, 3: 31 };
    return stringMidi + (H[cell.fret] ?? cell.fret);
  }
  return stringMidi + cell.fret;
}

/** Re-fit columns to a tuning with a different number of strings (keeps the strings nearest in pitch order). */
export function refit(cols: Column[], from: number, to: number): Column[] {
  if (from === to) return cols;
  return cols.map((c) => {
    const cells = emptyCells(to);
    // Keep the top (thinnest) strings aligned: tab readers think from the high string down.
    for (let i = 0; i < from; i++) {
      const j = to - from + i;
      if (j >= 0 && j < to) cells[j] = c.cells[i] ?? null;
    }
    return { ...c, cells };
  });
}

/** Text shown in a tab cell, e.g. "5", "7b9", "<12>", "(3)", "x", "5~". Links are added by the renderer. */
export function cellText(cell: Cell): string {
  if (cell.fret === "x") return `${cell.into ?? ""}x`;
  const f = cell.fret;
  let t = cell.pinch ? `[${f}]` : cell.harmonic ? `<${f}>` : cell.ghost ? `(${f})` : `${f}`;
  if (cell.tap) t = `t${t}`;
  if (cell.into) t = `${cell.into}${t}`;
  if (cell.bend) {
    const to = cell.bend === 0.5 ? "¼" : String(f + cell.bend);
    t += cell.prebend ? `pb${to}` : `b${to}`;
    if (cell.release) t += `r${f}`;
  }
  if (cell.trill !== undefined) t += `tr${cell.trill}`;
  if (cell.vibrato) t += cell.wide ? "~~" : "~";
  return t;
}

export const BEAT_NAMES: { beats: number; name: string; short: string }[] = [
  { beats: 4, name: "whole note", short: "1" },
  { beats: 2, name: "half note", short: "½" },
  { beats: 1, name: "quarter note", short: "¼" },
  { beats: 0.5, name: "eighth note", short: "⅛" },
  { beats: 1 / 3, name: "eighth-note triplet", short: "⅛³" },
  { beats: 0.25, name: "sixteenth note", short: "1/16" },
];
