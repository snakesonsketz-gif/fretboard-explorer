import { measureTicks, type Arrangement, type ChordEvent } from "./timeline";
import {
  CHORDS,
  LETTERS,
  SCALES,
  degreeToSemitones,
  degreesToPitchClasses,
  identify,
  rootByName,
  spellDegree,
  type Degree,
  type ScaleDef,
} from "./theory";

/** The exact fretboard shape a chord was picked with (fret per string, low string first; null = not played). */
export interface SlotVoicing {
  shape: (number | null)[];
  tuningId: string;
  /** Its pitches, so playback sounds the shape that was picked. */
  midis: number[];
}

export interface SongSlot {
  id: string;
  rootName: string;
  suffix: string;
  degrees: Degree[];
  bars: number;
  note?: string;
  voicing?: SlotVoicing;
}

export interface SongSection {
  id: string;
  label: string;
  repeats: number;
  slots: SongSlot[];
  notes?: string;
}

export interface Song {
  id: string;
  name: string;
  keyRoot: string;
  keyScaleId: string;
  bpm: number;
  beatsPerBar: number;
  notes: string;
  /** Free text, e.g. "4/4", "6/8", "7/8 (2+2+3)". */
  timeSig?: string;
  sections: SongSection[];
  /** Playing order as section ids (repeats allowed). Empty = sections in listed order. */
  arrangement?: string[];
  updatedAt: number;
}

export const SECTION_LABELS = [
  "Intro",
  "Verse",
  "Pre-chorus",
  "Chorus",
  "Post-chorus",
  "Bridge",
  "Solo",
  "Interlude",
  "Breakdown",
  "Outro",
];

export const newId = () => Math.random().toString(36).slice(2, 10);

export function emptySong(): Song {
  return {
    id: newId(),
    name: "Untitled song",
    keyRoot: "C",
    keyScaleId: "ionian",
    bpm: 90,
    beatsPerBar: 4,
    notes: "",
    sections: [{ id: newId(), label: "Verse", repeats: 1, slots: [] }],
    updatedAt: Date.now(),
  };
}

const SONGS_KEY = "fretlab.songs.v1";
const DRAFT_KEY = "fretlab.songdraft.v1";
const OLD_PROG_KEY = "fretlab.progressions.v1";

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
    /* storage unavailable */
  }
}

/** Loads saved songs, migrating progressions saved by earlier versions. */
export function loadSongs(): Song[] {
  const songs = read<Song[]>(SONGS_KEY) ?? [];
  const old = read<{ id: string; name: string; bpm: number; slots: Omit<SongSlot, "bars">[] }[]>(
    OLD_PROG_KEY,
  );
  if (old && old.length) {
    for (const p of old) {
      if (songs.some((s) => s.id === p.id)) continue;
      songs.push({
        ...emptySong(),
        id: p.id,
        name: p.name,
        bpm: p.bpm,
        keyRoot: p.slots[0]?.rootName ?? "C",
        sections: [
          { id: newId(), label: "Verse", repeats: 1, slots: p.slots.map((s) => ({ ...s, bars: 1 })) },
        ],
      });
    }
    write(SONGS_KEY, songs);
    write(OLD_PROG_KEY, []);
  }
  return songs;
}
export const saveSongs = (list: Song[]) => write(SONGS_KEY, list);
export const loadDraft = () => read<Song>(DRAFT_KEY);
export const saveDraft = (s: Song) => write(DRAFT_KEY, s);

/** Seven-note scales usable as a song key / mode. */
export const KEY_SCALES = SCALES.filter((s) => s.degrees.length === 7);

const pcKey = (pcs: number[]) =>
  [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b).join(",");

const FIT_FAMILIES = new Set<ScaleDef["family"]>([
  "Major modes",
  "Minor",
  "Melodic minor modes",
  "Harmonic minor modes",
  "Pentatonic / Blues",
  "Symmetric",
]);

