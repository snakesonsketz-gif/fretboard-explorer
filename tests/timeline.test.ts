import { describe, expect, test } from "bun:test";
import {
  PPQ,
  arrangementTicks,
  audibleLanes,
  beatTicks,
  chordAt,
  chordMidis,
  describeLength,
  drumsOnly,
  emptyArrangement,
  fromBarBeat,
  gridTicks,
  measureTicks,
  overlaps,
  patternSteps,
  resizePattern,
  retimeChords,
  roomAfter,
  scheduleArrangement,
  ticksToSeconds,
  toBarBeat,
  type Arrangement,
  type ChordEvent,
  type TimeSig,
} from "../src/lib/timeline";

const ts = (beats: number, unit: 2 | 4 | 8 | 16): TimeSig => ({ beats, unit });
const chord = (id: string, start: number, duration: number, label = "C"): ChordEvent => ({ id, start, duration, rootName: "C", degrees: ["1", "3", "5"], label });

describe("beat and measure lengths", () => {
  test.each([
    [ts(4, 4), PPQ, 4 * PPQ],
    [ts(3, 4), PPQ, 3 * PPQ],
    [ts(5, 4), PPQ, 5 * PPQ],
    [ts(6, 8), PPQ / 2, 3 * PPQ],
    [ts(7, 8), PPQ / 2, 3.5 * PPQ],
    [ts(12, 8), PPQ / 2, 6 * PPQ],
    [ts(2, 2), PPQ * 2, 4 * PPQ],
  ])("%o", (sig, beat, measure) => {
    expect(beatTicks(sig)).toBe(beat);
    expect(measureTicks(sig)).toBe(measure);
  });
  test("grids divide the beat (triplets included)", () => {
    expect(gridTicks(ts(4, 4), 3) * 3).toBe(PPQ);
    expect(gridTicks(ts(6, 8), 2)).toBe(PPQ / 4);
  });
  test("ticks to seconds follows tempo", () => {
    expect(ticksToSeconds(PPQ, 120)).toBeCloseTo(0.5);
    expect(ticksToSeconds(measureTicks(ts(4, 4)), 60)).toBeCloseTo(4);
  });
});

describe("bar/beat counter", () => {
  test("round-trips in odd meters", () => {
    for (const sig of [ts(4, 4), ts(7, 8), ts(5, 4), ts(6, 8)])
      for (let bar = 1; bar <= 3; bar++)
        for (let beat = 1; beat <= sig.beats; beat++) {
          const t = fromBarBeat(bar, beat, sig, 17);
          expect(toBarBeat(t, sig)).toEqual({ bar, beat, tick: 17 });
        }
  });
  test("lengths read like a musician says them", () => {
    const sig = ts(4, 4);
    expect(describeLength(measureTicks(sig) * 2, sig)).toBe("2 bars");
    expect(describeLength(measureTicks(sig) + 2 * PPQ, sig)).toBe("1 bar 2 beats");
    expect(describeLength(PPQ, sig)).toBe("1 beat");
    expect(describeLength(PPQ * 1.5, sig)).toBe("1½ beats");
    expect(describeLength(PPQ / 3, sig)).toBe("⅓ beats");
  });
});

