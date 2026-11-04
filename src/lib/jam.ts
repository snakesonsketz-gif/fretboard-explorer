/**
 * Jam: a chord progression you type or pick, played back on a loop with drums, and for each
 * chord one or more scales / arpeggios to solo with. Pure (no audio, no DOM) so it can be tested.
 */
import { parseChordName } from "@/lib/tabs/chords";
import { ARPEGGIO_VARIANTS, CHORDS, ROOTS, SCALES, degreeToSemitones, rootByName, type Degree } from "@/lib/theory";
import { beatTicks, emptyLanes, newId, type Arrangement, type ChordEvent, type DrumLane, type DrumVoice, type Grid, type TimeSig } from "@/lib/timeline";

/** One thing to play over a chord: a scale, or an arpeggio of some chord. */
export interface JamLayer {
  id: string;
  kind: "scale" | "arpeggio";
  rootName: string;
  /** Scale id (kind "scale"). */
  scaleId?: string | undefined;
  /** Chord id the arpeggio is built from, and the arpeggio variant (kind "arpeggio"). */
  chordId?: string | undefined;
  variantId?: string | undefined;
  /** Hidden selections retain their identity and settings; legacy layers default to visible. */
  visible?: boolean;
}

export interface JamChord {
  id: string;
  rootName: string;
  chordId: string;
  /** Slash bass, if written ("G/B"). */
  bassName?: string | undefined;
  label: string;
  beats: number;
  layers: JamLayer[];
}

export type DrumStyle = "none" | "rock" | "halftime" | "shuffle" | "four" ;
export const DRUM_STYLES: { id: DrumStyle; name: string }[] = [
  { id: "rock", name: "Rock beat" },
  { id: "halftime", name: "Half-time" },
  { id: "shuffle", name: "Shuffle" },
  { id: "four", name: "Four on the floor" },
  { id: "none", name: "No drums" },
];

export interface Jam {
  chords: JamChord[];
  bpm: number;
  beatsPerBar: number;
  drums: DrumStyle;
  metronome: boolean;
  /** Layers shown over every chord (e.g. one scale for the whole progression). */
  everywhere: JamLayer[];
  /** Hear the chords (off = drums only, you play the chords yourself). */
  chordsOn: boolean;
  layout?: "overlapping" | "separate";
}

export const emptyJam = (): Jam => ({ chords: [], bpm: 90, beatsPerBar: 4, drums: "rock", metronome: false, everywhere: [], chordsOn: true });

export const chordDef = (id: string) => CHORDS.find((c) => c.id === id) ?? CHORDS[0]!;
export const scaleDef = (id: string | undefined) => SCALES.find((s) => s.id === id) ?? SCALES[0]!;
export const variantDef = (id: string | undefined) => ARPEGGIO_VARIANTS.find((v) => v.id === id) ?? ARPEGGIO_VARIANTS[0]!;

/** The chord's own arpeggio: the default thing to play over it. */
export const ownArpeggio = (c: Pick<JamChord, "rootName" | "chordId">): JamLayer => ({ id: newId(), kind: "arpeggio", rootName: c.rootName, chordId: c.chordId, variantId: "full" });

export function makeChord(rootName: string, chordId: string, beats: number, bassName?: string): JamChord {
  const def = chordDef(chordId);
  const c: JamChord = { id: newId(), rootName, chordId, bassName, label: `${rootName}${def.suffix}${bassName ? `/${bassName}` : ""}`, beats, layers: [] };
  c.layers = [ownArpeggio(c)];
  return c;
}

/**
 * Read a typed progression: chords separated by spaces, commas or bars ("|"). Each chord is a
 * bar long; "Am7:2" makes it 2 beats, "Am7*2" makes it 2 bars. Returns the chords and anything
 * that wasn't a chord name.
 */
