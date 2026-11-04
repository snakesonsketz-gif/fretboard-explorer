import { describe, expect, test } from "bun:test";
import { jamBoardDots, jamBoards, jamNoteRoles, setLayerVisibility } from "../src/lib/jamVisualization";
import type { JamLayer } from "../src/lib/jam";

const scale: JamLayer = { id: "scale", kind: "scale", rootName: "C", scaleId: "major" };
const arp: JamLayer = { id: "arp", kind: "arpeggio", rootName: "C", chordId: "min", variantId: "full" };

describe("Jam visualization", () => {
  test("only shared pitch classes are targets, not every arpeggio tone", () => {
    const roles = jamNoteRoles([scale, arp]);
    expect(roles.get(0)).toBe("jam-target");
    expect(roles.get(7)).toBe("jam-target");
    expect(roles.get(3)).toBe("jam-arpeggio");
    expect(roles.get(4)).toBe("jam-scale");
    expect(jamNoteRoles([arp]).get(0)).toBe("jam-arpeggio");
  });
  test("enharmonic roots share targets by pitch class", () => {
    const roles = jamNoteRoles([
      { ...scale, rootName: "F#" },
      { ...arp, rootName: "Gb", chordId: "maj" },
    ]);
    expect([...roles].filter(([, role]) => role === "jam-target").map(([pc]) => pc).sort((a, b) => a - b)).toEqual([1, 6, 10]);
  });
  test("multiple arpeggios merge targets with no duplicate fret markers", () => {
    const layers = [scale, arp, { ...arp, id: "maj", chordId: "maj" }];
    const roles = jamNoteRoles(layers);
    expect([...roles].filter(([, role]) => role === "jam-target").map(([pc]) => pc)).toEqual([0, 4, 7]);
    const dots = jamBoardDots([40, 45, 50, 55, 59, 64], 15, roles, 0, String);
    expect(new Set(dots.map((d) => `${d.s}:${d.fret}`)).size).toBe(dots.length);
    expect(dots.find((d) => d.s === 1 && d.fret === 3)?.tone).toBe("jam-target");
  });
  test("visibility is independent, retains settings, and recomputes targets", () => {
    const layers = [scale, arp];
    const hidden = setLayerVisibility(layers, "arp", false);
    expect(hidden[0]).toBe(scale);
    expect(hidden[1]).toEqual({ ...arp, visible: false });
    expect(arp.visible).toBeUndefined();
    expect(jamNoteRoles(hidden).get(0)).toBe("jam-scale");
    expect(jamNoteRoles(hidden).has(3)).toBe(false);
    expect(jamNoteRoles(setLayerVisibility(hidden, "arp", true)).get(0)).toBe("jam-target");
    expect(jamNoteRoles(setLayerVisibility(layers, "scale", false)).get(0)).toBe("jam-arpeggio");
  });
  test("separate boards show only their own notes with consistent target semantics", () => {
    const layers = [scale, arp, { ...arp, id: "hidden", visible: false }];
    const separate = jamBoards(layers, "separate");
    expect(separate.map((board) => board.id)).toEqual(["scale", "arp"]);
    expect(separate[0]?.roles.has(3)).toBe(false);
    expect(separate[1]?.roles.has(4)).toBe(false);
    expect(separate.every((board) => board.roles.get(0) === "jam-target")).toBe(true);
    const overlapping = jamBoards(layers, "overlapping");
    expect(overlapping).toHaveLength(1);
    expect(overlapping[0]?.roles.size).toBe(8);
    expect(layers[2]?.visible).toBe(false);
  });
  test("hiding all collections leaves no layer markers in either layout", () => {
    const layers = [{ ...scale, visible: false }, { ...arp, visible: false }];
    expect(jamBoards(layers, "separate")).toEqual([]);
    expect(jamBoards(layers, "overlapping")[0]?.roles.size).toBe(0);
  });
});