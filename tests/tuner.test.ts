import { describe, expect, test } from "bun:test";
import { centsOff, detectPitch, fft, windowFor } from "../src/lib/tuner/pitch";
import { advice, nearestNote, nearestString, Tracker, zoneOf } from "../src/lib/tuner/tracker";
import { FAVORITE_TUNINGS, INSTRUMENTS, midiHz, notesText, parseNote, shortName, stringsOf, tuningById, TUNINGS } from "../src/lib/tuner/tunings";
import { pluck, rng, SR } from "./helpers/guitar";

/** A decaying string-like tone with exact pitch: weak fundamental, strong overtones, a little noise. */
function tone(hz: number, n: number, seed = 1, fundamental = 0.35): Float32Array {
  const r = rng(seed);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let h = 1; h <= 10; h++) v += (h === 1 ? fundamental : 1 / h) * Math.exp(-t * (1.5 + h * 0.6)) * Math.sin(2 * Math.PI * hz * h * t + h * 0.7);
    x[i] = 0.2 * v + 0.002 * (r() - 0.5);
  }
  return x;
}

describe("tunings", () => {
  test("every tuning parses, ids are unique, string counts match the instrument", () => {
    expect(new Set(TUNINGS.map((t) => t.id)).size).toBe(TUNINGS.length);
    for (const t of TUNINGS) {
      const s = stringsOf(t);
      const inst = INSTRUMENTS.find((i) => i.id === t.instrument)!;
      if (inst.strings) expect(s.length).toBe(inst.strings);
      for (const x of s) expect(x.midi).toBeGreaterThan(20);
      // Spelling round-trips: the name's pitch class matches the MIDI note.
      for (const x of s) expect(((parseNote(x.name.replace("♯", "#").replace("♭", "b") + x.octave) - x.midi) % 12 + 12) % 12).toBe(0);
    }
    for (const id of FAVORITE_TUNINGS) expect(tuningById(id)).toBeDefined();
  });

  test("Drop C is C G C F A D, low C2 at 65.41 Hz", () => {
    const t = tuningById("drop-c")!;
    expect(shortName(t)).toBe("C G C F A D");
    const s = stringsOf(t);
    expect(s.map((x) => x.midi)).toEqual([36, 43, 48, 53, 57, 62]);
    expect(s.map((x) => x.number)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(midiHz(36)).toBeCloseTo(65.406, 2);
    expect(midiHz(62)).toBeCloseTo(293.665, 2);
    // Drop C is D standard with the low string dropped a whole step.
    const d = stringsOf(tuningById("d-standard")!).map((x) => x.midi);
    expect([d[0]! - 2, ...d.slice(1)]).toEqual(s.map((x) => x.midi));
  });

  test("standard, drop and open tunings have the right notes", () => {
    const m = (id: string) => stringsOf(tuningById(id)!).map((x) => x.midi);
    expect(m("standard")).toEqual([40, 45, 50, 55, 59, 64]);
    expect(m("drop-d")).toEqual([38, 45, 50, 55, 59, 64]);
    expect(m("eb-standard")).toEqual([39, 44, 49, 54, 58, 63]);
    expect(shortName(tuningById("eb-standard")!)).toBe("E♭ A♭ D♭ G♭ B♭ E♭");
    expect(m("drop-b")).toEqual([35, 42, 47, 52, 56, 61]);
    expect(m("open-g")).toEqual([38, 43, 50, 55, 59, 62]);
    expect(m("dadgad")).toEqual([38, 45, 50, 55, 57, 62]);
    expect(m("bass-standard")).toEqual([28, 33, 38, 43]);
    expect(m("uke-standard")).toEqual([67, 60, 64, 69]);
    // Every lowered tuning is standard moved down as a block.
    for (const [id, down] of [["eb-standard", 1], ["d-standard", 2], ["csharp-standard", 3], ["c-standard", 4], ["b-standard", 5]] as const)
      expect(m(id)).toEqual(m("standard").map((x) => x - down));
    // Every drop tuning is a lowered standard with the low string down a further whole step.
    for (const [id, down] of [["drop-d", 0], ["drop-csharp", 1], ["drop-c", 2], ["drop-b", 3], ["drop-asharp", 4], ["drop-a", 5]] as const)
      expect(m(id)).toEqual(m("standard").map((x, i) => x - down - (i === 0 ? 2 : 0)));
  });

  test("notes text round-trips for custom tunings", () => {
    expect(notesText([36, 43, 48, 53, 57, 62])).toBe("C2 G2 C3 F3 A3 D4");
    expect(stringsOf({ notes: notesText([39, 44], true) }).map((s) => s.name)).toEqual(["E♭", "A♭"]);
  });
});

describe("pitch detection", () => {
  test("FFT round-trips", () => {
    const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i) + i * 0.01);
    const im = new Float64Array(64);
    const keep = re.slice();
    fft(re, im);
    fft(re, im, true);
    for (let i = 0; i < 64; i++) expect(re[i]!).toBeCloseTo(keep[i]!, 9);
  });

  test("every string of every tuning, sharp and flat, to within half a cent", () => {
    let worst = 0;
    const midis = new Set(TUNINGS.flatMap((t) => stringsOf(t).map((s) => s.midi)));
    for (const m of midis)
      for (const c of [-37, -4, 0, 2.5, 21]) {
        const hz = midiHz(m, 440, c);
        const n = windowFor(midiHz(m) * 0.9, SR);
        const x = tone(hz, n + 4000, m).subarray(2000, 2000 + n);
        const p = detectPitch(x, SR, { minHz: midiHz(m) * 0.6 });
        expect(p).not.toBeNull();
        worst = Math.max(worst, Math.abs(centsOff(p!.hz, hz)));
      }
    expect(worst).toBeLessThan(0.5);
  });

  test("Drop C low string with a weak fundamental is not read an octave up", () => {
    for (const fund of [0.05, 0.15, 0.35]) {
      const hz = midiHz(36, 440, -12);
      const x = tone(hz, 8192, 4, fund);
      const p = detectPitch(x, SR, { minHz: 40 });
      expect(Math.abs(centsOff(p!.hz, hz))).toBeLessThan(0.5);
    }
  });

  test("plucked strings (Karplus-Strong) never come out an octave off", () => {
    const r = rng(9);
    for (const m of [23, 28, 33, 36, 40, 43, 48, 53, 57, 62, 64])
      for (const bright of [0.3, 0.95]) {
        const x = pluck(m, r, { bright, seconds: 1 });
        const n = windowFor(midiHz(m) * 0.9, SR);
        for (const at of [0.05, 0.4]) {
          const s = Math.round(at * SR);
          const p = detectPitch(x.subarray(s, s + n), SR, { minHz: midiHz(m) * 0.6 });
          expect(p).not.toBeNull();
          // The synth itself is only roughly in tune, so this checks the octave, not the cents.
          expect(Math.abs(centsOff(p!.hz, midiHz(m)))).toBeLessThan(60);
        }
      }
  });

  test("silence and noise give no reading", () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
    const r = rng(2);
    const noise = Float32Array.from({ length: 4096 }, () => 0.3 * (r() - 0.5));
    expect(detectPitch(noise, SR)).toBeNull();
  });

  test("a 4096 window covers standard guitar; bass and 8-string get a longer one", () => {
    expect(windowFor(midiHz(40) * 0.9, 48000)).toBe(4096);
    expect(windowFor(midiHz(36) * 0.9, 48000)).toBe(4096);
    expect(windowFor(midiHz(23) * 0.9, 48000)).toBe(8192);
  });
});

