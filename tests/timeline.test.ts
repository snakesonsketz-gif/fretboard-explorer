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
    const out = retimeChords(chords, four, six, 1, measureTicks(six) * 4);
    const m = measureTicks(six);
    expect(out.map((c) => [c.id, c.start / m, c.duration / m])).toEqual([["a", 0, 1], ["b", 1, 1], ["c", 2.5, 0.5]]);
  });
  test("4/4 → 3/4: snaps to the new grid, never overlaps, clips at the end", () => {
    const three = ts(3, 4);
    const chords = [chord("a", 0, PPQ * 2), chord("b", PPQ * 2, PPQ * 2), chord("c", bar4 * 3, bar4)];
    const out = retimeChords(chords, four, three, 1, measureTicks(three) * 3);
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