export function slotLabel(s: { rootName: string; suffix: string; degrees: Degree[] }) {
  if (s.suffix !== "custom") return s.rootName + s.suffix;
  const det = identify(rootByName(s.rootName), degreesToPitchClasses(s.degrees));
  return `${s.rootName} (${det.formula})`;
}

export interface SlotAnalysis {
  roman: string;
  tones: string[];
  inKey: boolean;
  outside: string[];
  /** Mode of the song's key collection starting on this chord's root, if diatonic. */
  keyMode?: ScaleDef;
  fits: ScaleDef[];
}

export function analyzeSlot(song: Song, slot: SongSlot): SlotAnalysis {
  const key = rootByName(song.keyRoot);
  const keyScale = KEY_SCALES.find((s) => s.id === song.keyScaleId) ?? KEY_SCALES[0]!;
  const keyPcs = new Set(degreesToPitchClasses(keyScale.degrees).map((p) => (p + key.pc) % 12));
  const croot = rootByName(slot.rootName);
  const rel = degreesToPitchClasses(slot.degrees);
  const abs = rel.map((p) => (p + croot.pc) % 12);
  const tones = slot.degrees.map((d) => spellDegree(croot, d));

  // Roman numeral by letter distance, accidental relative to the key's scale degree.
  const li = LETTERS.indexOf(croot.letter);
  const ki = LETTERS.indexOf(key.letter);
  const num = (((li - ki) % 7) + 7) % 7;
  const expected = degreeToSemitones(keyScale.degrees[num] ?? "1");
  let acc = ((((croot.pc - key.pc - expected) % 12) + 18) % 12) - 6;
  const ROM = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const has = (n: number) => rel.includes(n);
  const minor = has(3) && !has(4);
  const dim = minor && has(6) && !has(7);
  const aug = has(4) && has(8) && !has(7);
  let r = ROM[num]!;
  if (minor) r = r.toLowerCase();
  let sfx = slot.suffix === "custom" ? "*" : slot.suffix;
  if (sfx === "m7b5") sfx = "ø7";
  else if (dim) sfx = sfx.replace(/^dim/, "°").replace(/^m/, "°") || "°";
  else if (aug) sfx = sfx.replace(/^aug/, "+") || "+";
  else if (minor && sfx.startsWith("m") && !sfx.startsWith("maj")) sfx = sfx.slice(1);
  const accStr = acc < 0 ? "b".repeat(-acc) : "#".repeat(Math.max(0, acc));
  acc = 0;
  const roman = accStr + r + sfx;

  const outside = abs
    .map((p, i) => (keyPcs.has(p) ? null : tones[i]!))
    .filter((x): x is string => !!x);
  const inKey = outside.length === 0;

  let keyMode: ScaleDef | undefined;
  if (keyPcs.has(croot.pc)) {
    const rot = pcKey([...keyPcs].map((p) => p - croot.pc));
    keyMode = SCALES.find((s) => pcKey(degreesToPitchClasses(s.degrees)) === rot);
  }

  const chordSet = new Set(rel.map((p) => ((p % 12) + 12) % 12));
  const known = CHORDS.find((c) => c.suffix === slot.suffix);
  const preferred = new Set(known?.scales ?? []);
  const fits = SCALES.filter((s) => FIT_FAMILIES.has(s.family) && s.id !== keyMode?.id)
    .filter((s) => {
      const sp = new Set(degreesToPitchClasses(s.degrees).map((p) => ((p % 12) + 12) % 12));
      return [...chordSet].every((p) => sp.has(p));
    })
    .sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)))
    .slice(0, 8);

  return { roman, tones, inKey, outside, ...(keyMode ? { keyMode } : {}), fits };
}