describe("chord timing: start and length are separate", () => {
  const bar = measureTicks(ts(4, 4));
  const chords = [chord("a", 0, bar / 2), chord("b", bar, bar), chord("c", bar * 2 + PPQ, PPQ)];
  test("a gap between chords is a rest", () => {
    expect(chordAt(chords, PPQ)?.id).toBe("a");
    expect(chordAt(chords, bar / 2 + 1)).toBeNull(); // a ended halfway through bar 1
    expect(chordAt(chords, bar)?.id).toBe("b");
    expect(chordAt(chords, bar * 2)).toBeNull(); // c starts on beat 2
    expect(chordAt(chords, bar * 2 + PPQ)?.id).toBe("c");
  });
  test("room after a position stops at the next chord or the end", () => {
    expect(roomAfter(chords, bar / 2, bar * 4)).toBe(bar / 2);
    expect(roomAfter(chords, bar * 3, bar * 4)).toBe(bar);
    expect(roomAfter(chords, bar, bar * 4, "b")).toBe(bar + PPQ); // ignoring itself, up to c
  });
  test("overlap detection", () => {
    expect(overlaps(chords, bar / 2, bar / 2)).toBe(false);
    expect(overlaps(chords, bar / 2, bar / 2 + 1)).toBe(true);
    expect(overlaps(chords, bar, bar, "b")).toBe(false);
  });
  test("default voicing stacks chord tones above the root", () => {
    expect(chordMidis({ rootName: "C", degrees: ["1", "3", "5", "7"] })).toEqual([48, 52, 55, 59]);
    expect(chordMidis({ rootName: "A", degrees: ["1", "b3", "5"] })).toEqual([57, 60, 64]);
    expect(chordMidis({ rootName: "C", degrees: ["1"], midis: [40, 47] })).toEqual([40, 47]);
  });
});

describe("retimeChords (changing time signature keeps bar positions)", () => {
  const four = ts(4, 4);
  const bar4 = measureTicks(four);
  test("4/4 → 6/8: one chord per bar stays one chord per bar", () => {
    const six = ts(6, 8);
    const chords = [chord("a", 0, bar4), chord("b", bar4, bar4), chord("c", bar4 * 2 + bar4 / 2, bar4 / 2)];
    const out = retimeChords(chords, four, six, "1", measureTicks(six) * 4);
    const m = measureTicks(six);
    expect(out.map((c) => [c.id, c.start / m, c.duration / m])).toEqual([["a", 0, 1], ["b", 1, 1], ["c", 2.5, 0.5]]);
  });
  test("4/4 → 3/4: snaps to the new grid, never overlaps, clips at the end", () => {
    const three = ts(3, 4);
    const chords = [chord("a", 0, PPQ * 2), chord("b", PPQ * 2, PPQ * 2), chord("c", bar4 * 3, bar4)];
    const out = retimeChords(chords, four, three, "1", measureTicks(three) * 3);
    for (let i = 1; i < out.length; i++) expect(out[i]!.start).toBeGreaterThanOrEqual(out[i - 1]!.start + out[i - 1]!.duration);
    for (const c of out) {
      expect(c.start % PPQ).toBe(0);
      expect(c.start + c.duration).toBeLessThanOrEqual(measureTicks(three) * 3);
    }
    expect(out.map((c) => c.id)).toEqual(["a", "b"]); // c was in bar 4, past the new 3-bar end
  });
});

function arr(over: Partial<Arrangement> = {}): Arrangement {
  return { ...emptyArrangement(), countIn: 0, ...over };
}

