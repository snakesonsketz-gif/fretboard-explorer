/**
 * Standard MIDI File export (format 1) built from scheduleArrangement() — the same events the
 * sequencer plays, so the export matches what you hear. MIDI carries notes, timing and
 * velocity, not sounds: GarageBand or any DAW supplies the instruments.
 *
 * Track 0: tempo + time signature. "Chords": GM acoustic guitar on channel 1.
 * "Drums": GM drum channel 10, each lane on its General MIDI drum note.
 */
import { DRUM_VOICES, PPQ, scheduleArrangement, type Arrangement } from "./timeline";

export type MidiPart = "full" | "chords" | "drums";

const CHORD_CHANNEL = 0;
const DRUM_CHANNEL = 9; // channel 10 in 1-based numbering
const GUITAR_PROGRAM = 25; // GM 26 "Acoustic Guitar (steel)", 0-based

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n: number) => [(n >>> 8) & 255, n & 255];
const text = (s: string) => [...new TextEncoder().encode(s)];
const vel = (v: number) => Math.max(1, Math.min(127, Math.round(v * 127)));

type Ev = { tick: number; order: number; bytes: number[] };

function track(events: Ev[], name: string, endTick: number): number[] {
  const all: Ev[] = [{ tick: 0, order: -2, bytes: [0xff, 0x03, ...vlq(text(name).length), ...text(name)] }, ...events];
  // At equal ticks: meta/program first, then note-offs before note-ons so a repeated note re-strikes cleanly.
  all.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const data: number[] = [];
  let last = 0;
  for (const e of all) {
    data.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  data.push(...vlq(Math.max(0, endTick - last)), 0xff, 0x2f, 0x00);
  return [...text("MTrk"), ...u32(data.length), ...data];
}

/** Build the .mid bytes for the whole arrangement or one part. */
export function arrangementToMidi(a: Arrangement, part: MidiPart = "full"): Uint8Array<ArrayBuffer> {
  const len = a.measures * a.ts.beats * ((PPQ * 4) / a.ts.unit);
  const events = scheduleArrangement(a, { metronome: false, countIn: false });
  const tracks: number[][] = [];

  const usPerQuarter = Math.round(60_000_000 / a.bpm);
  const dd = Math.log2(a.ts.unit);
  tracks.push(
    track(
      [
        { tick: 0, order: -1, bytes: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255] },
        { tick: 0, order: -1, bytes: [0xff, 0x58, 0x04, a.ts.beats, dd, 24, 8] },
      ],
      "Fretlab",
      len,
    ),
  );

  if (part !== "drums") {
    const ev: Ev[] = [{ tick: 0, order: -1, bytes: [0xc0 | CHORD_CHANNEL, GUITAR_PROGRAM] }];
    for (const e of events)
      if (e.kind === "chord")
        for (const m of e.midis) {
          const note = Math.max(0, Math.min(127, m));
          ev.push({ tick: e.tick, order: 1, bytes: [0x90 | CHORD_CHANNEL, note, vel(e.velocity)] });
          ev.push({ tick: e.tick + e.duration, order: 0, bytes: [0x80 | CHORD_CHANNEL, note, 0] });
        }
    tracks.push(track(ev, "Chords", len));
  }

  if (part !== "chords") {
    const ev: Ev[] = [];
    const gate = Math.max(1, Math.round(PPQ / 8)); // short drum notes (a 32nd); drum sounds ring on their own
    for (const e of events)
      if (e.kind === "drum") {
        const note = DRUM_VOICES.find((v) => v.voice === e.voice)?.midi ?? 38;
        ev.push({ tick: e.tick, order: 1, bytes: [0x90 | DRUM_CHANNEL, note, vel(e.velocity)] });
        ev.push({ tick: e.tick + Math.min(gate, e.duration), order: 0, bytes: [0x80 | DRUM_CHANNEL, note, 0] });
      }
    tracks.push(track(ev, "Drums", len));
  }

  const header = [...text("MThd"), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
  return new Uint8Array([...header, ...tracks.flat()]);
}

/** Save the .mid file in the browser. */
export function downloadMidi(a: Arrangement, part: MidiPart, name: string) {
  const bytes = arrangementToMidi(a, part);
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safe = (name.trim() || "fretlab-idea").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase();
  link.href = url;
  link.download = `${safe}${part === "full" ? "" : `-${part}`}.mid`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