describe("tracker", () => {
  const dropC = stringsOf(tuningById("drop-c")!).map((s) => s.midi);
  const p = (hz: number) => ({ hz, clarity: 0.95, level: 0.1 });

  test("nearest string and note", () => {
    expect(nearestString(midiHz(36, 440, -20), dropC)).toEqual({ index: 0, cents: expect.closeTo(-20, 6) });
    expect(nearestString(midiHz(57, 440, 8), dropC).index).toBe(4);
    const n = nearestNote(midiHz(61, 440, 30));
    expect(n.name).toBe("C♯");
    expect(n.octave).toBe(4);
    expect(n.cents).toBeCloseTo(30, 6);
    expect(nearestNote(midiHz(61), 440, true).name).toBe("D♭");
  });

  test("A4 reference moves every target", () => {
    const t = new Tracker({ midis: dropC, a4: 432 });
    const r = t.push(p(midiHz(36, 432)));
    expect(r.string).toBe(0);
    expect(r.cents).toBeCloseTo(0, 6);
    expect(r.targetHz).toBeCloseTo(midiHz(36, 432), 6);
  });

  test("needs two readings before switching string, and smooths with a median", () => {
    const t = new Tracker({ midis: dropC, a4: 440 });
    expect(t.push(p(midiHz(36, 440, -10))).string).toBe(0);
    // One stray reading near the G string doesn't switch.
    expect(t.push(p(midiHz(43))).string).toBe(0);
    expect(t.push(p(midiHz(43))).string).toBe(1);
    // A single spike is ignored by the median.
    t.push(p(midiHz(43, 440, 2)));
    t.push(p(midiHz(43, 440, 3)));
    expect(t.push(p(midiHz(43, 440, 40))).cents).toBeLessThan(5);
  });

  test("locked string reads against that string, far notes fall back to the chromatic note", () => {
    const t = new Tracker({ midis: dropC, a4: 440, locked: 0 });
    const r = t.push(p(midiHz(38)));
    expect(r.string).toBe(0);
    expect(r.cents).toBeCloseTo(200, 6); // tuned a whole step too high: still on the low string
    const free = new Tracker({ midis: [40], a4: 440 });
    const far = free.push(p(midiHz(52, 440, 7)));
    expect(far.string).toBe(-1);
    expect(far.cents).toBeCloseTo(7, 6);
  });

  test("zones and advice", () => {
    expect(zoneOf(2.9)).toBe("in-tune");
    expect(zoneOf(-7)).toBe("close");
    expect(zoneOf(30)).toBe("off");
    expect(advice(1)).toBe("In tune");
    expect(advice(-12)).toContain("tune up");
    expect(advice(80)).toContain("Way sharp");
    expect(advice(-400)).toBe("Way flat (4 half steps) — tighten (tune up)");
    expect(advice(200)).toBe("Way sharp (2 half steps) — loosen (tune down)");
  });
});