describe("scheduleArrangement", () => {
  test("chords keep their own start and length and are clipped at the end", () => {
    const a = arr({ measures: 2, chords: [chord("x", PPQ, PPQ * 2), chord("y", measureTicks(ts(4, 4)) + PPQ * 2, PPQ * 10)] });
    const ev = scheduleArrangement(a).filter((e) => e.kind === "chord");
    expect(ev.map((e) => [e.tick, e.duration])).toEqual([[PPQ, PPQ * 2], [PPQ * 6, PPQ * 2]]);
  });
  test("a 4-bar drum pattern repeats under 8 bars of chords; a longer one is cut", () => {
    const a = arr({ measures: 8 });
    a.drums = { ...a.drums, measures: 4, stepsPerBeat: 4, lanes: a.drums.lanes.map((l, i) => (i === 0 ? { ...l, hits: [{ step: 0, velocity: 1 }, { step: 60, velocity: 1 }] } : l)) };
    const kicks = scheduleArrangement(a).filter((e) => e.kind === "drum").map((e) => e.tick);
    const four = measureTicks(a.ts) * 4;
    expect(kicks).toEqual([0, 60 * (PPQ / 4), four, four + 60 * (PPQ / 4)]);
    const short = scheduleArrangement({ ...a, measures: 2 }).filter((e) => e.kind === "drum");
    expect(short.map((e) => e.tick)).toEqual([0]); // step 60 is in bar 4: past a 2-bar arrangement
  });
  test("drums only: the pattern on its own, one pattern long, looping, no chords or count-in", () => {
    const a = arr({ measures: 8, countIn: 2, loop: false, chords: [chord("x", 0, PPQ * 4)] });
    a.drums = { ...a.drums, measures: 2, stepsPerBeat: 4, lanes: a.drums.lanes.map((l, i) => (i === 0 ? { ...l, hits: [{ step: 0, velocity: 1 }, { step: 20, velocity: 1 }] } : l)) };
    const d = drumsOnly(a);
    expect([d.measures, d.countIn, d.loop, d.chords.length]).toEqual([2, 0, true, 0]);
    const ev = scheduleArrangement(d, { countIn: true }).filter((e) => e.kind !== "click");
    expect(ev.every((e) => e.kind === "drum")).toBe(true);
    expect(ev.map((e) => e.tick)).toEqual([0, 20 * (PPQ / 4)]);
    expect(a.chords.length).toBe(1); // the arrangement itself is untouched
  });
  test("drum pattern steps follow the time signature (7/8, triplet grid)", () => {
    const a = arr({ measures: 1, ts: ts(7, 8) });
    a.drums = { measures: 1, stepsPerBeat: 3, lanes: [{ ...a.drums.lanes[0]!, hits: Array.from({ length: 21 }, (_, step) => ({ step, velocity: 1 })) }] };
    expect(patternSteps(a.ts, a.drums)).toBe(21);
    const ticks = scheduleArrangement(a).map((e) => e.tick);
    expect(ticks.length).toBe(21);
    expect(ticks[20]).toBe(20 * (PPQ / 2 / 3));
    expect(Math.max(...ticks)).toBeLessThan(arrangementTicks(a));
  });
  test("count-in clicks come before the downbeat, accented on beat 1", () => {
    const a = arr({ countIn: 2, measures: 1 });
    const clicks = scheduleArrangement(a).filter((e) => e.kind === "click");
    expect(clicks.length).toBe(8);
    expect(clicks[0]!.tick).toBe(-2 * measureTicks(a.ts));
    expect(clicks.filter((c) => c.kind === "click" && c.accent).length).toBe(2);
    expect(clicks.every((c) => c.tick < 0)).toBe(true);
  });
  test("metronome clicks every beat when on", () => {
    const a = arr({ measures: 2, metronome: true, ts: ts(3, 4) });
    const clicks = scheduleArrangement(a).filter((e) => e.kind === "click");
    expect(clicks.map((c) => c.tick)).toEqual([0, 1, 2, 3, 4, 5].map((b) => b * PPQ));
  });
  test("mute and solo", () => {
    const a = arr();
    const [k, s, h] = a.drums.lanes;
    const hit = [{ step: 0, velocity: 1 }];
    a.drums = { ...a.drums, lanes: [{ ...k!, hits: hit }, { ...s!, hits: hit, muted: true }, { ...h!, hits: hit }] };
    expect(audibleLanes(a.drums).map((l) => l.voice)).toEqual(["kick", "closedHat"]);
    a.drums.lanes[1] = { ...a.drums.lanes[1]!, solo: true };
    expect(audibleLanes(a.drums).map((l) => l.voice)).toEqual(["snare"]); // solo beats mute
    expect(scheduleArrangement(a).filter((e) => e.kind === "drum").length).toBe(4); // 1-bar pattern x 4 bars
  });
  test("events come out in time order", () => {
    const a = arr({ countIn: 1, metronome: true, chords: [chord("x", PPQ, PPQ)] });
    a.drums.lanes[0] = { ...a.drums.lanes[0]!, hits: [{ step: 2, velocity: 0.5 }] };
    const t = scheduleArrangement(a).map((e) => e.tick);
    expect([...t].sort((x, y) => x - y)).toEqual(t);
  });
});

