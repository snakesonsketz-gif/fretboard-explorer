import { describe, expect, test } from "bun:test";
import colorsJson from "../src/lib/luthier/colors.json";
import guidesJson from "../src/lib/luthier/guides.json";
import { APPLIES, appliesTo, CATEGORIES, search, segments, TOKENS, tokensIn, type ColorScheme, type Guide } from "../src/lib/luthier/types";

const guides = guidesJson as unknown as Guide[];
const colors = colorsJson as unknown as ColorScheme[];
const CATS = new Set<string>(CATEGORIES.map((c) => c.id));
const APPLY = new Set<string>(APPLIES.map(([id]) => id));
const ids = new Set(guides.map((g) => g.id));

describe("luthier guide data", () => {
  test("there are guides in every category", () => {
    expect(guides.length).toBeGreaterThan(100);
    for (const c of CATS) expect(guides.some((g) => g.category === c)).toBe(true);
  });

  test("every guide is complete and well formed", () => {
    expect(ids.size).toBe(guides.length);
    for (const g of guides) {
      const where = `guide ${g.id}`;
      expect(g.id, where).toMatch(/^[a-z]{2}-[a-z0-9-]+$/);
      expect(CATS.has(g.category), where).toBe(true);
      expect(g.title.length, where).toBeGreaterThan(2);
      expect(g.summary.length, where).toBeGreaterThan(10);
      expect([1, 2, 3, 4, 5]).toContain(g.difficulty);
      expect(g.time.length, where).toBeGreaterThan(0);
      expect(g.applies.length, where).toBeGreaterThan(0);
      for (const a of g.applies) expect(APPLY.has(a), `${where} applies ${a}`).toBe(true);
      expect(g.steps.length, where).toBeGreaterThan(0);
      for (const s of g.steps) expect(s.title && s.detail, where).toBeTruthy();
      expect(Array.isArray(g.tools), where).toBe(true);
      expect(g.sources.length, where).toBeGreaterThan(0);
      for (const s of g.sources) expect(s.url, where).toMatch(/^https?:\/\//);
      for (const r of g.related ?? []) expect(ids.has(r), `${where} related ${r}`).toBe(true);
      for (const c of g.causes ?? []) expect(c.cause && c.check && c.fix, where).toBeTruthy();
    }
  });

  test("links inside the text point at real guides", () => {
    for (const g of guides) {
      const text = [...(g.causes ?? []).flatMap((c) => [c.check, c.fix]), ...g.steps.map((s) => s.detail), ...(g.models ?? []).map((m) => m.note)].join(" ");
      for (const m of text.matchAll(/\[([a-z]{2}-[a-z0-9-]+)\]/g)) expect(ids.has(m[1]!), `${g.id} links ${m[1]}`).toBe(true);
    }
  });

  test("wiring guides use only known wire tokens", () => {
    const wiring = guides.filter((g) => g.category === "wiring");
    expect(wiring.length).toBeGreaterThan(15);
    for (const g of guides)
      for (const s of g.steps) for (const m of s.detail.matchAll(/\{(\w+)\}/g)) expect(TOKENS[m[1]!], `${g.id}: {${m[1]}}`).toBeDefined();
    const withTokens = wiring.filter((g) => tokensIn(g).size > 0);
    expect(withTokens.length).toBeGreaterThan(10);
  });

  test("pickup colour codes are complete", () => {
    expect(colors.length).toBeGreaterThan(8);
    for (const c of colors) {
      expect(["humbucker", "single", "p90", "active"]).toContain(c.kind);
      expect(c.source.url).toMatch(/^https?:\/\//);
      const roles = new Set(c.wires.map((w) => w.role));
      if (c.kind === "humbucker") for (const r of ["hot", "ground"]) expect(roles.has(r as never), `${c.brand} ${r}`).toBe(true);
      if (c.kind === "single") expect(roles.has("scHot") && roles.has("scGround"), c.brand).toBe(true);
    }
    for (const b of ["Seymour Duncan", "DiMarzio"]) expect(colors.some((c) => c.brand.includes(b) && c.kind === "humbucker"), b).toBe(true);
  });
});

describe("luthier helpers", () => {
  const scheme: ColorScheme = {
    brand: "Test",
    kind: "humbucker",
    wires: [
      { role: "hot", color: "black" },
      { role: "ground", color: "green" },
      { role: "nFinish", color: "red" },
      { role: "sFinish", color: "white" },
      { role: "bare", color: "bare" },
    ],
    source: { title: "t", url: "https://example.com" },
  };
  test("wire tokens take the brand's colours", () => {
    const seg = segments("Solder {hot} to lug 2, tape {link} together, {bare} to the pot.", scheme, null);
    const tokens = seg.filter((s) => "token" in s) as { token: string; colors: string[] }[];
    expect(tokens.map((t) => t.colors)).toEqual([["black"], ["red", "white"], ["bare"]]);
    expect(segments("{scHot} to lug 1", scheme, null).find((s) => "token" in s)).toEqual({ token: "scHot", label: "hot", colors: [] });
    expect(segments("no tokens {here}", null, null)).toEqual([{ text: "no tokens {here}" }]);
  });
  const g = (over: Partial<Guide>): Guide => ({ id: "xx-a", title: "Fret buzz", category: "diagnose", applies: ["electric"], difficulty: 2, time: "1 h", summary: "Strings rattle on the frets.", tools: [], steps: [{ title: "Check relief", detail: "x" }], sources: [], ...over });
  test("search and guitar-type filter", () => {
    const list = [g({}), g({ id: "xx-b", title: "Crack repair", summary: "Glue and cleat a crack", applies: ["acoustic"] }), g({ id: "xx-c", title: "Coil split", summary: "fret buzz unrelated", applies: ["all"] })];
    expect(search(list, "buzz").map((x) => x.id)).toEqual(["xx-a", "xx-c"]);
    expect(search(list, "crack glue").map((x) => x.id)).toEqual(["xx-b"]);
    expect(list.filter((x) => appliesTo(x, "strat")).map((x) => x.id)).toEqual(["xx-a", "xx-c"]);
    expect(list.filter((x) => appliesTo(x, "dreadnought")).map((x) => x.id)).toEqual(["xx-b", "xx-c"]);
  });
});

describe("luthier search", () => {
  test("words match from their start, so 'pot' finds pot guides, not dead spots", () => {
    const top = search(guides, "pot").slice(0, 6).map((g) => g.title.toLowerCase());
    expect(top.every((t) => !t.includes("dead spot"))).toBe(true);
    expect(search(guides, "volume knob")[0]!.id).toBe("ef-volume-knob-fix");
    for (const q of ["lower action", "raise action", "string height"]) expect(search(guides, q)[0]!.id, q).toBe("dx-raise-lower-action");
  });
});

describe("fret, pickup and bridge sections", () => {
  test("frets have their own category with every fret job in it", () => {
    const frets = guides.filter((g) => g.category === "frets");
    expect(frets.length).toBeGreaterThanOrEqual(15);
    for (const id of ["fn-fret-level-crown-polish", "fn-fret-reseat-replace", "fn-refret-maple", "fr-find-high-fret", "fr-install-frets", "fr-remove-frets"]) expect(frets.some((g) => g.id === id), id).toBe(true);
  });
  test("there is a guide on raising pickups", () => {
    const g = guides.find((x) => x.id === "pu-raise-lower-pickups");
    expect(g).toBeDefined();
    expect(JSON.stringify(g).toLowerCase()).toContain("clockwise");
  });
  test("every bridge family has an intonation guide", () => {
    for (const id of ["br-intonate-any-bridge", "br-intonate-strat-hardtail", "br-intonate-tele", "br-intonate-tom-wraparound", "br-intonate-floating-vintage", "br-intonate-bass", "br-intonate-acoustic-classical"]) expect(ids.has(id), id).toBe(true);
    for (const id of ["br-bridge-doctor", "br-tom-collapse-fix", "br-bridge-rattle-buzz"]) expect(ids.has(id), id).toBe(true);
  });
});