import { activeTuning, sanitizeSettings } from "../src/lib/tuner/settings";

describe("tuner settings", () => {
  test("bad stored values fall back safely", () => {
    const s = sanitizeSettings({ instrument: "kazoo" as never, a4: 9000, tuning: { guitar: "drop-c", bass: "drop-c" }, custom: { guitar: [1, 2] } });
    expect(s.instrument).toBe("guitar");
    expect(s.a4).toBe(466);
    expect(s.tuning.guitar).toBe("drop-c");
    expect(s.tuning.bass).toBeUndefined(); // a guitar tuning id can't be the bass tuning
    expect(s.custom.guitar).toBeUndefined();
  });
  test("the chosen tuning, custom tunings, and each instrument's standard", () => {
    expect(activeTuning(sanitizeSettings({ tuning: { guitar: "drop-c" } })).strings.map((x) => x.name).join(" ")).toBe("C G C F A D");
    const c = activeTuning(sanitizeSettings({ tuning: { guitar: "custom" }, custom: { guitar: [36, 43, 48, 53, 57, 60] } }));
    expect(c.custom).toBe(true);
    expect(c.strings.map((x) => x.midi)).toEqual([36, 43, 48, 53, 57, 60]);
    expect(activeTuning(sanitizeSettings({ instrument: "bass" })).name).toBe("Standard");
    expect(activeTuning(sanitizeSettings({ instrument: "guitar7" })).strings.length).toBe(7);
  });
});