describe("resizePattern", () => {
  const sig = ts(4, 4);
  const pat = (hits: number[], spb: 1 | 2 | 3 | 4 = 4, measures = 1) => ({ measures, stepsPerBeat: spb, lanes: [{ id: "k", voice: "kick" as const, name: "Kick", hits: hits.map((step) => ({ step, velocity: 0.75 })), muted: false, solo: false, gain: 1 }] });
  const steps = (p: ReturnType<typeof resizePattern>) => p.lanes[0]!.hits.map((h) => h.step);
  test("16ths → 8ths keeps hits at the same time", () => {
    expect(steps(resizePattern(pat([0, 4, 8, 12]), sig, { stepsPerBeat: 2 }))).toEqual([0, 2, 4, 6]);
  });
  test("8ths → 16ths and back is lossless", () => {
    const up = resizePattern(pat([0, 1, 3, 6], 2), sig, { stepsPerBeat: 4 });
    expect(steps(up)).toEqual([0, 2, 6, 12]);
    expect(steps(resizePattern(up, sig, { stepsPerBeat: 2 }))).toEqual([0, 1, 3, 6]);
  });
  test("off-grid hits snap to the nearest step without duplicates", () => {
    // 16th steps 1 and 2 both round onto 8th step 1 (and 3 rounds onto 2): keep one each
    expect(steps(resizePattern(pat([0, 1, 2, 3]), sig, { stepsPerBeat: 2 }))).toEqual([0, 1, 2]);
  });
  test("shortening drops hits past the new end; lengthening keeps them", () => {
    expect(steps(resizePattern(pat([0, 12, 20, 31], 4, 2), sig, { measures: 1 }))).toEqual([0, 12]);
    expect(steps(resizePattern(pat([0, 12], 4, 1), sig, { measures: 2 }))).toEqual([0, 12]);
  });
});

import { emptySong, newId as songId, slotIdOfChord, slotMidis, songToArrangement, songToText, type Song } from "../src/lib/song";
import { scheduleArrangement as sched } from "../src/lib/timeline";

