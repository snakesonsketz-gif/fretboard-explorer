import { describe, expect, test } from "bun:test";
import { SR, rng, shape, strum, take } from "./helpers/guitar";
import { checkChord, detectOnsets, spectrumOf } from "../src/lib/listen/dsp";
import { analyseStrum, roomFloorOf, type TargetChord } from "../src/lib/listen/score";

const G: TargetChord = { rootName: "G", degrees: ["1", "3", "5"], label: "G" };
const G7: TargetChord = { rootName: "G", degrees: ["1", "3", "5", "b7"], label: "G7" };
const C: TargetChord = { rootName: "C", degrees: ["1", "3", "5"], label: "C" };

/** Strum `tab` with a little room hiss, then analyse it as an attempt at `target`. */
function attempt(tab: string, target: TargetChord, opts: Parameters<typeof strum>[1] = {}) {
  const { audio, onset } = strum(tab, { seconds: 2, noise: 0.002, startAt: 0.45, ...opts });
  return analyseStrum({ audio, sr: SR, onset, end: audio.length, target, roomFloor: roomFloorOf(audio, SR, 0) });
}

describe("Listen: accuracy", () => {
  test("a clean G is all heard, nothing extra", () => {
    const r = attempt("320003", G);
    expect(r.accuracy.verdict).toBe("good");
    expect(r.accuracy.notes.map((n) => [n.name, n.status])).toEqual([["G", "heard"], ["B", "heard"], ["D", "heard"]]);
    expect(r.accuracy.extras).toEqual([]);
    expect(r.accuracy.score).toBe(100);
  });
  test("a wrong note (C on the B string) is called out", () => {
    const r = attempt("320013", G);
    expect(r.accuracy.verdict).toBe("fix");
    expect(r.accuracy.extras).toContainEqual({ name: "C", status: "wrong" });
  });
  test("playing G when the chord is G7: the missing b7 (F) is reported, not excused as an overtone", () => {
    const r = attempt("320003", G7);
    expect(r.accuracy.notes.find((n) => n.degree === "b7")?.status).toBe("missing");
    expect(r.accuracy.verdict).toBe("fix");
  });
  test("a real G7 passes", () => {
    expect(attempt("320001", G7).accuracy.verdict).toBe("good");
  });
  test("the 5th may be left out of a 4-note chord without penalty", () => {
    // G7 without its D: G2 B2 G3 B3 F4 (x on the D string) — "3x0001"
    const r = attempt("32x001", G7);
    const fifth = r.accuracy.notes.find((n) => n.degree === "5")!;
    expect(["left-out", "hidden", "heard"]).toContain(fifth.status);
    expect(r.accuracy.verdict).not.toBe("fix");
  });
  test("a detuned guitar is still judged correctly, and its tuning is reported", () => {
    const r = attempt("x32010", C, { cents: -22 });
    expect(r.accuracy.verdict).toBe("good");
    expect(r.tuningCents).toBeGreaterThan(-35);
    expect(r.tuningCents).toBeLessThan(-8);
  });
  test("too quiet → unsure everywhere, never 'wrong'", () => {
    const r = attempt("320003", G, { amp: 0.0006, noise: 0.0001 });
    expect(r.level.tooQuiet).toBe(true);
    expect([r.accuracy.verdict, r.clarity.verdict, r.ringOut.verdict]).toEqual(["unsure", "unsure", "unsure"]);
  });
  test("no false 'wrong note' on correctly played chords across varied strums", () => {
    const tabs: [string, TargetChord][] = [["320003", G], ["x32010", C], ["320001", G7], ["xx0232", { rootName: "D", degrees: ["1", "3", "5"], label: "D" }], ["x02210", { rootName: "A", degrees: ["1", "b3", "5"], label: "Am" }], ["022000", { rootName: "E", degrees: ["1", "b3", "5"], label: "Em" }]];
    let wrong = 0;
    for (let seed = 1; seed <= 8; seed++)
      for (const [tab, t] of tabs) {
        const r = rng(seed);
        const res = attempt(tab, t, { seed, bright: 0.3 + 0.4 * Math.abs(r()), spread: 0.004 + 0.01 * Math.abs(r()), cents: 12 * r() });
        wrong += res.accuracy.extras.filter((e) => e.status === "wrong").length;
      }
    expect(wrong).toBe(0);
  }, 30_000); // 48 synthetic strums: slow on a busy machine
});