export function parseProgression(text: string, beatsPerBar: number): { chords: JamChord[]; bad: string[] } {
  const chords: JamChord[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/[\s,|]+/).filter(Boolean)) {
    const m = /^(.+?)(?:([:*x])(\d+(?:\.\d+)?))?$/.exec(raw);
    const name = m?.[1] ?? raw;
    const n = m?.[3] ? Number(m[3]) : null;
    const beats = n === null ? beatsPerBar : m![2] === ":" ? n : n * beatsPerBar;
    const parsed = parseChordName(name);
    if (!parsed || !(beats > 0)) {
      bad.push(raw);
      continue;
    }
    const bass = parsed.bassPc !== null ? (ROOTS.find((r) => r.pc === parsed.bassPc && r.name.length === 1) ?? ROOTS.find((r) => r.pc === parsed.bassPc))?.name : undefined;
    chords.push(makeChord(parsed.root.name, parsed.def.id, Math.min(64, beats), bass));
  }
  return { chords, bad };
}

/** Text form of a progression (for editing it as text again). */
export const progressionText = (chords: JamChord[], beatsPerBar: number) =>
  chords.map((c) => (c.beats === beatsPerBar ? c.label : c.beats % beatsPerBar === 0 ? `${c.label}*${c.beats / beatsPerBar}` : `${c.label}:${c.beats}`)).join(" ");

/** Degrees of a layer, relative to the layer's own root. */
export function layerDegrees(l: JamLayer): Degree[] {
  if (l.kind === "scale") return scaleDef(l.scaleId).degrees;
  return variantDef(l.variantId).transform(chordDef(l.chordId ?? "maj").degrees);
}

/** Pitch classes a layer plays. */
export const layerPcs = (l: JamLayer) => [...new Set(layerDegrees(l).map((d) => (rootByName(l.rootName).pc + ((degreeToSemitones(d) % 12) + 12)) % 12))];

export function layerName(l: JamLayer): string {
  if (l.kind === "scale") return `${l.rootName} ${scaleDef(l.scaleId).name}`;
  const v = variantDef(l.variantId);
  return `${l.rootName}${chordDef(l.chordId ?? "maj").suffix} arpeggio${v.id === "full" ? "" : ` (${v.name.toLowerCase()})`}`;
}

/** Chord tones (pitch classes) of a progression chord, slash bass included. */
export function chordPcs(c: JamChord): number[] {
  const root = rootByName(c.rootName).pc;
  const pcs = chordDef(c.chordId).degrees.map((d) => (root + ((degreeToSemitones(d) % 12) + 12)) % 12);
  if (c.bassName) pcs.push(rootByName(c.bassName).pc);
  return [...new Set(pcs)];
}

/** Total length in beats. */
export const totalBeats = (j: Pick<Jam, "chords">) => j.chords.reduce((n, c) => n + c.beats, 0);

/** Where playback is: which chord, how far into it, and how long until the next change. */
export function jamPosition(j: Pick<Jam, "chords">, beatsIn: number) {
  const total = totalBeats(j);
  if (!total || !j.chords.length) return null;
  const b = ((beatsIn % total) + total) % total;
  let start = 0;
  for (let i = 0; i < j.chords.length; i++) {
    const c = j.chords[i]!;
    if (b < start + c.beats || i === j.chords.length - 1) {
      const into = b - start;
      return { index: i, next: (i + 1) % j.chords.length, beatInChord: Math.floor(into), beatsLeft: c.beats - into, start };
    }
    start += c.beats;
  }
  return null;
}

/* ------------------------------------------------------------------ playback */

const voiceHits = (voice: DrumVoice, steps: number[], velocity = 0.85) => ({ voice, steps, velocity });

