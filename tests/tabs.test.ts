import { describe as group, expect, test } from "bun:test";
import { describe, DESCRIBE_EXAMPLES } from "../src/lib/tabs/describe";
import { emptyDoc, tabTuning, type Column } from "../src/lib/tabs/model";
import { placeMelody } from "../src/lib/tabs/place";
import { playEvents } from "../src/lib/tabs/play";
import { renderAscii } from "../src/lib/tabs/render";
import { importText } from "../src/lib/tabs/text";

const std = tabTuning("standard");
const notes = (cols: Column[]) => cols.filter((c) => c.kind === "notes");
/** Frets per string (low → high) of a column, as "x32010". */
const shape = (c: Column) => c.cells.map((x) => (x ? String(x.fret) : "x")).join("");

group("describe → tab", () => {
  test("every built-in example is fully understood", () => {
    for (const ex of DESCRIBE_EXAMPLES) {
      const r = describe(ex, std);
      expect(r.lines.every((l) => l.ok), `${ex}: ${JSON.stringify(r.lines)}`).toBe(true);
      expect(r.added, ex).toBeGreaterThan(0);
    }
  });
  test("strings and frets in plain words", () => {
    const r = describe("3rd fret on the A string, then the 6th string open, high e 12th fret, 2nd fret on the 3rd string", std);
    expect(notes(r.cols).map(shape)).toEqual(["x3xxxx", "0xxxxx", "xxxxx12", "xxx2xx"].map((s) => s.replace("x12", "12").padEnd(6, "x")).map((s, i) => (i === 2 ? "xxxxx12" : s)));
  });
  test("tab shorthand: hammer-ons, pull-offs, slides, bends", () => {
    const r = describe("5h7p5 on the G string, 7b9r7 on the B, slide from 5 to 9 on the high e", std);
    const n = notes(r.cols);
    expect(n.map((c) => c.cells[3]?.link ?? null).slice(0, 3)).toEqual(["h", "p", null]);
    expect(n[3]!.cells[4]).toMatchObject({ fret: 7, bend: 2, release: true });
    expect(n[4]!.cells[5]).toMatchObject({ fret: 5, link: "/" });
  });
  test("techniques that change the last note", () => {
    const r = describe("7th fret on the G string, bend it a half step, add vibrato", std);
    expect(notes(r.cols)[0]!.cells[3]).toMatchObject({ fret: 7, bend: 1, vibrato: true });
  });
  test("chords: open shapes, strum patterns and repeats", () => {
    const r = describe("Strum G down down up, then C, then D twice", std);
    const n = notes(r.cols);
    expect(n.map(shape)).toEqual(["320003", "320003", "320003", "x32010", "xx0232", "xx0232"]);
    expect(n.slice(0, 3).map((c) => c.strum)).toEqual(["down", "down", "up"]);
    expect(n[0]!.chord).toBe("G");
  });
  test("power chords follow the string through the sentence", () => {
    const r = describe("Power chord on the A string at fret 5, then at fret 3, palm muted", std);
    const n = notes(r.cols);
    expect(n.map(shape)).toEqual(["x577xx", "x355xx"]);
    expect(n.every((c) => c.pm)).toBe(true);
    expect(n.map((c) => c.chord)).toEqual(["D5", "C5"]);
  });
  test("scales come out as a box, low to high", () => {
    const r = describe("A minor pentatonic at the 5th fret", std);
    const frets = notes(r.cols).map((c) => c.cells.findIndex((x) => !!x) + ":" + c.cells.find((x) => !!x)!.fret);
    expect(frets).toEqual(["0:5", "0:8", "1:5", "1:7", "2:5", "2:7", "3:5", "3:7", "4:5", "4:8", "5:5", "5:8"]);
  });
  test("rests, bars, rhythm and repeats", () => {
    const r = describe("Low E open, rest for 2 beats, new bar, quarter notes 3 on the low E, repeat that 3 times", std);
    expect(r.cols.map((c) => c.kind)).toEqual(["notes", "rest", "bar", "notes", "notes", "notes", "notes"]);
    expect(r.cols[1]!.beats).toBe(2);
    expect(r.cols[3]!.beats).toBe(1);
  });
  test("other tunings: Drop C power chords and note names on a string", () => {
    const dropC = tabTuning("drop-c");
    expect(notes(describe("power chord on the 6th string at fret 3", dropC).cols).map(shape)).toEqual(["333xxx"]);
    expect(notes(describe("the notes C D E on the B string", std).cols).map((c) => c.cells[4]?.fret)).toEqual([1, 3, 5]);
  });
  test("tells you what it couldn't read", () => {
    const r = describe("make it sound cool", std);
    expect(r.lines[0]!.ok).toBe(false);
    expect(r.added).toBe(0);
  });
});

