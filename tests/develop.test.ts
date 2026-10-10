import { describe, expect, test } from "bun:test";
import { SR, take } from "./helpers/guitar";
import { THRESHOLDS, type TargetChord } from "../src/lib/listen/score";
import { analyseTake, crc32, encodeWav, judgeTake, makeZip, scorecard, toFloat, toPcm, verdictFor, type TakeLabel } from "../src/lib/listen/takes";
import { sanitize, changedKeys } from "../src/lib/listen/tuning";

const G: TargetChord = { rootName: "G", degrees: ["1", "3", "5"], label: "G" };
const C: TargetChord = { rootName: "C", degrees: ["1", "3", "5"], label: "C" };

/** A recorded take: a second of room first, then the same strum three times, 1.6 s apart. */
function rec(tab: string, target: TargetChord, opts = {}) {
  const { audio } = take([1.0, 2.6, 4.2].map((at) => ({ tab, at, opts: { spread: 0.012, ...opts } })), 6.2, 0.002);
  return { pcm: toPcm(audio), sampleRate: SR, target };
}

describe("Develop: takes are analysed like Listen hears them", () => {
  const clean = rec("320003", G);
  const strums = analyseTake(clean);

  test("finds every strum in a recorded take and finishes the last one's ring-out", () => {
    expect(strums.map((s) => Math.round(s.time * 10) / 10)).toEqual([1, 2.6, 4.2]);
    // The last strum rang to the end of the recording — judged as complete, not "so far".
    const last = judgeTake(strums, G, THRESHOLDS).at(-1)!;
    expect(last.ringOut.summary).not.toContain("so far");
    expect(last.ringOut.verdict).toBe("good");
  });

  test("scorecard: a clean take has no false alarms; a wrong note and a muted string are caught", () => {
    const wrong = rec("320001", G); // F on the top string instead of G
    const muted = rec("320003", G, { strings: { 2: { muteAfter: 0.12 } } }); // finger resting on the D string
    const takes: { label: TakeLabel; reports: ReturnType<typeof judgeTake> }[] = [
      { label: "clean", reports: judgeTake(strums, G, THRESHOLDS) },
      { label: "wrong-note", reports: judgeTake(analyseTake(wrong), G, THRESHOLDS) },
      { label: "muted", reports: judgeTake(analyseTake(muted), G, THRESHOLDS) },
    ];
    const card = Object.fromEntries(scorecard(takes).map((l) => [l.label, l]));
    expect(card.clean).toMatchObject({ strums: 3, good: 3, bad: 0 });
    expect(card["wrong-note"]!.strums).toBe(3);
    expect(card["wrong-note"]!.good).toBeGreaterThanOrEqual(2);
    // Simulated guitar: the deadened D is caught on 2 of 3 strums (real guitars: see the Develop tab).
    expect(card.muted!.strums).toBe(3);
    expect(card.muted!.good).toBeGreaterThanOrEqual(2);
    expect(card.buzz).toMatchObject({ takes: 0, strums: 0 });
  });

  test("a muted note hidden under another note's overtone counts as unsure, not missed", () => {
    const hidden = rec("x32x10", C); // the only G muted — G sits on C's 3rd partial
    const v = judgeTake(analyseTake(hidden), C, THRESHOLDS).map((r) => verdictFor("muted", r).result);
    expect(v).toEqual(["unsure", "unsure", "unsure"]);
  });

  test("changing thresholds re-judges without re-measuring, and can create false alarms", () => {
    const strict = { ...THRESHOLDS, heard: 0.95, faint: 0.9 }; // almost nothing counts as heard
    const reports = judgeTake(strums, G, strict);
    expect(reports.some((r) => verdictFor("clean", r).result === "bad")).toBe(true);
    expect(judgeTake(strums, G, THRESHOLDS).every((r) => verdictFor("clean", r).result === "good")).toBe(true);
  });
});

describe("Develop: tuning values", () => {
  test("out-of-range values are clamped and paired thresholds stay in order", () => {
    const t = sanitize({ heard: 0.05, faint: 0.09, wrong: 9, timingGoodMs: 80, timingOkMs: 40 });
    expect(t.faint).toBe(0.05); // never above 'heard'
    expect(t.wrong).toBe(0.5); // slider max
    expect(t.timingGoodMs).toBe(40);
    expect(changedKeys(THRESHOLDS)).toEqual([]);
    expect(changedKeys(t)).toContain("wrong");
  });
});

describe("Develop: export files", () => {
  test("16-bit round trip and a valid WAV header", () => {
    const x = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const back = toFloat(toPcm(x));
    back.forEach((v, i) => expect(Math.abs(v - x[i]!)).toBeLessThan(1e-4));
    const wav = encodeWav(toPcm(x), 48000);
    const v = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe("WAVE");
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getUint32(40, true)).toBe(10);
    expect(wav.length).toBe(44 + 10);
  });
  test("zip: CRC-32 and directory are standard", () => {
    expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686);
    const z = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }, { name: "b/c.json", data: new TextEncoder().encode("{}") }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const eocd = z.length - 22;
    expect(v.getUint32(eocd, true)).toBe(0x06054b50);
    expect(v.getUint16(eocd + 10, true)).toBe(2);
  });
});

