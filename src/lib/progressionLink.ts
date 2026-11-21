/**
 * Moving a progression between the builder, Jam, an Explore song and the Sequencer. Each side keeps its
 * own working state in localStorage; these helpers convert to and from it. Converters are pure; the
 * `send*` / `read*` helpers touch storage.
 */
import { emptyJam, JAM_STORAGE_KEY, makeChord, parseProgression, type Jam } from "@/lib/jam";
import { chordIdForDegrees, chordLabel, emptyProgression, makeProgChord, KEY_MODES, type Progression } from "@/lib/progression";
import { loadDraft as loadSongDraft, loadSongs, saveDraft as saveSongDraft, saveSongs, emptySong, orderedSections, type Song, type SongSlot } from "@/lib/song";
import { loadSeqDraft, sanitizeArrangement, saveSeqDraft } from "@/lib/sequences";
import { beatTicks, emptyArrangement, newId, type Arrangement, type ChordEvent } from "@/lib/timeline";
import { chordById } from "@/lib/progression";
import { degreeToSemitones, rootByName } from "@/lib/theory";
import { rootFor } from "@/lib/modes";

const DRAFT_KEY = "fretlab.progression.v1";
const INCOMING_KEY = "fretlab.progression.incoming.v1";
const SCROLL_SONG_KEY = "fretlab.scroll.song.v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

/** Repair a progression loaded from storage so bad or old data can't crash the page. */
export function sanitizeProgression(raw: unknown): Progression | null {
  const r = raw as Partial<Progression> | null;
  if (!r || !Array.isArray(r.chords)) return null;
  const base = emptyProgression();
  const bpb = typeof r.beatsPerBar === "number" && r.beatsPerBar >= 1 && r.beatsPerBar <= 12 ? Math.round(r.beatsPerBar) : base.beatsPerBar;
  return {
    keyRoot: typeof r.keyRoot === "string" ? rootByName(r.keyRoot).name : base.keyRoot,
    scaleId: KEY_MODES.some((m) => m.id === r.scaleId) ? (r.scaleId as string) : base.scaleId,
    beatsPerBar: bpb,
    bpm: typeof r.bpm === "number" && r.bpm >= 30 && r.bpm <= 260 ? Math.round(r.bpm) : base.bpm,
    chords: r.chords
      .filter((c) => c && typeof c.rootName === "string" && typeof c.chordId === "string")
      .map((c) => makeProgChord(rootByName(c.rootName).name, chordById(c.chordId).id, typeof c.beats === "number" ? c.beats : bpb, { bassName: c.bassName, from: c.from })),
  };
}

export interface BuilderDraft {
  prog: Progression;
  seventh: boolean;
  borrowRoot: string;
  borrowScaleId: string;
}
export const loadBuilderDraft = (): BuilderDraft | null => {
  const r = read<Partial<BuilderDraft>>(DRAFT_KEY);
  const prog = sanitizeProgression(r?.prog);
  if (!r || !prog) return null;
  return {
    prog,
    seventh: !!r.seventh,
    borrowRoot: typeof r.borrowRoot === "string" ? rootByName(r.borrowRoot).name : prog.keyRoot,
    borrowScaleId: KEY_MODES.some((m) => m.id === r.borrowScaleId) ? (r.borrowScaleId as string) : "aeolian",
  };
};
export const saveBuilderDraft = (d: BuilderDraft) => write(DRAFT_KEY, d);

/* ------------------------------------------------------------------ Jam */

export function progToJam(p: Progression, base: Jam = emptyJam()): Jam {
  const chords = p.chords.map((c) => makeChord(c.rootName, c.chordId, c.beats, c.bassName));
  // Keep what's already over every chord and add this key's scale, so the neck shows the key too.
  const has = base.everywhere.some((l) => l.kind === "scale" && l.rootName === p.keyRoot && l.scaleId === p.scaleId);
  const everywhere = has ? base.everywhere : [...base.everywhere, { id: newId(), kind: "scale" as const, rootName: p.keyRoot, scaleId: p.scaleId }];
  return { ...base, chords, bpm: p.bpm, beatsPerBar: p.beatsPerBar, everywhere };
}

/** Jam → progression. The key comes from a 7-note scale shown over every chord, else `key`. */
export function jamToProg(j: Jam, key: Pick<Progression, "keyRoot" | "scaleId"> = emptyProgression()): Progression {
  const k = j.everywhere.find((l) => l.kind === "scale" && KEY_MODES.some((m) => m.id === l.scaleId));
  return {
    keyRoot: k ? rootByName(k.rootName).name : key.keyRoot,
    scaleId: k?.scaleId ?? key.scaleId,
    beatsPerBar: j.beatsPerBar,
    bpm: j.bpm,
    chords: j.chords.map((c) => makeProgChord(c.rootName, c.chordId, c.beats, { bassName: c.bassName })),
  };
}

export const readJam = (): Jam | null => {
  const j = read<Jam>(JAM_STORAGE_KEY);
  return j && Array.isArray(j.chords) ? { ...emptyJam(), ...j } : null;
};
export const writeJam = (j: Jam) => write(JAM_STORAGE_KEY, j);

/* ------------------------------------------------------------------ Explore song */

/** Songs count whole bars, so a chord's beats round to bars (at least one). */
export const barsForBeats = (beats: number, beatsPerBar: number) => Math.max(1, Math.round(beats / beatsPerBar));

/** Chords whose length can't be kept exactly in an Explore song (it counts whole bars). */
export const roundedInSong = (p: Progression) => p.chords.filter((c) => Math.abs(c.beats - barsForBeats(c.beats, p.beatsPerBar) * p.beatsPerBar) > 1e-6);