describe("Listen: lessons from Bradley's real recordings (iPhone, Oct 2026)", () => {
  test("a D played on the B string in a C chord is called out (not hidden as a low G's overtone)", () => {
    const r = attempt("x32030", C);
    expect(r.accuracy.extras).toContainEqual({ name: "D", status: "wrong" });
  });
  test("a wrong note's own overtones are not reported as more wrong notes", () => {
    const r = attempt("024000", { rootName: "E", degrees: ["1", "b3", "5"], label: "Em" });
    const wrong = r.accuracy.extras.filter((e) => e.status === "wrong").map((e) => e.name);
    expect(wrong).toContain("F#");
    expect(wrong.length).toBe(1);
  });
  test("a string that barely sounds (muted) is not counted as heard", () => {
    const r = attempt("x32010", C, { strings: { 3: { amp: 0.004 } } });
    expect(r.accuracy.notes.find((n) => n.name === "G")!.status).not.toBe("heard");
  });
  test("quick rhythm strumming: buzz isn't judged on the hiss between strums", () => {
    const { audio } = take([0.6, 0.85, 1.1, 1.35].map((at) => ({ tab: "320003", at, opts: { spread: 0.01 } })), 3, 0.002);
    const r = analyseStrum({ audio, sr: SR, onset: Math.round(0.6 * SR), end: Math.round(0.85 * SR), target: G, roomFloor: roomFloorOf(audio, SR, 0) });
    expect(r.clarity.buzz).toBe("unknown");
  });
});

describe("Listen: up-strums", () => {
  const TABS: [string, TargetChord][] = [["320003", G], ["x32010", C], ["xx0232", { rootName: "D", degrees: ["1", "3", "5"], label: "D" }], ["022000", { rootName: "E", degrees: ["1", "b3", "5"], label: "Em" }], ["x02210", { rootName: "A", degrees: ["1", "b3", "5"], label: "Am" }]];
  test("an up-strum that only catches the top 3–6 strings isn't marked wrong, missing, buzzy or dead", () => {
    let flagged = 0;
    for (const [tab, t] of TABS)
      for (const k of [3, 4, 5, 6])
        for (let seed = 1; seed <= 2; seed++) {
          const r = attempt(tab, t, { up: true, upStrings: k, spread: 0.008, seed, amp: 0.6 });
          flagged += r.accuracy.notes.filter((n) => n.status === "missing").length + r.accuracy.extras.filter((e) => e.status === "wrong").length + r.clarity.dead.length + (r.clarity.buzz === "some" || r.clarity.buzz === "strong" ? 1 : 0);
        }
    expect(flagged).toBe(0);
  }, 30_000); // many synthetic strums: slow on a busy machine
  test("down-up strumming: every down-strum and nearly every up-strum is counted, nothing extra", () => {
    let found = 0, total = 0, extra = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const parts = Array.from({ length: 12 }, (_, i) => ({ tab: TABS[seed % TABS.length]![0], at: 0.3 + i * 0.4, opts: { up: i % 2 === 1, upStrings: i % 2 ? 4 : 6, amp: i % 2 ? 0.7 : 1, spread: 0.008, seconds: 1.5 } }));
      const { audio, onsets } = take(parts, 5.4, 0.002, seed);
      const det = detectOnsets(audio, SR);
      total += onsets.length;
      found += onsets.filter((o) => det.some((d) => Math.abs(d - o) < 0.05 * SR)).length;
      extra += det.filter((d) => !onsets.some((o) => Math.abs(d - o) < 0.05 * SR)).length;
    }
    expect(extra).toBe(0);
    expect(found / total).toBeGreaterThanOrEqual(0.95);
  });
});

