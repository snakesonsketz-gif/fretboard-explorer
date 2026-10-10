import { describe, expect, test } from "bun:test";
import { parseTimeSig, sanitizeArrangement, songToArrangement } from "../src/lib/sequences";
import { emptySong, type Song } from "../src/lib/song";
import { PPQ, emptyArrangement, measureTicks } from "../src/lib/timeline";

describe("sanitizeArrangement", () => {
  test("garbage in, a working default out", () => {
    for (const bad of [null, undefined, 42, "x", [], { bpm: "fast" }]) {
      const a = sanitizeArrangement(bad);
      expect(a.bpm).toBe(90);
      expect(a.ts).toEqual({ beats: 4, unit: 4 });
      expect(a.drums.lanes.length).toBeGreaterThan(0);
    }
  });
  test("clamps out-of-range values and drops broken chords / hits", () => {
    const a = sanitizeArrangement({
      bpm: 999,
      ts: { beats: 7, unit: 5 },
      measures: 2,
      chords: [
        { id: "ok", start: 0, duration: PPQ, rootName: "C", degrees: ["1", "3", "5"], label: "C" },
        { id: "noroot", start: 0, duration: PPQ, degrees: ["1"] },
        { id: "late", start: 1e9, duration: PPQ, rootName: "D", degrees: ["1"], label: "D" },
      ],
      drums: { measures: 1, stepsPerBeat: 4, lanes: [{ id: "k", voice: "kick", name: "Kick", hits: [{ step: 0, velocity: 3 }, { step: -1, velocity: 1 }, { step: 1.5, velocity: 1 }], gain: 2 }, { voice: "cowbell" }] },
    });
    expect(a.bpm).toBe(300);
    expect(a.ts).toEqual({ beats: 7, unit: 4 });
    expect(a.chords.map((c) => c.id)).toEqual(["ok"]);
    expect(a.drums.lanes.length).toBe(1);
    expect(a.drums.lanes[0]!.hits).toEqual([{ step: 0, velocity: 1 }]);
    expect(a.drums.lanes[0]!.gain).toBe(1);
  });
  test("a valid arrangement survives a save/load round trip unchanged", () => {
    const a = emptyArrangement();
    a.chords = [{ id: "a", start: PPQ, duration: PPQ * 3, rootName: "Eb", degrees: ["1", "3", "5", "b7"], label: "Eb7", midis: [51, 55, 58, 61] }];
    a.drums.lanes[0] = { ...a.drums.lanes[0]!, hits: [{ step: 0, velocity: 0.7 }], sampleId: "abc", sampleName: "my kick" };
    expect(sanitizeArrangement(JSON.parse(JSON.stringify(a)))).toEqual(a);
  });
});

describe("parseTimeSig", () => {
  test.each([
    ["6/8", 4, { beats: 6, unit: 8 }],
    ["7/8 (2+2+3)", 4, { beats: 7, unit: 8 }],
    ["3/4", 4, { beats: 3, unit: 4 }],
    ["", 3, { beats: 3, unit: 4 }],
    [undefined, 5, { beats: 5, unit: 4 }],
  ])("%p", (text, bpb, expected) => expect(parseTimeSig(text as string | undefined, bpb)).toEqual(expected));
});

describe("songToArrangement", () => {
  test("plays sections in arrangement order with repeats, each slot lasting its bars", () => {
    const s: Song = {
      ...emptySong(),
      bpm: 100,
      beatsPerBar: 3,
      sections: [
        { id: "v", label: "Verse", repeats: 2, slots: [{ id: "1", rootName: "C", suffix: "", degrees: ["1", "3", "5"], bars: 1 }, { id: "2", rootName: "G", suffix: "", degrees: ["1", "3", "5"], bars: 2 }] },
        { id: "c", label: "Chorus", repeats: 1, slots: [{ id: "3", rootName: "A", suffix: "m", degrees: ["1", "b3", "5"], bars: 1 }] },
      ],
      arrangement: ["c", "v"],
    };
    const a = songToArrangement(s);
    const bar = measureTicks({ beats: 3, unit: 4 });
    expect(a.bpm).toBe(100);
    expect(a.ts).toEqual({ beats: 3, unit: 4 });
    expect(a.chords.map((c) => [c.label, c.start / bar, c.duration / bar])).toEqual([
      ["Am", 0, 1],
      ["C", 1, 1],
      ["G", 2, 2],
      ["C", 4, 1],
      ["G", 5, 2],
    ]);
    expect(a.measures).toBe(7);
  });
});