/** The drum part for one bar in a style. */
export function drumLanes(style: DrumStyle, beatsPerBar: number): { stepsPerBeat: Grid; lanes: DrumLane[] } {
  const spb: Grid = style === "shuffle" ? 3 : 4;
  const beats = [...Array(beatsPerBar).keys()];
  const at = (beat: number, sub = 0) => beat * spb + sub;
  const half = Math.floor(beatsPerBar / 2);
  let parts: { voice: DrumVoice; steps: number[]; velocity: number }[] = [];
  if (style === "rock")
    parts = [
      voiceHits("kick", [at(0), at(half)].filter((v, i, a) => a.indexOf(v) === i), 0.95),
      voiceHits("snare", beats.filter((b) => b % 2 === 1).map((b) => at(b))),
      voiceHits("closedHat", beats.flatMap((b) => [at(b), at(b, 2)]), 0.55),
    ];
  else if (style === "halftime")
    parts = [voiceHits("kick", [at(0)], 0.95), voiceHits("snare", [at(Math.min(beatsPerBar - 1, half))]), voiceHits("closedHat", beats.flatMap((b) => [at(b), at(b, 2)]), 0.5)];
  else if (style === "shuffle")
    parts = [
      voiceHits("kick", [at(0), at(half)].filter((v, i, a) => a.indexOf(v) === i), 0.95),
      voiceHits("snare", beats.filter((b) => b % 2 === 1).map((b) => at(b))),
      voiceHits("closedHat", beats.flatMap((b) => [at(b), at(b, 2)]), 0.55),
    ];
  else if (style === "four")
    parts = [voiceHits("kick", beats.map((b) => at(b)), 0.95), voiceHits("clap", beats.filter((b) => b % 2 === 1).map((b) => at(b)), 0.7), voiceHits("openHat", beats.map((b) => at(b, 2)), 0.45)];
  const lanes = emptyLanes().map((l) => {
    const p = parts.find((x) => x.voice === l.voice);
    return p ? { ...l, hits: p.steps.map((step) => ({ step, velocity: p.velocity })) } : l;
  });
  // The four-on-the-floor clap and open hat may not be in the default lanes: add them.
  for (const p of parts) if (!lanes.some((l) => l.voice === p.voice)) lanes.push({ id: newId(), voice: p.voice, name: p.voice, hits: p.steps.map((step) => ({ step, velocity: p.velocity })), muted: false, solo: false, gain: 0.9 });
  return { stepsPerBeat: spb, lanes };
}

/** The progression as an arrangement for the shared playback engine (looping, 1 bar count-in). */
export function jamArrangement(j: Jam): Arrangement {
  const ts: TimeSig = { beats: j.beatsPerBar, unit: 4 };
  const bt = beatTicks(ts);
  const total = totalBeats(j);
  const measures = Math.max(1, Math.ceil(total / j.beatsPerBar));
  let start = 0;
  const chords: ChordEvent[] = j.chordsOn
    ? j.chords.map((c, i) => {
        const beats = i === j.chords.length - 1 ? measures * j.beatsPerBar - start / bt : c.beats;
        const def = chordDef(c.chordId);
        const ev: ChordEvent = { id: c.id, start, duration: beats * bt, rootName: c.rootName, degrees: [...def.degrees], label: c.label };
        if (c.bassName) {
          const root = 48 + rootByName(c.rootName).pc;
          const bass = 36 + rootByName(c.bassName).pc;
          ev.midis = [bass, ...def.degrees.map((d) => root + degreeToSemitones(d))].sort((a, b) => a - b);
        }
        start += c.beats * bt;
        return ev;
      })
    : [];
  const d = drumLanes(j.drums, j.beatsPerBar);
  return {
    bpm: j.bpm,
    ts,
    measures,
    chords,
    drums: { measures: 1, stepsPerBeat: d.stepsPerBeat, lanes: j.drums === "none" ? emptyLanes() : d.lanes },
    countIn: 1,
    metronome: j.metronome || j.drums === "none",
    loop: true,
    strumMs: 18,
  };
}

/** Starter progressions. */
export const JAM_PRESETS: { name: string; text: string }[] = [
  { name: "Pop I–V–vi–IV (G)", text: "G D Em C" },
  { name: "ii–V–I jazz (C)", text: "Dm7 G7 Cmaj7*2" },
  { name: "12-bar blues (A)", text: "A7 D7 A7*2 D7*2 A7*2 E7 D7 A7 E7" },
  { name: "Minor rock (Am)", text: "Am G F G" },
  { name: "Andalusian (Am)", text: "Am G F E" },
  { name: "Minor ii–V–i (Am)", text: "Bm7b5 E7 Am7*2" },
  { name: "Funk vamp (E9)", text: "E9*2 A9*2" },
];