group("text tab", () => {
  test("renders standard ASCII tab with links stuck to the next note", () => {
    const d = emptyDoc();
    d.cols = describe("5h7p5 on the G string", std).cols;
    expect(renderAscii(d, { header: false })).toContain("G|-5h7p5-|");
  });
  test("round trip: render → read back gives the same notes", () => {
    const d = emptyDoc();
    d.cols = describe("Strum G, new bar, 5h7p5 on the G string, 7b9r7 on the B, harmonic at 12 on the D, x x on the low E", std).cols;
    const back = importText(renderAscii(d), std).cols;
    const sig = (cols: Column[]) => cols.map((c) => (c.kind === "bar" ? "|" : c.cells.map((x) => (x ? `${x.fret}${x.link ?? ""}${x.bend ?? ""}${x.harmonic ? "<>" : ""}` : "-")).join(",")));
    expect(sig(back)).toEqual(sig(d.cols));
  });
  test("reads pasted tab with names, bars and chord names", () => {
    const r = importText(["  Am", "e|-0---|", "B|-1---|", "G|-2---|", "D|-2---|", "A|-0---|", "E|-----|"].join("\n"), std);
    expect(r.cols.length).toBe(1);
    expect(shape(r.cols[0]!)).toBe("x02210");
    expect(r.cols[0]!.chord).toBe("Am");
  });
});

group("placing notes and playback", () => {
  test("a melody stays in one position", () => {
    const placed = placeMelody([57, 60, 62, 64, 67, 69], std, 5);
    const frets = placed.map((p) => p!.fret);
    expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
  });
  test("playback timing follows the tempo and note lengths", () => {
    const d = emptyDoc();
    d.bpm = 120;
    d.cols = describe("quarter notes, low E open 2 times, new bar, A string 2", std).cols;
    const ev = playEvents(d);
    expect(ev.map((e) => +e.at.toFixed(3))).toEqual([0, 0.5, 1]);
    expect(ev[0]!.midis).toEqual([40]);
  });
});

group("soloing techniques", () => {
  const first = (text: string, s: number) => notes(describe(text, std).cols).map((c) => c.cells[s]).find((x) => !!x)!;
  test("pre-bends, quarter bends, unison bends", () => {
    expect(first("pre-bend the 15th fret on the G string a whole step and release", 3)).toMatchObject({ fret: 15, bend: 2, prebend: true, release: true });
    expect(first("7th fret on the B string, quarter tone bend", 4)).toMatchObject({ fret: 7, bend: 0.5 });
    const u = notes(describe("unison bend at the 7th fret on the G string", std).cols)[0]!;
    expect(u.cells[3]).toMatchObject({ fret: 7, bend: 2 });
    expect(u.cells[4]).toMatchObject({ fret: 5 });
  });
  test("trills, harmonics, slides in and out, hammer-ons from nowhere, wide vibrato", () => {
    expect(first("trill 5 and 7 on the B string", 4)).toMatchObject({ fret: 5, trill: 7 });
    expect(first("pinch harmonic at 5 on the D string with wide vibrato", 2)).toMatchObject({ fret: 5, pinch: true, vibrato: true, wide: true });
    expect(first("tapped harmonic at 17 on the G", 3)).toMatchObject({ fret: 17, harmonic: true, tap: true });
    expect(first("slide into 9 on the B string", 4)).toMatchObject({ fret: 9, into: "/" });
    expect(first("12 on the B string, slide off down", 4)).toMatchObject({ fret: 12, out: "\\" });
    expect(first("hammer on from nowhere at 7 on the A string", 1)).toMatchObject({ fret: 7, into: "h" });
  });
  test("tremolo picking, whammy, rakes, accents, picking directions, legato, sweeps", () => {
    const tp = notes(describe("tremolo pick the 12th fret on the high e 4 times", std).cols);
    expect(tp.length).toBe(4);
    expect(tp.every((c) => c.fx?.includes("trem"))).toBe(true);
    expect(notes(describe("low E open with a whammy dive", std).cols)[0]!.fx).toEqual(["dive"]);
    const alt = notes(describe("5 7 8 on the B string, alternate picking, accented", std).cols);
    expect(alt.map((c) => c.strum)).toEqual(["down", "up", "down"]);
    expect(alt.every((c) => c.fx?.includes("accent"))).toBe(true);
    const leg = notes(describe("5 7 8 7 5 on the B string legato", std).cols);
    expect(leg.map((c) => c.cells[4]!.link ?? "")).toEqual(["h", "h", "p", "p", ""]);
    const sw = notes(describe("sweep pick Am up and down", std).cols);
    expect(sw.map((c) => c.strum)).toEqual(["down", "down", "down", "down", "down", "up", "up", "up", "up"]);
    const ds = notes(describe("5 on the G and 5 on the B together", std).cols);
    expect(shape(ds[0]!)).toBe("xxx55x");
  });
  test("every technique survives text round trip", () => {
    const d = emptyDoc();
    d.cols = describe(
      "pre-bend 15 on the G a whole step and release, 7 on the B quarter tone bend, trill 5 and 7 on the B, pinch harmonic at 5 on the D with wide vibrato, tapped harmonic at 17 on the G, slide into 9 on the B, 12 on the B slide off down, hammer on from nowhere at 7 on the A, 7b9 on the G",
      std,
    ).cols;
    const back = importText(renderAscii(d), std).cols;
    const strip = (cols: Column[]) => cols.filter((c) => c.kind === "notes").map((c) => c.cells.map((x) => (x ? JSON.stringify(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== false).sort())) : "-")).join("|"));
    expect(strip(back)).toEqual(strip(d.cols));
  });
});