describe("Listen: clarity and ring-out", () => {
  test("clean strum: no buzz, rings", () => {
    const r = attempt("320003", G);
    expect(r.clarity.buzz).toBe("none");
    expect(r.clarity.verdict).toBe("good");
    expect(r.ringOut.verdict).toBe("good");
  });
  test("a buzzing string is heard as buzz (and the room alone is not)", () => {
    const buzzy = attempt("320003", G, { strings: { 1: { buzz: 2 } } });
    expect(["some", "strong"]).toContain(buzzy.clarity.buzz);
    expect(buzzy.clarity.verdict).toBe("fix");
    const noisyRoom = attempt("320003", G, { noise: 0.012 });
    expect(noisyRoom.clarity.buzz).toBe("none");
  });
  test("a choked string (finger touching the D string) is named", () => {
    const r = attempt("320003", G, { strings: { 2: { muteAfter: 0.12 } } });
    expect(r.ringOut.short.map((n) => n.name)).toEqual(["D"]);
    expect(r.clarity.dead).toEqual(["D"]);
    expect(r.ringOut.verdict).toBe("fix");
  });
  test("no note is falsely called dead on clean strums", () => {
    let dead = 0;
    for (let seed = 1; seed <= 8; seed++)
      for (const [tab, t] of [["320003", G], ["x32010", C], ["320001", G7], ["022000", { rootName: "E", degrees: ["1", "b3", "5"], label: "Em" }]] as [string, TargetChord][]) {
        const r = rng(seed * 5);
        dead += attempt(tab, t, { seed, bright: 0.3 + 0.4 * Math.abs(r()), spread: 0.004 + 0.01 * Math.abs(r()) }).clarity.dead.length;
      }
    expect(dead).toBe(0);
  });
  test("a chord cut short by the palm is reported as short", () => {
    const r = attempt("320003", G, { muteAfter: 0.3 });
    expect(r.ringOut.seconds).toBeLessThan(0.7);
    expect(r.ringOut.verdict).toBe("fix");
  });
});

describe("Listen: timing", () => {
  test("strums are found within 1 ms across a take", () => {
    const times = [0.3, 0.9, 1.35, 2.1, 2.55, 3.3];
    const { audio, onsets } = take(times.map((at, i) => ({ tab: ["320003", "x32010", "xx0232"][i % 3]!, at, opts: { spread: 0.01 } })), 4.2, 0.003);
    const found = detectOnsets(audio, SR);
    expect(found.length).toBe(onsets.length);
    found.forEach((f, i) => expect(Math.abs(f - onsets[i]!) / SR).toBeLessThan(0.001));
  });
  test("verdicts from an offset", () => {
    const base = { audio: strum("320003").audio, sr: SR, onset: Math.round(0.1 * SR), end: SR, target: G };
    expect(analyseStrum({ ...base, offsetMs: 12 }).timing.verdict).toBe("good");
    expect(analyseStrum({ ...base, offsetMs: -90 }).timing).toMatchObject({ verdict: "fix", summary: "90 ms early." });
    expect(analyseStrum({ ...base, offsetMs: null }).timing.verdict).toBe("unsure");
  });
});

describe("checkChord sanity", () => {
  test("target notes are explained before extras are searched", () => {
    const { audio, onset } = strum("x24432", { seconds: 1.2 }); // Bm: F# is B's 3rd partial
    const w = new Float32Array(16384);
    w.set(audio.subarray(onset + 4000, onset + 4000 + 16384));
    const c = checkChord(spectrumOf(w, SR), [11, 2, 6]);
    expect(c.extras.filter((e) => e.strength >= 0.13)).toEqual([]);
    expect(shape("x24432").filter(Boolean).length).toBe(5);
  });
});

import { ListenSession, type AudioSource } from "../src/lib/listen/session";

/** Feed a recorded take into a session 2048 frames at a time, as a live microphone would. */
function stream(audio: Float32Array, expectFn: ConstructorParameters<typeof ListenSession>[1], latency = 0) {
  let end = 0;
  const src: AudioSource = { sampleRate: SR, get endFrame() { return end; }, read: (a, b) => (a < 0 || b > end || b <= a ? null : audio.slice(a, b)) };
  const s = new ListenSession(src, expectFn, latency);
  for (end = 2048; end <= audio.length; end += 2048) if ((end / 2048) % 2 === 0) s.tick();
  end = audio.length;
  s.tick();
  return s;
}

