import { describe, expect, test } from "bun:test";
import { emptyJam, parseProgression, type JamLayer } from "@/lib/jam";
import { arpeggioColors, arpeggioPcColors, jamBoards, jamBoardDots, JAM_ARP_COLORS } from "@/lib/jamVisualization";
import { cleanName, deleteSong, duplicateSong, makeSong, songChanged, upsertSong, loadSongs, storeSongs } from "@/lib/jamSongs";

const arp = (id: string, rootName: string, chordId: string): JamLayer => ({ id, kind: "arpeggio", rootName, chordId, variantId: "full" });
const jam = () => ({ ...emptyJam(), chords: parseProgression("G D Em C", 4).chords });
const view = { tuningId: "standard", toFret: 15, labels: "degree" as const, showNext: true };

describe("overlaid arpeggio colours", () => {
  test("a single arpeggio keeps the default colour", () => {
    expect(arpeggioColors([arp("a", "G", "maj")]).size).toBe(0);
  });
  test("two visible arpeggios get different colours; first stays pink", () => {
    const m = arpeggioColors([arp("a", "G", "maj"), arp("b", "E", "min")]);
    expect(m.get("a")).toBe(JAM_ARP_COLORS[0]);
    expect(m.get("b")).toBe(JAM_ARP_COLORS[1]);
    expect(m.get("a")).not.toBe(m.get("b"));
  });
  test("shared notes carry both colours; neck dots expose them", () => {
    const layers = [arp("a", "G", "maj"), arp("b", "E", "min")];
    const [board] = jamBoards(layers, "overlapping");
    const shared = [...board!.arps.values()].filter((c) => c.length === 2);
    expect(shared.length).toBeGreaterThan(0); // G major and E minor share G and B
    const dots = jamBoardDots([40, 45, 50, 55, 59, 64], 15, board!.roles, 7, () => "", undefined, board!.arps);
    expect(dots.some((d) => (d.arpColors?.length ?? 0) === 2)).toBe(true);
  });
  test("hiding an arpeggio doesn't recolour the others", () => {
    const layers = [arp("a", "G", "maj"), { ...arp("b", "E", "min"), visible: false }, arp("c", "C", "maj")];
    const m = arpeggioColors(layers);
    expect(m.get("c")).toBe(JAM_ARP_COLORS[2]);
    expect(arpeggioPcColors(layers, m).size).toBeGreaterThan(0);
  });
});

describe("developing songs", () => {
  test("make, name, save, rename and delete", () => {
    const s = makeSong("  My   tune ", jam(), view, "idea", 1);
    expect(s.name).toBe("My tune");
    let all = upsertSong([], s, 5);
    expect(all[0]!.updatedAt).toBe(5);
    all = upsertSong(all, { ...s, name: "Renamed" }, 9);
    expect(all.length).toBe(1);
    expect(all[0]!.name).toBe("Renamed");
    expect(deleteSong(all, s.id)).toEqual([]);
  });
  test("a saved song is isolated from later edits", () => {
    const j = jam();
    const s = makeSong("x", j, view);
    j.chords.pop();
    expect(s.jam.chords.length).toBe(4);
  });
  test("duplicate gets a new id; changes are detected", () => {
    const j = jam();
    const s = makeSong("Song", j, view, "n", 1);
    const d = duplicateSong(s, 2);
    expect(d.id).not.toBe(s.id);
    expect(d.name).toBe("Song copy");
    expect(songChanged(s, j, view, "n", "Song")).toBe(false);
    expect(songChanged(s, { ...j, bpm: j.bpm + 5 }, view, "n", "Song")).toBe(true);
    expect(songChanged(s, j, { ...view, toFret: 24 }, "n", "Song")).toBe(true);
    expect(songChanged(undefined, j, view, "", "")).toBe(true);
    expect(cleanName("")).toBe("");
  });
  test("storage round-trip ignores junk", () => {
    const mem: Record<string, string> = {};
    const st = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v) };
    const s = makeSong("A", jam(), view);
    expect(storeSongs([s], st)).toBe(true);
    expect(loadSongs(st).map((x) => x.name)).toEqual(["A"]);
    mem["fretlab.jam.songs.v1"] = "{not json";
    expect(loadSongs(st)).toEqual([]);
  });
});
