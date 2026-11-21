import { describe, expect, test } from "bun:test";
import { bassChoices } from "../src/lib/bassView";
import { rootByName } from "../src/lib/theory";

describe("bass view", () => {
  test("each chord tone gives a slash chord and an effect", () => {
    const r = rootByName("C");
    const rows = bassChoices(r, ["1", "3", "5", "7"], "maj7");
    expect(rows.map((x) => x.name)).toEqual(["Cmaj7", "Cmaj7/E", "Cmaj7/G", "Cmaj7/B"]);
    expect(rows[0]!.effect).toContain("grounded");
    expect(rows[2]!.effect).toContain("unstable");
  });
  test("works without a chord suffix (scales)", () => {
    const rows = bassChoices(rootByName("A"), ["1", "b3", "5"]);
    expect(rows[1]!.name).toBe("over C");
  });
});