describe("Listen: live session", () => {
  test("streams a take: finds every strum, judges each against the chord due then, times them", () => {
    // Play-along: C at 1.0 s, G at 2.5 s (played 30 ms late), Am at 4.0 s — after 0.9 s of room noise.
    const due = [{ t: 1.0, tab: "x32010", target: C }, { t: 2.5, tab: "320003", target: G }, { t: 4.0, tab: "x02210", target: { rootName: "A", degrees: ["1", "b3", "5"], label: "Am" } as TargetChord }];
    const played = [1.0, 2.53, 4.0];
    const { audio } = take(due.map((d, i) => ({ tab: d.tab, at: played[i]!, opts: { spread: 0.01 } })), 5.5, 0.002);
    const s = stream(audio, (time) => {
      const d = [...due].sort((a, b) => Math.abs(a.t - time) - Math.abs(b.t - time))[0]!;
      return { target: d.target, expectedTime: d.t, expectedSeconds: 1.5 };
    });
    expect(s.strums.map((x) => x.target?.label)).toEqual(["C", "G", "Am"]);
    expect(s.strums.every((x) => x.report)).toBe(true);
    // The first two are final (the next strum ended their ring); the last may still ring.
    expect(s.strums.map((x) => x.final)).toEqual([true, true, false]);
    expect(s.strums.map((x) => x.report!.accuracy.verdict)).toEqual(["good", "good", "good"]);
    const offs = s.strums.map((x) => Math.round(x.report!.timing.offsetMs!));
    expect(Math.abs(offs[0]!)).toBeLessThanOrEqual(2);
    expect(offs[1]).toBeGreaterThanOrEqual(28);
    expect(offs[1]).toBeLessThanOrEqual(32);
    expect(s.roomFloor).toBeDefined(); // measured during the quiet lead-in
    expect(s.strums.slice(0, 2).map((x) => x.report!.ringOut.untilNext)).toEqual([true, true]);
  });
  test("device latency is subtracted", () => {
    const { audio } = take([{ tab: "320003", at: 1.08 }], 2.6, 0.002);
    const s = stream(audio, () => ({ target: G, expectedTime: 1.0 }), 0.08);
    expect(Math.abs(s.strums[0]!.report!.timing.offsetMs!)).toBeLessThan(2);
  });
  test("the audio clock started before the microphone (e.g. Sequencer used first)", () => {
    // A real capture numbers samples by the AudioContext clock: if that clock has been running
    // 5 s, the first captured sample is frame 240000 and nothing before it holds audio. The
    // session must take its quiet-room reference (and scan for strums) from real audio only.
    const { audio } = take([{ tab: "320003", at: 1.0 }], 2.6, 0.002);
    const live = (offset: number) => {
      let n = 0; // samples delivered so far; the session is created before the first batch arrives
      const src: AudioSource = {
        sampleRate: SR,
        get endFrame() { return n ? offset + n : 0; },
        get firstFrame() { return n ? offset : 0; },
        read: (a, b) => (n === 0 || a < offset || b > offset + n || b <= a ? null : audio.slice(a - offset, b - offset)),
      };
      const s = new ListenSession(src, () => ({ target: G }));
      for (n = 2048; n <= audio.length; n += 2048) if ((n / 2048) % 2 === 0) s.tick();
      n = audio.length;
      s.tick();
      return s;
    };
    const fresh = live(0), late = live(5 * SR);
    expect(late.strums.length).toBe(1);
    // Same audio, read at different block boundaries: within a few percent (not from silence).
    expect(late.roomFloor! / fresh.roomFloor!).toBeGreaterThan(0.95);
    expect(late.roomFloor! / fresh.roomFloor!).toBeLessThan(1.05);
    expect(late.strums[0]!.report!.clarity.verdict).toBe(fresh.strums[0]!.report!.clarity.verdict);
    expect(late.strums[0]!.report!.clarity.verdict).toBe("good");
  });
  test("silence and room noise produce no strums", () => {
    const quiet = new Float32Array(SR * 3).map(() => 0.003 * (Math.random() * 2 - 1));
    expect(stream(quiet, () => ({ target: G })).strums.length).toBe(0);
  });
});

describe("Listen: sloppy chord changes", () => {
  test("a string left ringing from the previous chord is heard as an extra note", () => {
    // G (320003) then Am (x02210) — but the G is allowed to keep ringing under the Am.
    const { audio } = take([{ tab: "320003", at: 0.8, opts: { letRing: true } }, { tab: "x02210", at: 1.6 }], 3.2, 0.002);
    const Am: TargetChord = { rootName: "A", degrees: ["1", "b3", "5"], label: "Am" };
    const s = stream(audio, (t) => ({ target: t < 1.2 ? G : Am }));
    expect(s.strums[1]!.report!.accuracy.extras.some((e) => e.name === "G" && e.status === "wrong")).toBe(true);
  });
});