/** Plain-text chart of the user's own song, for copying elsewhere. */
/** Sections in playing order: the arrangement if set, otherwise listed order. */
export function orderedSections(song: Song): SongSection[] {
  const arr = (song.arrangement ?? [])
    .map((id) => song.sections.find((s) => s.id === id))
    .filter((s): s is SongSection => !!s);
  return arr.length ? arr : song.sections;
}

export function songToText(song: Song): string {
  const keyScale = KEY_SCALES.find((s) => s.id === song.keyScaleId);
  const lines = [
    song.name,
    `Key: ${song.keyRoot} ${keyScale?.name ?? ""} · ${song.bpm} bpm · ${song.timeSig || `${song.beatsPerBar}/4`}`,
    ...(song.arrangement?.length ? [`Order: ${orderedSections(song).map((s) => s.label).join(" → ")}`] : []),
    "",
  ];
  for (const sec of song.sections) {
    lines.push(`[${sec.label}]${sec.repeats > 1 ? ` x${sec.repeats}` : ""}`);
    if (sec.notes?.trim()) lines.push(`  (${sec.notes.trim()})`);
    lines.push(
      sec.slots
        .map((s) => {
          const a = analyzeSlot(song, s);
          return `${slotLabel(s)} (${a.roman})${s.voicing ? ` [${voicingTab(s.voicing)}]` : ""}${s.bars > 1 ? ` ×${s.bars} bars` : ""}${s.note ? ` — ${s.note}` : ""}`;
        })
        .join(" | ") || "(empty)",
    );
    lines.push("");
  }
  if (song.notes.trim()) lines.push("Notes:", song.notes);
  return lines.join("\n");
}

/** Tab of a picked shape, low string first ("x32010"; dashes when a fret is 10 or higher). */
export function voicingTab(v: Pick<SlotVoicing, "shape">): string {
  const wide = v.shape.some((f) => f !== null && f > 9);
  return v.shape.map((f) => (f === null ? "x" : String(f))).join(wide ? "-" : "");
}

/** Chord pitches for playback: the picked shape if there is one, else a close voicing from C3. */
export function slotMidis(s: Pick<SongSlot, "rootName" | "degrees" | "voicing">): number[] {
  if (s.voicing?.midis.length) return [...s.voicing.midis];
  const base = 48 + rootByName(s.rootName).pc;
  return [...new Set(s.degrees.map((d) => base + degreeToSemitones(d)))].sort((a, b) => a - b);
}

/**
 * The song (or one section of it, played once) as an Arrangement for the shared playback engine:
 * one chord per bar — a chord lasting several bars is strummed again each bar, as the play-along
 * always did — in arrangement order with section repeats. Chord ids are `${slotId}#${n}`.
 */
export function songToArrangement(song: Song, opts: { sectionId?: string; click?: boolean } = {}): Arrangement {
  const ts = { beats: Math.max(1, song.beatsPerBar), unit: 4 as const };
  const bar = measureTicks(ts);
  const secs = opts.sectionId ? song.sections.filter((x) => x.id === opts.sectionId) : orderedSections(song);
  const chords: ChordEvent[] = [];
  let n = 0;
  for (const sec of secs)
    for (let r = 0; r < (opts.sectionId ? 1 : Math.max(1, sec.repeats)); r++)
      for (const sl of sec.slots)
        for (let b = 0; b < Math.max(1, sl.bars); b++) {
          chords.push({ id: `${sl.id}#${n}`, start: n * bar, duration: bar, rootName: sl.rootName, degrees: sl.degrees, label: slotLabel(sl), midis: slotMidis(sl) });
          n++;
        }
  return {
    bpm: song.bpm,
    ts,
    measures: Math.max(1, n),
    chords,
    drums: { measures: 1, stepsPerBeat: 4, lanes: [] },
    countIn: 0,
    metronome: opts.click ?? true,
    loop: !opts.sectionId,
    strumMs: 25,
  };
}

/** The song slot a playing chord event belongs to. */
export const slotIdOfChord = (chordId: string) => chordId.split("#")[0]!;
