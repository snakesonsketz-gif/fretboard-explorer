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