describe("Listen: non-stop strumming", () => {
  test("a choked string is still caught when the next strum comes after 1 s, and clarity is judged", () => {
    const parts = [0.2, 1.2, 2.2, 3.2].map((at, i) => ({ tab: "320003", at, opts: { spread: 0.01, ...(i === 2 ? { strings: { 2: { muteAfter: 0.12 } } } : {}) } }));
    const { audio } = take(parts, 4.4, 0.002);
    const s = stream(audio, () => ({ target: G }));
    expect(s.strums.length).toBe(4);
    expect(s.strums.map((x) => x.report!.clarity.dead)).toEqual([[], [], ["D"], []]);
    expect(s.strums.every((x) => x.report!.clarity.verdict !== "unsure")).toBe(true);
  });
});

describe("Listen: Bradley's 'no strums' recordings (iPhone, round 3)", () => {
  const { looksLikeNoise } = require("../src/lib/listen/score") as typeof import("../src/lib/listen/score");
  const m = (peakDb: number, topSalience: number, extras: number[]) =>
    ({ peakDb, chord: { target: [], extras: extras.map((strength, i) => ({ pc: i, midi: 60 + i, strength })), tuningCents: 0, topSalience } }) as Parameters<typeof looksLikeNoise>[0];
  test("knocks, squeaks, claps and voices aren't strums", () => {
    // Measured on his takes: hand noises holding G, a clap, putting a cup down.
    expect(looksLikeNoise(m(-46.9, 3.9, [0.75, 0.5]))).toBe(true);
    expect(looksLikeNoise(m(-47.3, 1.5, [0.21, 0.16]))).toBe(true);
    expect(looksLikeNoise(m(-36.9, 4.3, [0.79, 0.7]))).toBe(true);
    expect(looksLikeNoise(m(-50.9, 2.2, [0.48, 0.45]))).toBe(true);
  });
  test("real strums stay strums: soft, across the room, a wrong chord, muted scratches", () => {
    expect(looksLikeNoise(m(-45.6, 6.6, [0.06, 0.05]))).toBe(false); // soft C
    expect(looksLikeNoise(m(-43.1, 9.7, []))).toBe(false); // G with the phone across the room
    expect(looksLikeNoise(m(-38.5, 10.6, [0.63]))).toBe(false); // small F with the high E open (wrong note)
    expect(looksLikeNoise(m(-35.3, 5.1, [0.17]))).toBe(false); // a fast, light G
    expect(looksLikeNoise(m(-24.8, 4.3, [0.38, 0.31]))).toBe(false); // a muted scratch: loud
    expect(looksLikeNoise(m(-42, 2.0, [1.4, 1.2]))).toBe(false); // a different chord altogether
  });
});

describe("Listen: how a strum was played (palm mute, chop, scratch, let ring)", () => {
  const { techniqueOf } = require("../src/lib/listen/score") as typeof import("../src/lib/listen/score");
  const t = (dropDb: number | null, brightEarlyDb: number, brightLateDb: number | null, topSalience: number) =>
    techniqueOf({ feel: { dropDb, brightEarlyDb, brightLateDb }, chord: { target: [], extras: [], tuningCents: 0, topSalience } });
  test("Bradley's round 3: palm-muted E5 chugs, G5 let ring, muted scratches", () => {
    expect(t(8.5, -21.1, -44.0, 8)).toBe("palm-mute");
    expect(t(13.3, -25.7, -38.7, 8)).toBe("palm-mute");
    expect(t(10.5, -21.1, -24.5, 9)).toBe("open");
    expect(t(9.9, -15.7, -18.0, 9)).toBe("open");
    expect(t(31.8, -13.5, -20.5, 4.3)).toBe("scratch");
  });
  test("a chop is a chord that stops at once; a palm too heavy is a dark thud", () => {
    expect(t(26, -12, -30, 9)).toBe("chop");
    expect(t(12, -30, -45, 3)).toBe("palm-mute");
    expect(t(null, -12, null, 9)).toBe("open"); // the next strum came too soon to tell
  });
});
