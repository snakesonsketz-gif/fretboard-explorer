import { describe, expect, test } from "bun:test";
import { applyAccidentals } from "../src/lib/accidentals";
import { chordPcs, drumLanes, emptyJam, jamArrangement, jamPosition, layerName, layerPcs, parseProgression, progressionText, totalBeats } from "../src/lib/jam";
import { beatTicks } from "../src/lib/timeline";

describe("jam progression", () => {
  test("reads typed chords with lengths", () => {
    const { chords, bad } = parseProgression("Am7 D7:2 | Gmaj7*2, G/B nonsense", 4);
    expect(bad).toEqual(["nonsense"]);
    expect(chords.map((c) => c.label)).toEqual(["Am7", "D7", "Gmaj7", "G/B"]);
    expect(chords.map((c) => c.beats)).toEqual([4, 2, 8, 4]);
    expect(chords[3]!.bassName).toBe("B");
    expect(progressionText(chords, 4)).toBe("Am7 D7:2 Gmaj7*2 G/B");
  });
  test("each chord starts with its own arpeggio, and layers give the right notes", () => {
    const [c] = parseProgression("Cmaj7", 4).chords;
    expect(c!.layers).toHaveLength(1);
    expect(layerPcs(c!.layers[0]!).sort((a, b) => a - b)).toEqual([0, 4, 7, 11]);
    expect(layerName(c!.layers[0]!)).toBe("Cmaj7 arpeggio");
    expect(layerPcs({ id: "x", kind: "scale", rootName: "A", scaleId: "minor-pentatonic" }).sort((a, b) => a - b).length).toBeGreaterThanOrEqual(5);
    expect(chordPcs(parseProgression("G/B", 4).chords[0]!).sort((a, b) => a - b)).toEqual([2, 7, 11]);
  });
  test("position: which chord is playing and when the next change comes", () => {
    const j = { ...emptyJam(), chords: parseProgression("G D:2 Em C", 4).chords };
    expect(totalBeats(j)).toBe(14);
    expect(jamPosition(j, 0)).toMatchObject({ index: 0, next: 1, beatInChord: 0, beatsLeft: 4 });
    expect(jamPosition(j, 4.5)).toMatchObject({ index: 1, next: 2, beatInChord: 0 });
    expect(jamPosition(j, 13)).toMatchObject({ index: 3, next: 0, beatsLeft: 1 });
    expect(jamPosition(j, 14)).toMatchObject({ index: 0 }); // loops
  });
  test("plays as a looping arrangement with chords and drums", () => {
    const j = { ...emptyJam(), chords: parseProgression("G D:2 Em C", 4).chords };
    const a = jamArrangement(j);
    expect(a.loop).toBe(true);
    expect(a.measures).toBe(4); // 14 beats → 4 bars
    const bt = beatTicks(a.ts);
    expect(a.chords.map((c) => c.start / bt)).toEqual([0, 4, 6, 10]);
    expect(a.chords[3]!.duration / bt).toBe(6); // the last chord fills the bar
    expect(a.drums.lanes.find((l) => l.voice === "kick")!.hits.length).toBeGreaterThan(0);
    expect(jamArrangement({ ...j, chordsOn: false }).chords).toHaveLength(0);
    for (const s of ["rock", "halftime", "shuffle", "four"] as const) for (const bpb of [3, 4, 6]) expect(drumLanes(s, bpb).lanes.some((l) => l.hits.length)).toBe(true);
  });
});

describe("sharps / flats", () => {
  test("rewrites note names, never degrees or words", () => {
    expect(applyAccidentals("B♭ D♯m7 E♭maj7/G", "sharps")).toBe("A♯ D♯m7 D♯maj7/G");
    expect(applyAccidentals("F♯ C♯m G♯7", "flats")).toBe("G♭ D♭m A♭7");
    expect(applyAccidentals("1 ♭3 5 ♭7 b9", "sharps")).toBe("1 ♭3 5 ♭7 b9");
    expect(applyAccidentals("Abdominal Club", "flats")).toBe("Abdominal Club");
    expect(applyAccidentals("Bb F#", "auto")).toBe("Bb F#");
  });
});
