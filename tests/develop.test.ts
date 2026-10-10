import { describe, expect, test } from "bun:test";
import { SR, rng, take } from "./helpers/guitar";
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

import { deflateRawSync } from "node:zlib";
import { exportTakes, importTakes, readZip, type Take } from "../src/lib/listen/takes";

/** A zip whose entries are deflated (as an email or drive app may re-pack it). */
function deflatedZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), comp = new Uint8Array(deflateRawSync(f.data)), crc = crc32(f.data);
    const lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(8, 8, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, comp.length, true); lv.setUint32(22, f.data.length, true); lv.setUint16(26, name.length, true); lh.set(name, 30);
    const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(10, 8, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, comp.length, true); cv.setUint32(24, f.data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, off, true); ch.set(name, 46);
    parts.push(lh, comp); central.push(ch); off += lh.length + comp.length;
  }
  const size = central.reduce((a, c) => a + c.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, size, true); ev.setUint32(16, off, true);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}

describe("Develop: importing Bradley's export on another device", () => {
  const { audio } = take([1.2, 3.2].map((at) => ({ tab: "320003", at, opts: { spread: 0.012 } })), 5, 0.002);
  const t = trimSilence(audio, SR)!;
  const mine: Take = {
    id: "a1", at: Date.parse("2026-10-10T20:00:00Z"), target: G, label: "clean", note: "Open G", sampleRate: SR, pcm: toPcm(t.audio),
    roomFloor: t.roomFloor!, originalSeconds: 5, source: "mic", device: "iPhone · Safari", step: "clean-g", tab: "320003", expected: 4,
  };
  const zip = exportTakes([mine], new Map([["a1", analyseTake(mine)]]), THRESHOLDS);

  test("an export imports back exactly: audio, labels, guided step, room reading", async () => {
    const r = await importTakes(zip, "fretlab-takes.zip", []);
    expect(r.skipped).toBe(0);
    expect(r.takes.length).toBe(1);
    const got = r.takes[0]!;
    expect([got.label, got.target.label, got.step, got.tab, got.expected, got.device, got.at, got.sampleRate]).toEqual(["clean", "G", "clean-g", "320003", 4, "iPhone · Safari", mine.at, SR]);
    expect(got.roomFloor).toBeCloseTo(mine.roomFloor!, 12);
    expect(got.pcm).toEqual(mine.pcm);
    expect(got.imported).toBe("fretlab-takes.zip");
    // Analysed on the PC exactly as on the phone.
    expect(analyseTake(got).map((s) => s.measure.ring.seconds)).toEqual(analyseTake(mine).map((s) => s.measure.ring.seconds));
  });
  test("importing the same zip twice doesn't duplicate anything", async () => {
    const first = await importTakes(zip, "z.zip", []);
    const again = await importTakes(zip, "z.zip", first.takes);
    expect(again).toMatchObject({ takes: [], skipped: 1 });
  });
  test("a re-packed (deflated) zip still imports", async () => {
    const files = await readZip(zip);
    const r = await importTakes(deflatedZip(files), "repacked.zip", []);
    expect(r.takes[0]!.pcm).toEqual(mine.pcm);
    expect(r.thresholds?.heard).toBe(THRESHOLDS.heard);
  });
  test("a zip that isn't a Fretlab export is refused with a clear reason", async () => {
    const other = makeZip([{ name: "photo.txt", data: new TextEncoder().encode("hi") }]);
    await expect(importTakes(other, "x.zip", [])).rejects.toThrow("takes.json");
    await expect(importTakes(new Uint8Array([1, 2, 3]), "x.zip", [])).rejects.toThrow("not a zip");
  });
});

import { detectOnsets } from "../src/lib/listen/dsp";

describe("Develop: strum counting on a real phone (taps, slow strums, the Done tap)", () => {
  const quiet = (n = 6) => {
    const r = rng(5);
    return new Float32Array(SR * n).map(() => 0.002 * r());
  };
  const addAt = (a: Float32Array, at: number, len: number, f: (i: number) => number) => {
    const s = Math.round(at * SR);
    for (let i = 0; i < len && s + i < a.length; i++) a[s + i]! += f(i);
    return a;
  };
  // A tap: a low thump plus the sharp click of the impact, gone within ~40 ms.
  const crack = (i: number) => (((i * 7919) % 13) / 6.5 - 1);
  const thump = (i: number) => 0.25 * Math.exp(-i / (0.008 * SR)) * (Math.sin((2 * Math.PI * 140 * i) / SR) + 0.6 * crack(i));
  const click = (i: number) => (i < 0.002 * SR ? 0.3 * (i % 2 ? 1 : -1) : 0);
  const count = (a: Float32Array) => {
    const t = trimSilence(a, SR, { ignoreBefore: 0.8 });
    return t ? analyseTake({ pcm: toPcm(t.audio), sampleRate: SR, target: G, ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}) }).length : 0;
  };

  test("taps on the phone, button clicks and the mic switching on are not strums", () => {
    expect(detectOnsets(addAt(quiet(), 2, 0.04 * SR, thump), SR)).toEqual([]);
    expect(detectOnsets(addAt(quiet(), 2, 0.002 * SR, click), SR)).toEqual([]);
    expect(detectOnsets(addAt(quiet(), 0.05, 0.3 * SR, (i) => 0.2 * Math.exp(-i / (0.05 * SR))), SR)).toEqual([]);
    // …but calibration (tap the guitar / strum muted strings) still hears taps.
    expect(detectOnsets(addAt(quiet(), 2, 0.04 * SR, thump), SR, { strumsOnly: false }).length).toBe(1);
  });
  test("4 strums then the tap on Done: 4", () => {
    const { audio } = take([1.5, 4.5, 7.5, 10.5].map((at) => ({ tab: "320003", at, opts: { spread: 0.012 } })), 13.5, 0.002);
    expect(count(addAt(audio, 13.2, 0.04 * SR, thump))).toBe(4);
  });
  test("slow strums (up to 0.3 s across the strings) count once each", () => {
    for (const spread of [0.012, 0.03, 0.05, 0.06]) {
      const { audio } = take([1.5, 4.5, 7.5, 10.5].map((at) => ({ tab: "320003", at, opts: { spread } })), 13.5, 0.002);
      expect(count(audio)).toBe(4);
    }
  });
  test("a sound in the 'stay quiet' second doesn't count", () => {
    const { audio } = take([0.4, 2.5, 5.5].map((at) => ({ tab: "320003", at, opts: { spread: 0.012 } })), 8, 0.002);
    expect(count(audio)).toBe(2); // the strum at 0.4 s came before "Play now"
  });
  test("two sounds close together no longer crash the ring-out analysis", () => {
    const { audio } = take([1.0, 1.12].map((at) => ({ tab: "320003", at, opts: { spread: 0.012, letRing: true } })), 3, 0.002);
    expect(() => analyseTake({ pcm: toPcm(audio), sampleRate: SR, target: G })).not.toThrow();
  });
});

describe("Develop: the live count and the saved count agree", () => {
  test("a strum played right before Done is counted in the saved take too", () => {
    const { audio } = take([1.2, 3.2, 5.2, 7.0].map((at) => ({ tab: "320003", at, opts: { spread: 0.012 } })), 7.3, 0.002);
    const t = trimSilence(audio, SR, { ignoreBefore: 0.8 })!;
    expect(analyseTake({ pcm: toPcm(t.audio), sampleRate: SR, target: G, ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}) }).length).toBe(4);
  });
});
