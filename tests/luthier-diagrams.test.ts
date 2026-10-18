import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import guidesJson from "../src/lib/luthier/guides.json";
import { DIAGRAMS, GUIDE_DIAGRAMS, diagramsFor } from "../src/components/luthier/diagrams";
import type { Guide } from "../src/lib/luthier/types";

const ids = new Set((guidesJson as unknown as Guide[]).map((g) => g.id));

describe("luthier pictures", () => {
  test("every mapped guide exists and every mapped picture exists", () => {
    for (const [gid, list] of Object.entries(GUIDE_DIAGRAMS)) {
      expect(ids.has(gid), gid).toBe(true);
      for (const d of list) expect(DIAGRAMS[d], `${gid} → ${d}`).toBeDefined();
    }
  });
  test("every picture is used by at least one guide", () => {
    const used = new Set(Object.values(GUIDE_DIAGRAMS).flat());
    for (const d of Object.keys(DIAGRAMS)) expect(used.has(d), d).toBe(true);
  });
  test("the core setup and wiring guides have pictures", () => {
    for (const g of ["dx-full-setup", "dx-raise-lower-action", "dx-measure-relief", "fn-truss-rod-basics", "fn-fret-level-crown-polish", "wr-strat-standard", "wr-les-paul-modern", "wr-tele-standard", "wr-coil-split-push-pull", "ef-soldering-basics", "ac-humidity-basics"])
      expect(diagramsFor(g).length, g).toBeGreaterThan(0);
    expect(Object.keys(GUIDE_DIAGRAMS).length).toBeGreaterThan(120);
  });
  test("every picture renders as a step-by-step series, starting on step 1", () => {
    const schemes = { hb: null, sc: null };
    for (const [key, d] of Object.entries(DIAGRAMS)) {
      const html = renderToStaticMarkup(d.render(schemes) as Parameters<typeof renderToStaticMarkup>[0]);
      expect(html, key).toContain('data-step="1"');
      const m = /Step <!-- -->1<!-- --> of <!-- -->(\d+)/.exec(html) ?? /Step 1 of (\d+)/.exec(html);
      expect(m, key).not.toBeNull();
      expect(Number(m![1]), key).toBeGreaterThanOrEqual(2);
      expect(html, key).toContain('data-testid="luthier-step-next"');
    }
  });
});
