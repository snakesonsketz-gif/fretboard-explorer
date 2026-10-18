/**
 * The Luthier guide (Dev mode): repair, setup, modification and wiring guides researched from
 * professional sources. The guides themselves live in guides.json / colors.json and load on
 * demand (they are large); this file holds their shape and the helpers the page uses.
 */

export const CATEGORIES = [
  { id: "diagnose", name: "Diagnose a problem" },
  { id: "setup", name: "Setup" },
  { id: "frets-nut", name: "Frets & nut" },
  { id: "neck", name: "Neck & truss rod" },
  { id: "bridges-trem", name: "Bridges, trems & tuners" },
  { id: "acoustic", name: "Acoustic & classical" },
  { id: "electronics-fix", name: "Electronics: fix" },
  { id: "wiring", name: "Wiring" },
  { id: "mods", name: "Mods & installs" },
  { id: "body-finish", name: "Body & finish" },
  { id: "bass", name: "Bass & extended range" },
  { id: "tools-basics", name: "Tools & basics" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const APPLIES = [
  ["all", "Any guitar"],
  ["electric", "Electric"],
  ["acoustic", "Acoustic"],
  ["classical", "Classical"],
  ["bass", "Bass"],
  ["strat", "Strat-style"],
  ["tele", "Tele-style"],
  ["les-paul", "Les Paul"],
  ["sg", "SG"],
  ["semi-hollow", "Semi-hollow (335)"],
  ["archtop", "Archtop"],
  ["offset", "Offset (Jazzmaster, Jaguar, Mustang)"],
  ["superstrat", "Superstrat / Floyd"],
  ["prs", "PRS"],
  ["explorer-v", "Explorer / Flying V / Firebird"],
  ["gretsch", "Gretsch"],
  ["rickenbacker", "Rickenbacker"],
  ["dreadnought", "Dreadnought"],
  ["om-concert", "OM / concert"],
  ["jumbo", "Jumbo"],
  ["parlor", "Parlor"],
  ["12-string", "12-string"],
  ["extended-range", "7- & 8-string"],
  ["baritone", "Baritone"],
  ["headless", "Headless"],
  ["p-bass", "P-bass"],
  ["j-bass", "J-bass"],
  ["multiscale", "Multiscale (fanned)"],
] as const;
export type AppliesId = (typeof APPLIES)[number][0];
export const APPLIES_NAME: Record<string, string> = Object.fromEntries(APPLIES);

export interface GuideStep {
  title: string;
  detail: string;
  warn?: string;
}

export interface Guide {
  id: string;
  title: string;
  category: CategoryId;
  applies: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  time: string;
  summary: string;
  symptoms?: string[];
  causes?: { cause: string; check: string; fix: string }[];
  tools: string[];
  parts?: string[];
  specs?: { label: string; value: string }[];
  steps: GuideStep[];
  models?: { model: string; note: string }[];
  warnings?: string[];
  pro?: string;
  related?: string[];
  sources: { title: string; url: string }[];
}

export type WireRole = "hot" | "ground" | "nFinish" | "sFinish" | "bare" | "scHot" | "scGround" | "battery+" | "output" | "other";

export interface ColorScheme {
  brand: string;
  kind: "humbucker" | "single" | "p90" | "active";
  wires: { role: WireRole; color: string; note?: string }[];
  splitNote?: string;
  note?: string;
  source: { title: string; url: string };
}

export const DIFFICULTY = ["", "Anyone", "Easy", "Careful DIY", "Advanced", "Pro bench"] as const;

/* ------------------------------------------------------------------ wire tokens */

/** Tokens used in wiring steps, with the plain-words role they stand for. */
export const TOKENS: Record<string, { label: string; roles: WireRole[] }> = {
  hot: { label: "hot", roles: ["hot"] },
  ground: { label: "ground", roles: ["ground"] },
  link: { label: "series-link pair", roles: ["nFinish", "sFinish"] },
  nFinish: { label: "north finish", roles: ["nFinish"] },
  sFinish: { label: "south finish", roles: ["sFinish"] },
  bare: { label: "bare shield", roles: ["bare"] },
  scHot: { label: "hot", roles: ["scHot"] },
  scGround: { label: "ground", roles: ["scGround"] },
};

export type Segment = { text: string } | { token: string; label: string; colors: string[] };

/**
 * Split a step into text and wire tokens; tokens get the wire colours of the chosen schemes
 * (humbucker scheme for humbucker roles, single-coil scheme for single-coil roles).
 */
export function segments(detail: string, hb: ColorScheme | null, sc: ColorScheme | null): Segment[] {
  const out: Segment[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(detail))) {
    const t = TOKENS[m[1]!];
    if (!t) continue;
    if (m.index > last) out.push({ text: detail.slice(last, m.index) });
    const scheme = t.roles[0]!.startsWith("sc") ? sc : hb;
    const colors = scheme ? t.roles.map((r) => scheme.wires.find((w) => w.role === r)?.color).filter((c): c is string => !!c) : [];
    out.push({ token: m[1]!, label: t.label, colors });
    last = m.index + m[0].length;
  }
  if (last < detail.length) out.push({ text: detail.slice(last) });
  return out;
}

/** Tokens a guide uses (to know whether to show the humbucker and/or single-coil brand picker). */
export function tokensIn(g: Guide): Set<string> {
  const s = new Set<string>();
  const re = /\{(\w+)\}/g;
  for (const st of g.steps) for (const m of `${st.title} ${st.detail}`.matchAll(re)) if (TOKENS[m[1]!]) s.add(m[1]!);
  return s;
}

/** Plain colour names → swatch colours. */
const SWATCH: Record<string, string> = {
  black: "#111", white: "#f4f4f4", red: "#d92b2b", green: "#2a9d48", bare: "#b8b8b8", silver: "#c0c0c0", yellow: "#f2c511",
  blue: "#2f6fe0", brown: "#7a4a22", orange: "#f08a24", grey: "#8a8a8a", gray: "#8a8a8a", purple: "#8b45c9", pink: "#ef7fb5",
  braid: "#9a9a9a", shield: "#b8b8b8", copper: "#c87533", tan: "#d2b48c",
};
export function swatch(color: string): string {
  const c = color.toLowerCase();
  for (const [k, v] of Object.entries(SWATCH)) if (c.includes(k)) return v;
  return "#666";
}

/* ------------------------------------------------------------------ search */

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ");

/** Text a guide can be found by. */
export function searchText(g: Guide): string {
  return norm(
    [g.title, g.summary, ...(g.symptoms ?? []), ...(g.causes ?? []).map((c) => c.cause), ...g.steps.map((s) => s.title), ...(g.models ?? []).map((m) => m.model), ...g.applies.map((a) => APPLIES_NAME[a] ?? a)].join(" "),
  );
}

/** Guides matching every word of the query (as the start of a word: "pot" finds pots, not spots), best title matches first. */
export function search(guides: Guide[], query: string): Guide[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return guides;
  const res = words.map((w) => new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const scored: { g: Guide; s: number }[] = [];
  for (const g of guides) {
    const text = searchText(g);
    if (!res.every((r) => r.test(text))) continue;
    const title = norm(g.title);
    const summary = norm(g.summary);
    const titleWords = new Set(title.split(/\s+/));
    const s = res.reduce((n, r, i) => n + (r.test(title) ? 3 : 0) + (titleWords.has(words[i]!) ? 2 : 0) + (r.test(summary) ? 1 : 0), 0);
    scored.push({ g, s });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.g);
}

/** Does a guide apply to the chosen guitar type? ("all" guides always do; "electric" covers electric body styles.) */
const ELECTRIC_TYPES = new Set(["strat", "tele", "les-paul", "sg", "semi-hollow", "archtop", "offset", "superstrat", "prs", "explorer-v", "gretsch", "rickenbacker", "extended-range", "baritone", "headless", "multiscale"]);
const ACOUSTIC_TYPES = new Set(["dreadnought", "om-concert", "jumbo", "parlor", "12-string"]);
const BASS_TYPES = new Set(["p-bass", "j-bass"]);
export function appliesTo(g: Guide, type: string | null): boolean {
  if (!type) return true;
  const a = new Set(g.applies);
  if (a.has("all") || a.has(type)) return true;
  if (ELECTRIC_TYPES.has(type) && a.has("electric")) return true;
  if (ACOUSTIC_TYPES.has(type) && a.has("acoustic")) return true;
  if (BASS_TYPES.has(type) && a.has("bass")) return true;
  return false;
}
