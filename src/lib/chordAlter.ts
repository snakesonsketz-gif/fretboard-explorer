/**
 * Altering single notes of a chord (♭5, ♯9, no3 …). Chords that match a known type keep that type's id;
 * anything else gets a "x:" id that spells out its degrees ("x:1.b3.b5.b7.b9"), so every part of the app
 * that looks a chord up by id (Jam, Sequencer, Explore) can still resolve it. Names read like "C7(b5#9)".
 */
import { CHORDS, degreeToSemitones, parseDegree, type ChordDef, type Degree } from "@/lib/theory";

const PREFIX = "x:";
const bySemis = (a: string, b: string) => degreeToSemitones(a) - degreeToSemitones(b) || a.localeCompare(b);
const numberOf = (d: string) => parseDegree(d).number;
const key = (degrees: readonly string[]) => [...new Set(degrees)].sort(bySemis).join(".");

/** Existing chord type with exactly these degrees, if any. */
export const knownChordFor = (degrees: readonly string[]): ChordDef | undefined => CHORDS.find((c) => key(c.degrees) === key(degrees));

/** Apply tokens like "b5", "#9", "9" (add), "no3" to a chord's degrees. Replacements only touch the original notes. */
export function applyAlterations(base: readonly string[], tokens: readonly string[]): string[] {
  const touched = new Set<number>();
  const add: string[] = [];
  for (const t of tokens) {
    const no = /^no(\d+)$/i.exec(t);
    if (no) {
      touched.add(Number(no[1]));
      continue;
    }
    if (!/^[b#]{0,2}\d{1,2}$/.test(t)) continue;
    touched.add(numberOf(t));
    add.push(t);
  }
  const kept = base.filter((d) => d === "1" || !touched.has(numberOf(d)));
  return [...new Set([...kept, ...add])].sort(bySemis);
}

/** Closest known chord to `degrees`, and the tokens that turn it into `degrees`. */
function nameFor(degrees: readonly string[]): { base: ChordDef; tokens: string[] } {
  const want = new Set(degrees);
  let best: { base: ChordDef; cost: number } | null = null;
  for (const c of CHORDS) {
    if (c.degrees.length < 2) continue;
    const have = new Set(c.degrees as readonly string[]);
    let cost = 0;
    for (const d of want) if (!have.has(d)) cost++;
    for (const d of have) if (!want.has(d)) cost++;
    // Prefer the simple triad when it's a tie.
    if (!best || cost < best.cost) best = { base: c, cost };
  }
  const base = best!.base;
  const tokens: string[] = [];
  const have = new Set(base.degrees as readonly string[]);
  const addedNums = new Set<number>();
  for (const d of degrees) if (!have.has(d)) { tokens.push(d); addedNums.add(numberOf(d)); }
  for (const d of base.degrees) if (!want.has(d) && !addedNums.has(numberOf(d))) tokens.push(`no${numberOf(d)}`);
  return { base, tokens };
}

/** Base suffix plus changes, in one bracket: "7(b5,#9)" + no7 → "7(b5,#9,no7)". */
function joinSuffix(baseSuffix: string, tokens: string[]): string {
  if (!tokens.length) return baseSuffix;
  const m = /^([^(]*)\(([^()]*)\)$/.exec(baseSuffix);
  return m ? `${m[1]}(${m[2]},${tokens.join(",")})` : `${baseSuffix}(${tokens.join(",")})`;
}

/** Resolve a chord id (known type or "x:…" altered chord). */
export function resolveChord(id: string): ChordDef | undefined {
  const known = CHORDS.find((c) => c.id === id);
  if (known || !id.startsWith(PREFIX)) return known;
  const degrees = id.slice(PREFIX.length).split(".").filter(Boolean);
  if (degrees.length < 2 || !degrees.includes("1") || degrees.some((d) => !/^[b#]{0,2}\d{1,2}$/.test(d))) return undefined;
  const sorted = [...new Set(degrees)].sort(bySemis);
  const { base, tokens } = nameFor(sorted);
  return { ...base, id: `${PREFIX}${sorted.join(".")}`, name: `${base.name} (altered)`, suffix: joinSuffix(base.suffix, tokens), degrees: sorted as Degree[], family: base.family };
}

/** Id for a set of degrees: a known chord type when one matches, otherwise an "x:" id. */
export function chordIdForSet(degrees: readonly string[]): string | null {
  const sorted = [...new Set(degrees)].sort(bySemis);
  if (sorted.length < 2 || !sorted.includes("1")) return null;
  return knownChordFor(sorted)?.id ?? `${PREFIX}${sorted.join(".")}`;
}

/** Chord id after changing one note: swap the degree numbered `n` for `to` (null removes it). */
export function withDegree(id: string, n: number, to: string | null): string | null {
  const def = resolveChord(id);
  if (!def || (to !== null && numberOf(to) !== n)) return null;
  const next = def.degrees.filter((d) => numberOf(d) !== n);
  if (to) next.push(to as Degree);
  return chordIdForSet(next);
}

/** The degree a chord uses for note number `n`, if any. */
export const degreeAt = (id: string, n: number): string | null => resolveChord(id)?.degrees.find((d) => numberOf(d) === n) ?? null;

/** Choices offered when altering each note (null = leave it out). */
export const ALTER_ROWS: { n: number; label: string; options: (string | null)[] }[] = [
  { n: 3, label: "3rd", options: ["b3", "3", null] },
  { n: 5, label: "5th", options: ["b5", "5", "#5", null] },
  { n: 7, label: "7th", options: ["bb7", "b7", "7", null] },
  { n: 9, label: "9th", options: ["b9", "9", "#9", null] },
  { n: 11, label: "11th", options: ["11", "#11", null] },
  { n: 13, label: "13th", options: ["b13", "13", null] },
];

/** "C7(b5#9)" → the chord type + root-independent id, or null. Used by the chord-name parser. */
export function parseAlteredSuffix(rest: string): ChordDef | null {
  const open = rest.indexOf("(");
  if (open < 0) return null;
  const base = CHORDS.find((c) => c.suffix === rest.slice(0, open));
  if (!base) return null;
  const tail = rest.slice(open);
  const groups = tail.match(/\(([^()]*)\)/g);
  if (!groups || groups.join("") !== tail) return null;
  const inner = groups.map((g) => g.slice(1, -1)).join("").replace(/[\s,]+/g, "").replace(/add/gi, "");
  const tokens = inner.match(/no\d+|[b#]{0,2}\d{1,2}/gi);
  if (!tokens || tokens.join("") !== inner) return null;
  const id = chordIdForSet(applyAlterations(base.degrees, tokens));
  return id ? (resolveChord(id) ?? null) : null;
}
