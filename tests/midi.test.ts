import { describe, expect, test } from "bun:test";
import { arrangementToMidi } from "../src/lib/midi";
import { PPQ, emptyArrangement, measureTicks, type Arrangement } from "../src/lib/timeline";

/** Minimal Standard MIDI File reader, enough to check what we wrote. */
function parse(bytes: Uint8Array) {
  let i = 0;
  const str = (n: number) => String.fromCharCode(...bytes.slice(i, (i += n)));
  const u32 = () => (bytes[i++]! << 24) | (bytes[i++]! << 16) | (bytes[i++]! << 8) | bytes[i++]!;
  const u16 = () => (bytes[i++]! << 8) | bytes[i++]!;
  const vlq = () => {
    let v = 0, b = 0;
    do {
      b = bytes[i++]!;
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };
  expect(str(4)).toBe("MThd");
  expect(u32()).toBe(6);
  const format = u16(), ntrks = u16(), division = u16();
  const tracks: { name: string; events: { tick: number; type: string; ch?: number; note?: number; vel?: number; data?: number[] }[]; end: number }[] = [];
  for (let t = 0; t < ntrks; t++) {
    expect(str(4)).toBe("MTrk");
    const len = u32();
    const stop = i + len;
    let tick = 0, name = "", end = -1;
    const events: (typeof tracks)[number]["events"] = [];
    while (i < stop) {
      tick += vlq();
      const s = bytes[i++]!;
      if (s === 0xff) {
        const type = bytes[i++]!, l = vlq(), data = [...bytes.slice(i, (i += l))];
        if (type === 0x03) name = String.fromCharCode(...data);
        else if (type === 0x2f) end = tick;
        else events.push({ tick, type: type === 0x51 ? "tempo" : type === 0x58 ? "timesig" : `meta${type}`, data });
      } else if ((s & 0xf0) === 0x90 || (s & 0xf0) === 0x80) {
        const note = bytes[i++]!, vel = bytes[i++]!;
        events.push({ tick, type: (s & 0xf0) === 0x90 && vel > 0 ? "on" : "off", ch: s & 0x0f, note, vel });
      } else if ((s & 0xf0) === 0xc0) {
        events.push({ tick, type: "program", ch: s & 0x0f, data: [bytes[i++]!] });
      } else throw new Error(`unexpected status ${s.toString(16)} at ${i}`);
    }
    expect(i).toBe(stop);
    tracks.push({ name, events, end });
  }
  expect(i).toBe(bytes.length);
  return { format, division, tracks };
}

function song(): Arrangement {
  const a = { ...emptyArrangement(), bpm: 96, ts: { beats: 6, unit: 8 as const }, measures: 2, countIn: 2 as const, metronome: true };
  const bar = measureTicks(a.ts);
  a.chords = [
    { id: "a", start: PPQ / 2, duration: bar - PPQ / 2, rootName: "C", degrees: ["1", "3", "5", "7"], label: "Cmaj7" },
    { id: "b", start: bar, duration: PPQ * 2, rootName: "G", degrees: ["1", "3", "5", "b7"], label: "G7" },
  ];
  a.drums = { measures: 1, stepsPerBeat: 2, lanes: a.drums.lanes.map((l) => (l.voice === "kick" ? { ...l, gain: 1, hits: [{ step: 0, velocity: 1 }, { step: 6, velocity: 0.5 }] } : l.voice === "snare" ? { ...l, gain: 1, hits: [{ step: 4, velocity: 0.75 }] } : l)) };
  return a;
}

describe("MIDI export", () => {
  test("header, conductor track: format 1, 480 PPQ, tempo and 6/8", () => {
    const m = parse(arrangementToMidi(song()));
    expect(m.format).toBe(1);
    expect(m.division).toBe(PPQ);
    expect(m.tracks.map((t) => t.name)).toEqual(["Fretlab", "Chords", "Drums"]);
    const tempo = m.tracks[0]!.events.find((e) => e.type === "tempo")!.data!;
    expect((tempo[0]! << 16) | (tempo[1]! << 8) | tempo[2]!).toBe(Math.round(60_000_000 / 96));
    expect(m.tracks[0]!.events.find((e) => e.type === "timesig")!.data).toEqual([6, 3, 24, 8]);
  });

  test("chords: right notes, start ticks and lengths; count-in and click are not exported", () => {
    const m = parse(arrangementToMidi(song()));
    const t = m.tracks[1]!;
    expect(t.events[0]).toMatchObject({ type: "program", ch: 0, data: [25] });
    const ons = t.events.filter((e) => e.type === "on");
    const offs = t.events.filter((e) => e.type === "off");
    expect(ons.map((e) => [e.tick, e.note])).toEqual([
      [240, 48], [240, 52], [240, 55], [240, 59], // Cmaj7 on the 2nd eighth
      [1440, 55], [1440, 59], [1440, 62], [1440, 65], // G7 at bar 2
    ]);
    expect(offs.filter((e) => e.tick === 1440).map((e) => e.note).sort()).toEqual([48, 52, 55, 59]);
    expect(offs.filter((e) => e.tick === 1440 + 960).length).toBe(4);
    expect(ons.every((e) => e.ch === 0 && e.vel! > 0)).toBe(true);
  });

  test("a note shared by consecutive chords is released before it re-strikes", () => {
    const m = parse(arrangementToMidi(song()));
    const at1440 = m.tracks[1]!.events.filter((e) => e.tick === 1440 && e.note === 55).map((e) => e.type);
    expect(at1440).toEqual(["off", "on"]);
  });

  test("drums: GM notes on channel 10, the 1-bar pattern repeats under 2 bars, velocity kept", () => {
    const m = parse(arrangementToMidi(song()));
    const ons = m.tracks[2]!.events.filter((e) => e.type === "on");
    expect(ons.every((e) => e.ch === 9)).toBe(true);
    const step = PPQ / 4; // 8th-note beat, 2 steps per beat
    expect(ons.map((e) => [e.tick / step, e.note, e.vel])).toEqual([
      [0, 36, 127], [4, 38, 95], [6, 36, 64], // bar 1: kick, snare, soft kick
      [12, 36, 127], [16, 38, 95], [18, 36, 64], // bar 2: the pattern again
    ]);
  });

  test("every note-on has a matching note-off, and tracks end at the arrangement end", () => {
    const m = parse(arrangementToMidi(song()));
    const len = 2 * measureTicks({ beats: 6, unit: 8 });
    for (const t of m.tracks) {
      expect(t.end).toBe(len);
      const open = new Map<string, number>();
      for (const e of t.events) {
        const k = `${e.ch}:${e.note}`;
        if (e.type === "on") open.set(k, (open.get(k) ?? 0) + 1);
        if (e.type === "off") open.set(k, (open.get(k) ?? 0) - 1);
      }
      expect([...open.values()].every((v) => v === 0)).toBe(true);
    }
  });

  test("single-part exports", () => {
    expect(parse(arrangementToMidi(song(), "chords")).tracks.map((t) => t.name)).toEqual(["Fretlab", "Chords"]);
    expect(parse(arrangementToMidi(song(), "drums")).tracks.map((t) => t.name)).toEqual(["Fretlab", "Drums"]);
  });
});
