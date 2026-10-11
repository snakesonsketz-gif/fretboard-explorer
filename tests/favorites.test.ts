import { describe, expect, test } from "bun:test";
import { dedupeFavorites, favoriteKey, type Favorite } from "../src/lib/favorites";

const f = (id: string, mode: Favorite["mode"], rootName: string, degrees: string[], shape?: (number | null)[]): Favorite => ({ id, label: id, mode, rootName, degrees, createdAt: 0, ...(shape ? { shape } : {}) });

describe("saved items: one per chord", () => {
  test("the same chord is the same whatever the spelling, order or shape", () => {
    expect(favoriteKey(f("a", "chord", "C#", ["1", "3", "5"]))).toBe(favoriteKey(f("b", "chord", "Db", ["5", "1", "3"])));
    expect(favoriteKey(f("a", "chord", "C", ["1", "3", "5"]))).not.toBe(favoriteKey(f("b", "chord", "C", ["1", "b3", "5"])));
    expect(favoriteKey(f("a", "chord", "C", ["1", "3", "5"]))).not.toBe(favoriteKey(f("b", "arpeggio", "C", ["1", "3", "5"])));
    expect(favoriteKey(f("a", "chord", "C", ["1", "3", "5"]))).not.toBe(favoriteKey(f("b", "chord", "D", ["1", "3", "5"])));
  });

  test("copies are dropped, the first (newest) one kept", () => {
    const list = [
      f("new", "chord", "G", ["1", "3", "5"], [3, 2, 0, 0, 0, 3]),
      f("am", "chord", "A", ["1", "b3", "5"]),
      f("old", "chord", "G", ["1", "3", "5"]),
      f("old2", "chord", "G", ["1", "5", "3"]),
      f("scale", "scale", "G", ["1", "3", "5"]),
    ];
    expect(dedupeFavorites(list).map((x) => x.id)).toEqual(["new", "am", "scale"]);
  });
});
