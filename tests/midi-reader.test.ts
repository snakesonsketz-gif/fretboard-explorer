import { describe as group, expect, test } from "bun:test";
import { bestTrack, parseMidi, writeMidi } from "../src/lib/midifile/parse";
import { midiToTab } from "../src/lib/midifile/toTab";
import { tabTuning } from "../src/lib/tabs/model";
import { placeChord } from "../src/lib/tabs/place";
import { renderAscii } from "../src/lib/tabs/render";

const std = tabTuning("standard");
const scale = [60, 62, 64, 65, 67, 69, 71, 72];

group("MIDI reader", () => {
  const bytes = writeMidi(
    [
      { name: "Lead", program: 29, notes: scale.map((m, i) => ({ midi: m, ticks: i * 480, durTicks: 400 })) },
      { name: "Keys", program: 0, channel: 1, notes: [60, 64, 67].map((m) => ({ midi: m, ticks: 0, durTicks: 1920 })) },
      { name: "Drums", channel: 9, notes: [{ midi: 36, ticks: 0, durTicks: 100 }] },
    ],
    { bpm: 90, timeSig: [3, 4] },
  );
  const f = parseMidi(bytes);
  test("reads tracks, names, instruments, tempo and time signature", () => {
    expect(f.ppq).toBe(480);
    expect(f.bpm).toBe(90);
    expect(f.timeSig).toEqual({ num: 3, den: 4 });
    expect(f.tracks.map((t) => [t.name, t.instrument, t.notes.length])).toEqual([
      ["Lead", "Overdriven guitar", 8],
      ["Keys", "Piano", 3],
      ["Drums", "Drums", 1],
    ]);
    expect(f.tracks[0]!.notes[1]!.time).toBeCloseTo(60 / 90, 3);
    expect(bestTrack(f)).toBe(0);
  });
  test("turns a melody into tab in one position with bar lines", () => {
    const { doc } = midiToTab(f, std, { tracks: [0], grid: 0.25, fit: true }, "Scale");
    const notes = doc.cols.filter((c) => c.kind === "notes");
    expect(notes.length).toBe(8);
    expect(doc.bpm).toBe(90);
    // 3/4: a bar line after every three quarter notes
    expect(doc.cols.map((c) => (c.kind === "bar" ? "|" : "n")).join("")).toBe("nnn|nnn|nn");
    const frets = notes.map((c) => c.cells.find((x) => !!x)!.fret as number);
    expect(Math.max(...frets) - Math.min(...frets.filter((x) => x > 0))).toBeLessThanOrEqual(4);
    expect(notes.slice(0, -1).every((c) => Math.abs(c.beats - 1) < 1e-9)).toBe(true);
    expect(renderAscii(doc, { header: false })).toContain("|");
  });
  test("chords are spread across strings", () => {
    const { doc } = midiToTab(f, std, { tracks: [1], grid: 0.25, fit: true });
    const c = doc.cols.find((x) => x.kind === "notes")!;
    expect(c.cells.filter((x) => !!x).length).toBe(3);
  });
  test("placeChord keeps a playable span", () => {
    const p = placeChord([48, 55, 60, 64, 67, 72], std);
    const fr = p.filter((x) => x.fret > 0).map((x) => x.fret);
    expect(p.length).toBe(6);
    expect(Math.max(...fr) - Math.min(...fr)).toBeLessThanOrEqual(4);
  });
  test("rejects a file that isn't MIDI", () => {
    expect(() => parseMidi(new TextEncoder().encode("hello world"))).toThrow();
  });
});
