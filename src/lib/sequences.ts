/**
 * Saved sequencer arrangements, the auto-saved draft, and the bridges into the sequencer:
 * chords saved on the Explore tab, and songs from the Song workspace. Chords keep the same
 * shape everywhere (rootName + degrees + label), so the sequencer reuses the existing data.
 */
import { loadFavorites } from "./favorites";
import { loadSongs, orderedSections, slotLabel, type Song } from "./song";
import { DRUM_VOICES, GRIDS, emptyArrangement, emptyLanes, measureTicks, newId, type Arrangement, type ChordEvent, type DrumLane, type Grid, type TimeSig } from "./timeline";
import type { Degree } from "./theory";

export interface PaletteChord {
  key: string;
  rootName: string;
  degrees: Degree[];
  label: string;
  source: "saved" | "song" | "added";
}

export interface SavedSequence {
  id: string;
  name: string;
  arrangement: Arrangement;
  updatedAt: number;
}

const SEQ_KEY = "fretlab.sequences.v1";
const DRAFT_KEY = "fretlab.seqdraft.v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable or full */
  }
}

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Repair anything loaded from storage so a bad or older save can never crash the page. */
export function sanitizeArrangement(raw: unknown): Arrangement {
  const d = emptyArrangement();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<Arrangement>;
  const unit = ([2, 4, 8, 16] as const).find((u) => u === r.ts?.unit) ?? 4;
  const ts: TimeSig = { beats: Math.round(clamp(r.ts?.beats, 1, 16, 4)), unit };
  const measures = Math.round(clamp(r.measures, 1, 64, d.measures));
  const len = measures * measureTicks(ts);
  const chords: ChordEvent[] = Array.isArray(r.chords)
    ? r.chords
        .filter((c) => c && typeof c.rootName === "string" && Array.isArray(c.degrees) && c.degrees.length)
        .map((c) => ({
          id: typeof c.id === "string" ? c.id : newId(),
          start: Math.max(0, Math.round(clamp(c.start, 0, len, 0))),
          duration: Math.max(1, Math.round(clamp(c.duration, 1, len, measureTicks(ts)))),
          rootName: c.rootName,
          degrees: c.degrees.filter((x): x is Degree => typeof x === "string"),
          label: typeof c.label === "string" ? c.label : c.rootName,
          ...(Array.isArray(c.midis) && c.midis.every((m) => typeof m === "number") ? { midis: c.midis } : {}),
        }))
        .filter((c) => c.start < len)
    : [];
  const dr = r.drums;
  const stepsPerBeat = GRIDS.find((g) => g === dr?.stepsPerBeat) ?? 4;
  const lanes: DrumLane[] =
    dr && Array.isArray(dr.lanes) && dr.lanes.length
      ? dr.lanes
          .filter((l) => l && DRUM_VOICES.some((v) => v.voice === l.voice))
          .map((l) => ({
            id: typeof l.id === "string" ? l.id : newId(),
            voice: l.voice,
            name: typeof l.name === "string" ? l.name : DRUM_VOICES.find((v) => v.voice === l.voice)!.name,
            hits: Array.isArray(l.hits) ? l.hits.filter((h) => h && Number.isInteger(h.step) && h.step >= 0).map((h) => ({ step: h.step, velocity: clamp(h.velocity, 0, 1, 0.8) })) : [],
            muted: !!l.muted,
            solo: !!l.solo,
            gain: clamp(l.gain, 0, 1, 0.9),
            ...(typeof l.sampleId === "string" ? { sampleId: l.sampleId, sampleName: typeof l.sampleName === "string" ? l.sampleName : "sample" } : {}),
          }))
      : emptyLanes();
  return {
    bpm: Math.round(clamp(r.bpm, 30, 300, d.bpm)),
    ts,
    measures,
    chords,
    drums: { measures: Math.round(clamp(dr?.measures, 1, 16, 1)), stepsPerBeat: stepsPerBeat as Grid, lanes },
    countIn: ([0, 1, 2] as const).find((c) => c === r.countIn) ?? d.countIn,
    metronome: typeof r.metronome === "boolean" ? r.metronome : d.metronome,
    loop: typeof r.loop === "boolean" ? r.loop : d.loop,
    strumMs: Math.round(clamp(r.strumMs, 0, 80, d.strumMs)),
  };
}

export function loadSequences(): SavedSequence[] {
  const list = read<SavedSequence[]>(SEQ_KEY) ?? [];
  return Array.isArray(list)
    ? list.filter((s) => s && typeof s.id === "string").map((s) => ({ id: s.id, name: typeof s.name === "string" ? s.name : "Untitled", updatedAt: s.updatedAt ?? 0, arrangement: sanitizeArrangement(s.arrangement) }))
    : [];
}
export const saveSequences = (list: SavedSequence[]) => write(SEQ_KEY, list);
export const loadSeqDraft = (): Arrangement | null => {
  const raw = read<unknown>(DRAFT_KEY);
  return raw ? sanitizeArrangement(raw) : null;
};
export const saveSeqDraft = (a: Arrangement) => write(DRAFT_KEY, a);

/** Chords to place: saved on the Explore tab (chords and arpeggios), then chords used in songs. */
export function loadPalette(): PaletteChord[] {
  const out: PaletteChord[] = [];
  const seen = new Set<string>();
  const add = (c: Omit<PaletteChord, "key">) => {
    const key = `${c.rootName}|${[...c.degrees].sort().join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...c, key });
  };
  for (const f of loadFavorites()) if (f.mode !== "scale") add({ rootName: f.rootName, degrees: f.degrees, label: f.label, source: "saved" });
  for (const s of loadSongs()) for (const sec of s.sections) for (const sl of sec.slots) add({ rootName: sl.rootName, degrees: sl.degrees, label: slotLabel(sl), source: "song" });
  return out;
}

/** "6/8", "7/8 (2+2+3)", "3/4" → a time signature; falls back to beats-per-bar over 4. */
export function parseTimeSig(text: string | undefined, beatsPerBar: number): TimeSig {
  const m = text?.match(/(\d{1,2})\s*\/\s*(2|4|8|16)\b/);
  if (m) return { beats: Math.min(16, Math.max(1, parseInt(m[1]!, 10))), unit: parseInt(m[2]!, 10) as TimeSig["unit"] };
  return { beats: Math.min(16, Math.max(1, beatsPerBar || 4)), unit: 4 };
}

/** A Song-workspace song, played in its section order with repeats, one slot per `bars` bars. */
export function songToArrangement(song: Song, keep?: Arrangement): Arrangement {
  const base = keep ?? emptyArrangement();
  const ts = parseTimeSig(song.timeSig, song.beatsPerBar);
  const bar = measureTicks(ts);
  const chords: ChordEvent[] = [];
  let t = 0;
  for (const sec of orderedSections(song))
    for (let r = 0; r < Math.max(1, sec.repeats); r++)
      for (const sl of sec.slots) {
        const len = Math.max(1, sl.bars) * bar;
        chords.push({ id: newId(), start: t, duration: len, rootName: sl.rootName, degrees: [...sl.degrees], label: slotLabel(sl) });
        t += len;
      }
  return sanitizeArrangement({ ...base, bpm: song.bpm, ts, measures: Math.max(1, Math.min(64, Math.ceil(t / bar))), chords });
}