describe("Song play-through on the shared engine", () => {
  const song = (): Song => {
    const s = emptySong();
    const v = { id: songId(), label: "Verse", repeats: 2, slots: [
      { id: "g", rootName: "G", suffix: "", degrees: ["1", "3", "5"] as never, bars: 2, voicing: { shape: [3, 2, 0, 0, 0, 3], tuningId: "standard", midis: [43, 47, 50, 55, 59, 67] } },
      { id: "c", rootName: "C", suffix: "", degrees: ["1", "3", "5"] as never, bars: 1 },
    ] };
    const ch = { id: songId(), label: "Chorus", repeats: 1, slots: [{ id: "d", rootName: "D", suffix: "", degrees: ["1", "3", "5"] as never, bars: 1 }] };
    return { ...s, bpm: 100, beatsPerBar: 3, sections: [v, ch], arrangement: [] };
  };
  test("one chord per bar, in order, with repeats, in the song's bars", () => {
    const a = songToArrangement(song());
    expect(a.ts).toEqual({ beats: 3, unit: 4 });
    expect(a.measures).toBe(7); // (2 + 1) × 2 + 1
    expect(a.chords.map((c) => slotIdOfChord(c.id))).toEqual(["g", "g", "c", "g", "g", "c", "d"]);
    expect(a.chords.map((c) => c.start / measureTicks(a.ts))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(a.loop).toBe(true);
    expect(a.metronome).toBe(true);
  });
  test("the shape picked on the fretboard is what plays", () => {
    const a = songToArrangement(song());
    const ev = sched(a).filter((e) => e.kind === "chord");
    expect(ev[0]!.kind === "chord" && ev[0]!.midis).toEqual([43, 47, 50, 55, 59, 67]);
    expect(slotMidis({ rootName: "C", degrees: ["1", "3", "5"] as never })).toEqual([48, 52, 55]);
  });
  test("playing one section: once, no repeats, no click", () => {
    const s = song();
    const a = songToArrangement(s, { sectionId: s.sections[0]!.id, click: false });
    expect(a.chords.map((c) => slotIdOfChord(c.id))).toEqual(["g", "g", "c"]);
    expect(a.loop).toBe(false);
    expect(sched(a).some((e) => e.kind === "click")).toBe(false);
  });
  test("the chart text shows the picked shape", () => {
    expect(songToText(song())).toContain("G (V) [320003] ×2 bars");
  });
});

import { beatFraction, GRIDS, gridName, nudgeTicks, patternSteps, SNAPS, snap as snapTo, snapName, snapTicks, stepTo, stepTicks } from "../src/lib/timeline";

describe("snap to: every variation", () => {
  const t44 = { beats: 4, unit: 4 };
  const t68 = { beats: 6, unit: 8 };
  const t34 = { beats: 3, unit: 4 };
  const t78 = { beats: 7, unit: 8 };
  test("step sizes in 4/4 (a beat is 480 ticks)", () => {
    const want: Record<string, number> = {
      free: 1, bar: 1920, "half-bar": 960, d1: 720, "1": 480, t1: 320, "d1/2": 360, "1/2": 240, "t1/2": 160,
      "d1/4": 180, "1/4": 120, q5: 96, "t1/4": 80, q7: 480 / 7, "1/8": 60, "t1/8": 40, "1/16": 30,
    };
    for (const s of SNAPS) expect(snapTicks(t44, s.id)).toBeCloseTo(want[s.id]!, 6);
    expect(Object.keys(want).length).toBe(SNAPS.length);
  });
  test("note names follow the time signature", () => {
    const names44 = Object.fromEntries(SNAPS.map((s) => [s.id, snapName(t44, s.id)]));
    expect(names44["1"]).toBe("1/4 · 1 beat");
    expect(names44["1/2"]).toBe("1/8 · ½ beat");
    expect(names44["1/4"]).toBe("1/16 · ¼ beat");
    expect(names44["1/8"]).toBe("1/32 · ⅛ beat");
    expect(names44["1/16"]).toBe("1/64 · 1/16 beat");
    expect(names44.d1).toBe("Dotted 1/4 · 1½ beats");
    expect(names44["d1/2"]).toBe("Dotted 1/8 · ¾ beat");
    expect(names44["d1/4"]).toBe("Dotted 1/16 · ⅜ beat");
    expect(names44.t1).toBe("1/4 triplet · 3 per 2 beats");
    expect(names44["t1/2"]).toBe("1/8 triplet · 3 per beat");
    expect(names44["t1/4"]).toBe("1/16 triplet · 6 per beat");
    expect(names44["t1/8"]).toBe("1/32 triplet · 12 per beat");
    expect(names44.q5).toBe("Quintuplet · 5 per beat");
    expect(names44.q7).toBe("Septuplet · 7 per beat");
    // In 6/8 the counted unit is the eighth note.
    expect(snapName(t68, "1")).toBe("1/8 · 1 beat");
    expect(snapName(t68, "1/2")).toBe("1/16 · ½ beat");
    expect(snapName(t68, "t1/2")).toBe("1/16 triplet · 3 per beat");
    expect(snapName(t68, "d1")).toBe("Dotted 1/8 · 1½ beats");
    // Names are unique so the list is never ambiguous.
    for (const ts of [t44, t68, t34, t78]) expect(new Set(SNAPS.map((s) => snapName(ts, s.id))).size).toBe(SNAPS.length);
  });
  test("bar and half bar follow the meter", () => {
    expect(snapTicks(t34, "bar")).toBe(1440);
    expect(snapTicks(t68, "half-bar")).toBe(720); // one dotted quarter pulse
    expect(snapTicks(t78, "bar")).toBe(1680);
  });
  test("snapping lands on whole ticks, even for septuplets", () => {
    for (const s of SNAPS)
      for (const ts of [t44, t68, t34, t78]) {
        const step = snapTicks(ts, s.id);
        for (const x of [0, 77, 333.3, 1000, 2047]) {
          const v = snapTo(x, step);
          expect(Number.isInteger(v)).toBe(true);
          expect(Math.abs(v - x)).toBeLessThanOrEqual(step / 2 + 0.5);
        }
      }
  });
  test("stepping walks every grid point without drift", () => {
    const step = snapTicks(t44, "q7");
    let t = 0;
    const seen: number[] = [];
    for (let i = 0; i < 14; i++) seen.push((t = stepTo(t, step, 1)));
    expect(seen[6]).toBe(480); // 7 septuplets = one beat exactly
    expect(seen[13]).toBe(960);
    for (let i = 0; i < 14; i++) t = stepTo(t, step, -1);
    expect(t).toBe(0);
    // An off-grid position steps to the neighbouring grid points.
    expect(stepTo(130, 120, 1)).toBe(240);
    expect(stepTo(130, 120, -1)).toBe(120);
    expect(nudgeTicks(t44, "free")).toBe(30);
    expect(nudgeTicks(t44, "bar")).toBe(1920);
  });
  test("position text inside a beat", () => {
    expect(beatFraction(0, t44)).toBe("");
    expect(beatFraction(240, t44)).toBe("1/2");
    expect(beatFraction(160, t44)).toBe("1/3");
    expect(beatFraction(320, t44)).toBe("2/3");
    expect(beatFraction(206, t44)).toBe("3/7");
    expect(beatFraction(96, t44)).toBe("1/5");
    expect(beatFraction(7, t44)).toBe("7 ticks");
  });
  test("re-timing with a triplet snap keeps chords on triplet points", () => {
    const four = t44;
    const chords = [{ id: "a", start: 0, duration: 320, rootName: "C", degrees: ["1", "3", "5"], label: "C" }];
    const out = retimeChords(chords as never, four, t34, "t1", measureTicks(t34) * 2);
    expect(out[0]!.start % 320).toBe(0);
    expect(Number.isInteger(out[0]!.duration)).toBe(true);
  });
  test("drum grids: every subdivision is whole ticks and named", () => {
    expect(GRIDS).toEqual([1, 2, 3, 4, 5, 6, 8, 12]);
    for (const ts of [t44, t68, t34, t78, { beats: 2, unit: 2 }, { beats: 5, unit: 16 }])
      for (const g of GRIDS) {
        expect(Number.isInteger(stepTicks(ts, { stepsPerBeat: g }))).toBe(true);
        expect(patternSteps(ts, { measures: 1, stepsPerBeat: g })).toBe(ts.beats * g);
      }
    expect(GRIDS.map((g) => gridName(t44, g))).toEqual([
      "Beats (1/4)", "1/8 notes", "1/8 triplets", "1/16 notes", "Quintuplets (5 per beat)", "1/16 triplets", "1/32 notes", "1/32 triplets",
    ]);
    expect(gridName(t68, 2)).toBe("1/16 notes");
  });
});

describe("lengths read in any subdivision", () => {
  const t44 = { beats: 4, unit: 4 };
  test("septuplets, quintuplets and odd ticks", () => {
    expect(describeLength(206, t44)).toBe("3/7 beats");
    expect(describeLength(549, t44)).toBe("1 1/7 beats");
    expect(describeLength(96, t44)).toBe("⅕ beats");
    expect(describeLength(30, t44)).toBe("1/16 beats");
    expect(describeLength(487, t44)).toBe("1 beat + 7 ticks");
    expect(describeLength(180, t44)).toBe("⅜ beats");
  });
});