export function progToSong(p: Progression, name = "From Progression builder"): Song {
  const s = emptySong();
  const slots: SongSlot[] = p.chords.map((c) => {
    const def = chordById(c.chordId);
    return { id: newId(), rootName: c.rootName, suffix: def.suffix, degrees: [...def.degrees], bars: barsForBeats(c.beats, p.beatsPerBar), ...(c.bassName ? { note: `bass ${c.bassName}` } : {}) };
  });
  return { ...s, name, keyRoot: p.keyRoot, keyScaleId: p.scaleId, bpm: p.bpm, beatsPerBar: p.beatsPerBar, sections: [{ id: newId(), label: "Verse", repeats: 1, slots }], updatedAt: Date.now() };
}

export function songToProg(song: Song): { prog: Progression; skipped: number } {
  const prog: Progression = {
    keyRoot: rootByName(song.keyRoot).name,
    scaleId: KEY_MODES.some((m) => m.id === song.keyScaleId) ? song.keyScaleId : "ionian",
    beatsPerBar: Math.max(1, Math.round(song.beatsPerBar) || 4),
    bpm: song.bpm || 90,
    chords: [],
  };
  let skipped = 0;
  for (const sec of orderedSections(song))
    for (let r = 0; r < Math.max(1, sec.repeats); r++)
      for (const sl of sec.slots) {
        const id = chordIdForDegrees(sl.degrees) ?? null;
        if (!id) {
          skipped++;
          continue;
        }
        prog.chords.push(makeProgChord(rootFor(sl.rootName, rootByName(sl.rootName).pc).name, id, Math.max(1, sl.bars) * prog.beatsPerBar));
      }
  return { prog, skipped };
}

/** Put the progression in the Explore song workspace. Whatever was there is kept in My songs first. */
export function sendToSong(p: Progression): void {
  const old = loadSongDraft();
  if (old && old.sections.some((s) => s.slots.length)) {
    const all = loadSongs();
    if (!all.some((x) => x.id === old.id)) saveSongs([...all, old]);
  }
  saveSongDraft(progToSong(p));
  write(SCROLL_SONG_KEY, "1");
}
export const songDraftHasChords = (): boolean => !!loadSongDraft()?.sections.some((s) => s.slots.length);
export const readSongDraft = loadSongDraft;
/** Explore asks this once on load: scroll to the song workspace? */
export function takeScrollToSong(): boolean {
  try {
    const v = window.localStorage.getItem(SCROLL_SONG_KEY);
    if (v) window.localStorage.removeItem(SCROLL_SONG_KEY);
    return !!v;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ Sequencer */

export function progToArrangement(p: Progression, keep?: Arrangement | null): Arrangement {
  const ts = { beats: p.beatsPerBar, unit: 4 as const };
  const bt = beatTicks(ts);
  let start = 0;
  // Exact lengths: the last chord isn't stretched to fill its bar.
  const chords = p.chords.map((c) => {
    const def = chordById(c.chordId);
    const ev: ChordEvent = { id: newId(), start, duration: c.beats * bt, rootName: c.rootName, degrees: [...def.degrees], label: chordLabel(c.rootName, c.chordId, c.bassName) };
    if (c.bassName) {
      const root = 48 + rootByName(c.rootName).pc;
      ev.midis = [36 + rootByName(c.bassName).pc, ...def.degrees.map((d) => root + degreeToSemitones(d))].sort((x, y) => x - y);
    }
    start += c.beats * bt;
    return ev;
  });
  const prev = keep ?? null;
  // Keep the sequencer's drum pattern when its bar length matches.
  const drums = prev && prev.ts.beats === ts.beats && prev.ts.unit === ts.unit ? prev.drums : emptyArrangement().drums;
  return sanitizeArrangement({ ...(prev ?? emptyArrangement()), bpm: p.bpm, ts, measures: Math.max(1, Math.ceil(start / beatTicks(ts) / p.beatsPerBar - 1e-9)), chords, drums });
}

export function arrangementToProg(a: Arrangement, key: Pick<Progression, "keyRoot" | "scaleId"> = emptyProgression()): { prog: Progression; skipped: number } {
  const bt = beatTicks(a.ts);
  const prog: Progression = { keyRoot: key.keyRoot, scaleId: key.scaleId, beatsPerBar: a.ts.beats, bpm: a.bpm, chords: [] };
  let skipped = 0;
  for (const c of [...a.chords].sort((x, y) => x.start - y.start)) {
    const id = chordIdForDegrees(c.degrees);
    if (!id) {
      skipped++;
      continue;
    }
    prog.chords.push(makeProgChord(rootFor(c.rootName, rootByName(c.rootName).pc).name, id, Math.round((c.duration / bt) * 2) / 2 || 1));
  }
  return { prog, skipped };
}

export function sendToSequencer(p: Progression): void {
  saveSeqDraft(progToArrangement(p, loadSeqDraft()));
}
export const readSequencer = loadSeqDraft;
export const sequencerHasChords = (): boolean => (loadSeqDraft()?.chords.length ?? 0) > 0;

/* ------------------------------------------------------------------ into the builder */

/** Hand a progression to the builder (it picks it up when it opens). */
export const sendToBuilder = (p: Progression) => write(INCOMING_KEY, p);

export function takeIncoming(): Progression | null {
  const r = read<unknown>(INCOMING_KEY);
  if (r === null) return null;
  try {
    window.localStorage.removeItem(INCOMING_KEY);
  } catch {
    /* ignore */
  }
  return sanitizeProgression(r);
}


/** Parse typed chords (Jam's syntax) into progression chords. */
export function textToChords(text: string, beatsPerBar: number) {
  const r = parseProgression(text, beatsPerBar);
  return { chords: r.chords.map((c) => makeProgChord(c.rootName, c.chordId, c.beats, { bassName: c.bassName })), bad: r.bad };
}
