import { describe, expect, test } from "bun:test";
import { shiftChord, shiftNote, analyze, borrowSources, chordIdForIntervals, chordLabel, diatonicChords, emptyProgression, functionPath, makeProgChord, progressionToText, romanOf, chordById } from "@/lib/progression";
import { arrangementToProg, barsForBeats, progToArrangement, progToJam, progToSong, jamToProg, roundedInSong, sanitizeProgression, songToProg, textToChords } from "@/lib/progressionLink";
import { KEY_MODES } from "@/lib/progression";

const labels = (k: string, s: string, seventh = false) => diatonicChords(k, s, seventh).map((c) => c.label);
const romans = (k: string, s: string, seventh = false) => diatonicChords(k, s, seventh).map((c) => c.roman);

describe("diatonic chords", () => {
  test("C major triads and sevenths", () => {
    expect(labels("C", "ionian")).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(romans("C", "ionian")).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(labels("C", "ionian", true)).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
    expect(romans("C", "ionian", true)).toEqual(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø"]);
  });
  test("modes read against the major scale", () => {
    expect(labels("A", "dorian")).toEqual(["Am", "Bm", "C", "D", "Em", "F#dim", "G"]);
    expect(romans("C", "aeolian")).toEqual(["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"]);
    expect(labels("D", "mixolydian")).toEqual(["D", "Em", "F#dim", "G", "Am", "Bm", "C"]);
  });
  test("harmonic minor has a major V and a diminished vii", () => {
    expect(labels("A", "harmonic-minor")).toEqual(["Am", "Bdim", "Caug", "Dm", "E", "F", "G#dim"]);
  });
  test("flat and sharp keys spell with real roots", () => {
    for (const k of ["F#", "Db", "Gb", "C#", "Bb"]) for (const m of KEY_MODES) for (const c of diatonicChords(k, m.id, true)) expect(c.rootName).toMatch(/^[A-G][#b]?$/);
    expect(labels("Db", "ionian")).toEqual(["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"]);
  });
  test("every mode in every key yields seven chords", () => {
    for (const m of KEY_MODES.filter((x) => ["Major modes", "Minor", "Melodic minor modes", "Harmonic minor modes"].includes(x.family))) expect(diatonicChords("E", m.id, false).length).toBe(7);
  });
});

describe("function", () => {
  test("tonic, subdominant, dominant", () => {
    const fn = diatonicChords("C", "ionian", false).map((c) => c.fn);
    expect(fn).toEqual(["tonic", "subdominant", "tonic", "subdominant", "dominant", "tonic", "dominant"]);
  });
  test("secondary dominant and borrowed chords", () => {
    const a = analyze("C", "ionian", "D", "7");
    expect(a.fn).toBe("dominant");
    expect(a.detail).toContain("V/V");
    expect(analyze("C", "ionian", "A", "7").detail).toContain("V/ii");
    const b = analyze("C", "ionian", "Bb", "maj");
    expect(b.roman).toBe("bVII");
    expect(b.inKey).toBe(false);
    expect(b.fn).toBe("subdominant");
    expect(analyze("C", "ionian", "Ab", "maj").roman).toBe("bVI");
    expect(analyze("C", "ionian", "F", "min").roman).toBe("iv");
  });
  test("roman numerals for odd qualities", () => {
    expect(romanOf(0, 7, chordById("7"))).toBe("V7");
    expect(romanOf(0, 11, chordById("m7b5"))).toBe("viiø");
    expect(romanOf(0, 9, chordById("m7"))).toBe("vi7");
    expect(romanOf(0, 0, chordById("aug"))).toBe("I+");
  });
  test("borrowing from the parallel minor flags what is new", () => {
    const home = { keyRoot: "C", scaleId: "ionian" };
    const b = diatonicChords("C", "aeolian", false, home);
    expect(b.map((c) => c.roman)).toEqual(["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"]);
    expect(b.filter((c) => !c.inKey).map((c) => c.label)).toEqual(["Cm", "Ddim", "Eb", "Fm", "Gm", "Ab", "Bb"]);
    expect(borrowSources("C", "ionian").some((s) => s.scaleId === "aeolian" && s.root === "C")).toBe(true);
    expect(borrowSources("C", "ionian").find((s) => s.label.includes("V key"))?.root).toBe("G");
  });
  test("function path", () => {
    const p = { ...emptyProgression(), chords: [makeProgChord("C", "maj", 4), makeProgChord("F", "maj", 4), makeProgChord("G", "7", 4), makeProgChord("C", "maj", 4)] };
    expect(functionPath(p)).toBe("Tonic → Subdominant → Dominant → Tonic");
  });
});

describe("text and sanitising", () => {
  test("text round trip keeps beats", () => {
    const p = { ...emptyProgression(), chords: textToChords("G D Em:2 C*2 G/B", 4).chords };
    expect(progressionToText(p)).toBe("G D Em:2 C*2 G/B");
    expect(p.chords.map((c) => c.beats)).toEqual([4, 4, 2, 8, 4]);
  });
  test("bad input is repaired", () => {
    expect(sanitizeProgression(null)).toBeNull();
    const r = sanitizeProgression({ keyRoot: "Q", scaleId: "nope", beatsPerBar: 99, bpm: 5, chords: [{ rootName: "Z", chordId: "zzz", beats: 2 }, 3] })!;
    expect(r.scaleId).toBe("ionian");
    expect(r.beatsPerBar).toBe(4);
    expect(r.chords.length).toBe(1);
    expect(chordLabel(r.chords[0]!.rootName, r.chords[0]!.chordId)).toBeTruthy();
  });
  test("chord id from intervals", () => {
    expect(chordIdForIntervals([0, 4, 7])).toBe("maj");
    expect(chordIdForIntervals([0, 3, 7, 10])).toBe("m7");
  });
});

describe("transfer", () => {
  const p = { ...emptyProgression(), keyRoot: "A", scaleId: "dorian", bpm: 100, beatsPerBar: 4, chords: textToChords("Am D*2 Em:2 G", 4).chords };
  test("to Jam and back keeps chords, beats and key", () => {
    const j = progToJam(p);
    expect(j.chords.map((c) => [c.label, c.beats])).toEqual([["Am", 4], ["D", 8], ["Em", 2], ["G", 4]]);
    expect(j.everywhere.some((l) => l.rootName === "A" && l.scaleId === "dorian")).toBe(true);
    expect(j.chords.every((c) => c.layers.length === 1)).toBe(true);
    const back = jamToProg(j);
    expect(back.keyRoot).toBe("A");
    expect(back.scaleId).toBe("dorian");
    expect(progressionToText(back)).toBe(progressionToText(p));
    expect(progToJam(p, j).everywhere.length).toBe(1);
  });
  test("to a song rounds to bars; and back", () => {
    expect(barsForBeats(2, 4)).toBe(1);
    expect(roundedInSong(p).map((c) => c.rootName)).toEqual(["E"]);
    const s = progToSong(p);
    expect(s.sections[0]!.slots.map((x) => x.bars)).toEqual([1, 2, 1, 1]);
    const r = songToProg(s);
    expect(r.skipped).toBe(0);
    expect(r.prog.keyRoot).toBe("A");
    expect(r.prog.chords.map((c) => c.beats)).toEqual([4, 8, 4, 4]);
  });
  test("to the sequencer and back keeps exact beats", () => {
    const a = progToArrangement(p);
    expect(a.chords.length).toBe(4);
    expect(a.bpm).toBe(100);
    const r = arrangementToProg(a, p);
    expect(r.skipped).toBe(0);
    expect(r.prog.chords.map((c) => c.beats)).toEqual([4, 8, 2, 4]);
    expect(r.prog.chords.map((c) => chordLabel(c.rootName, c.chordId))).toEqual(["Am", "D", "Em", "G"]);
  });
});

describe("flatten and sharpen", () => {
  test("note names", () => {
    expect(shiftNote("B", -1)).toBe("Bb");
    expect(shiftNote("Bb", 1)).toBe("B");
    expect(shiftNote("C", -1)).toBe("B");
    expect(shiftNote("E", 1)).toBe("F");
    expect(shiftNote("C", 1)).toBe("C#");
    expect(shiftNote("D", -1)).toBe("Db");
    expect(shiftNote("G#", 1)).toBe("A");
  });
  test("chord keeps quality and slash bass moves with it", () => {
    const c = shiftChord(makeProgChord("G", "m7", 4, { bassName: "D" }), -1);
    expect([c.rootName, c.chordId, c.bassName]).toEqual(["Gb", "m7", "Db"]);
    expect(analyze("C", "ionian", "Bb", "maj").roman).toBe("bVII");
  });
});

import { resolveChord, withDegree, chordIdForSet, parseAlteredSuffix, applyAlterations } from "@/lib/chordAlter";
import { parseChordName } from "@/lib/tabs/chords";
import { parseProgression, makeChord, chordDef } from "@/lib/jam";

describe("altering notes in a chord", () => {
  test("lands on a known type when one matches", () => {
    expect(withDegree("7", 5, "b5")).toBe("7b5");
    expect(withDegree("min", 5, "b5")).toBe("dim");
    expect(withDegree("7", 5, "#5")).toBe("7s5");
    expect(withDegree("maj", 3, "b3")).toBe("min");
  });
  test("otherwise makes a custom chord with a readable name", () => {
    const id = withDegree("m7b5", 9, "#9")!;
    expect(id.startsWith("x:")).toBe(true);
    const d = resolveChord(id)!;
    expect(d.degrees).toEqual(["1", "b3", "b5", "b7", "#9"]);
    expect(d.suffix).toBe("m7b5(#9)");
    expect(withDegree(id, 9, null)).toBe("m7b5");
    expect(withDegree("5", 5, null)).toBeNull();
  });
  test("names parse back to the same notes", () => {
    const d = parseAlteredSuffix("m7b5(#9)")!;
    expect(d.degrees).toEqual(["1", "b3", "b5", "b7", "#9"]);
    const p = parseChordName("Cm7b5(#9)")!;
    expect(p.def.degrees).toEqual(d.degrees);
    expect(parseChordName(`C${p.def.suffix}`)!.def.id).toBe(p.def.id);
    expect(parseChordName("C7(b5#9)")!.def.degrees).toEqual(["1", "3", "b5", "b7", "#9"]);
    expect(parseChordName("Cm7(no5)")?.def.degrees).toEqual(["1", "b3", "b7"]);
    expect(parseChordName("C7(zz)")).toBeNull();
  });
  test("every custom chord name parses back to itself", () => {
    const ids = ["maj", "7", "m7", "m7b5", "maj7", "9", "min"].flatMap((b) => [5, 9, 7, 3].flatMap((n) => ["b5", "#5", "#9", "b9", "b7", "7", "3", "b3", null].map((o) => withDegree(b, n, o)))).filter((x): x is string => !!x && x.startsWith("x:"));
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      const d = resolveChord(id)!;
      expect(parseChordName(`C${d.suffix}`)?.def.id).toBe(id);
    }
  });
  test("applyAlterations replaces only the original notes", () => {
    expect(applyAlterations(["1", "3", "5", "b7"], ["b9", "#9"])).toEqual(["1", "3", "5", "b7", "b9", "#9"]);
  });
  test("works in Jam, the progression text and every transfer", () => {
    const j = parseProgression("Am7 D7(b5,#9) G", 4);
    expect(j.chords.length).toBe(3);
    expect(j.bad).toEqual([]);
    expect(chordDef(j.chords[1]!.chordId).degrees).toContain("#9");
    const c = makeChord("D", chordIdForSet(["1", "3", "b5", "b7", "#9"])!, 4);
    expect(c.layers[0]!.chordId).toBe(c.chordId);
    const prog = { ...emptyProgression(), chords: textToChords("Am7 D7(b5#9) G", 4).chords };
    expect(progressionToText(prog)).toBe("Am7 D7(b5,#9) G");
    const back = jamToProg(progToJam(prog));
    expect(progressionToText(back)).toBe(progressionToText(prog));
    expect(songToProg(progToSong(prog)).prog.chords[1]!.chordId).toBe(prog.chords[1]!.chordId);
    expect(arrangementToProg(progToArrangement(prog)).prog.chords[1]!.chordId).toBe(prog.chords[1]!.chordId);
    expect(analyze("C", "ionian", "D", prog.chords[1]!.chordId).fn).toBe("dominant");
  });
});