import { PLAN, tabMidis } from "../src/lib/listen/collectPlan";
import { degreeToSemitones, rootByName } from "../src/lib/theory";

describe("Develop: the guided recording plan is musically right", () => {
  const pcsOf = (t: TargetChord) => t.degrees.map((d) => (rootByName(t.rootName).pc + degreeToSemitones(d) + 120) % 12);
  for (const step of PLAN)
    test(`${step.id}: ${step.title}`, () => {
      expect(step.tab).toMatch(/^[x0-9]{6}$/);
      const chord = new Set(pcsOf(step.target));
      const notes = tabMidis(step.tab).map((m, s) => ({ s, pc: m === null ? null : m % 12 })).filter((n) => n.pc !== null);
      const off = notes.filter((n) => !chord.has(n.pc!)).map((n) => n.s);
      if (step.label === "wrong-note") {
        expect(step.wrong?.length).toBeGreaterThan(0);
        expect(off).toEqual(step.wrong!); // exactly the strings marked wrong are outside the chord
      } else expect(off).toEqual([]); // every played note belongs to the chord
      if (step.label === "clean") expect(new Set(notes.map((n) => n.pc))).toEqual(chord); // all chord tones present
      if (step.label === "muted") {
        expect(step.muted?.length).toBeGreaterThan(0);
        for (const s of step.muted!) expect(chord.has(tabMidis(step.tab)[s]! % 12)).toBe(true); // muting a real chord note
      }
      expect(step.strums).toBeGreaterThanOrEqual(4);
    });
  test("covers every kind of mistake, and clean chords outnumber each", () => {
    const n = (l: string) => PLAN.filter((s) => s.label === l).length;
    expect(n("clean")).toBeGreaterThanOrEqual(8);
    for (const l of ["wrong-note", "muted", "buzz"]) expect(n(l)).toBeGreaterThanOrEqual(3);
    expect(new Set(PLAN.map((s) => s.id)).size).toBe(PLAN.length);
  });
});

import { trimSilence } from "../src/lib/listen/takes";

describe("Develop: silence is trimmed, ring-out is kept", () => {
  // 1.5 s of room, then four strums 4 s apart (each rings out, then silence).
  const { audio } = take([1.5, 5.5, 9.5, 13.5].map((at) => ({ tab: "320003", at, opts: { spread: 0.012, letRing: true } })), 17, 0.002);
  const trimmed = trimSilence(audio, SR)!;
  const full = analyseTake({ pcm: toPcm(audio), sampleRate: SR, target: G });
  const cut = analyseTake({ pcm: toPcm(trimmed.audio), sampleRate: SR, target: G, ...(trimmed.roomFloor !== undefined ? { roomFloor: trimmed.roomFloor } : {}) });

  test("the quiet lead-in and the gaps go; every strum stays", () => {
    expect(trimmed.audio.length / SR).toBeLessThan(17 - 1.3);
    expect(trimmed.strums).toBe(4);
    expect(full.length).toBe(4);
    expect(cut.length).toBe(4);
  });
  test("each strum still rings out as long as it did", () => {
    full.forEach((f, i) => expect(Math.abs(cut[i]!.measure.ring.seconds - f.measure.ring.seconds)).toBeLessThan(0.15));
  });
  test("the room-noise reading comes from the lead-in, so verdicts don't change", () => {
    expect(trimmed.roomFloor).toBeDefined();
    const ratio = trimmed.roomFloor! / full[0]!.measure.roomFloor!;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
    const v = (s: typeof full) => judgeTake(s, G, THRESHOLDS).map((r) => [r.accuracy.verdict, r.clarity.verdict, r.ringOut.verdict]);
    expect(v(cut)).toEqual(v(full));
  });
  test("real silence between strums is cut (strings stopped, then a long wait)", () => {
    const { audio: stopped } = take([1.5, 5.5, 9.5, 13.5].map((at) => ({ tab: "320003", at, opts: { spread: 0.012, muteAfter: 1.0, letRing: true } })), 17, 0.002);
    const t = trimSilence(stopped, SR)!;
    expect(t.strums).toBe(4);
    expect(t.audio.length / SR).toBeLessThan(4 * 2); // ~1.5 s kept per strum instead of 4 s
    const strums = analyseTake({ pcm: toPcm(t.audio), sampleRate: SR, target: G, ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}) });
    expect(strums.length).toBe(4);
    strums.forEach((s) => expect(s.measure.ring.seconds).toBeGreaterThan(0.8)); // each still rings until it was stopped
  });
  test("fast strumming: nothing is cut between strums", () => {
    const { audio: fast } = take(Array.from({ length: 8 }, (_, i) => ({ tab: "320003", at: 1.2 + 0.5 * i, opts: { spread: 0.01 } })), 7.5, 0.002);
    const t = trimSilence(fast, SR)!;
    expect(t.strums).toBe(8);
    expect(analyseTake({ pcm: toPcm(t.audio), sampleRate: SR, target: G, ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}) }).length).toBe(8);
  });
  test("a recording with no strums gives nothing to keep", () => {
    const quiet = new Float32Array(SR * 3).map(() => 0.002 * (Math.random() * 2 - 1));
    expect(trimSilence(quiet, SR)).toBeNull();
  });
});
