/**
 * Nashville Numbers ear game: a random major key, a 1-4-5-1 cadence to set home, then a mystery
 * chord (or a four-chord progression) named by its number. Every chord is built from the key —
 * the number picks the root, the key's scale stacks the 3rds above it — so a "flavour" (7th, 9th,
 * 13th, sus, add9…) is only ever used where it fits the key. Pure rules here; the screen is
 * components/games/Nashville.tsx.
 */
import type { Tier } from "./levels";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
/** Major with a raised 5th degree: the harmonic minor of the 6 — where the major 3 (V of 6-) lives. */
const MAJ_SHARP5 = [0, 2, 4, 5, 8, 9, 11];
/** Major with a raised 4th: the key of the 5 — where the major 2 (V of 5) lives. */
const MAJ_SHARP4 = [0, 2, 4, 6, 7, 9, 11];

export interface NashNumber {
  id: string;
  /** Scale degree of the root (0 = 1) and its alteration in semitones (-1 = flat). */
  degree: number;
  alter: number;
  /** The scale its chords are stacked from (semitones above the key's 1). */
  scale: number[];
  /** Slash chords: the scale degree in the bass (triads only). */
  bass?: number;
  /** One line on what it is / how it sounds. */
  about: string;
}

const N = (id: string, degree: number, about: string, o: Partial<NashNumber> = {}): NashNumber => ({ id, degree, alter: 0, scale: MAJOR, about, ...o });

export const NUMBERS: Record<string, NashNumber> = {
  "1": N("1", 0, "Home. Everything resolves here."),
  "2-": N("2-", 1, "Minor, a step up from home — loves to go to the 5."),
  "3-": N("3-", 2, "Minor and soft; often heads to the 6- or the 4."),
  "4": N("4", 3, "Major, lifts away from home (the 'Amen' chord)."),
  "5": N("5", 4, "Major, the strongest pull back home."),
  "6-": N("6-", 5, "Minor, the sad cousin of the 1 (same notes as its relative minor)."),
  "7°": N("7°", 6, "Diminished, tense — usually a stand-in for the 5."),
  b3: N("b3", 2, "Borrowed from the minor key: a major chord a minor 3rd above home.", { alter: -1, scale: MINOR }),
  b6: N("b6", 5, "Borrowed from the minor key: big, dramatic major chord.", { alter: -1, scale: MINOR }),
  b7: N("b7", 6, "Borrowed: the rock/country 'Mixolydian' major chord a step below home.", { alter: -1, scale: MINOR }),
  "3": N("3", 2, "Major 3: the 5 of the 6- (secondary dominant) — wants to go to 6-.", { scale: MAJ_SHARP5 }),
  "2": N("2", 1, "Major 2: the 5 of the 5 (secondary dominant) — wants to go to 5.", { scale: MAJ_SHARP4 }),
  "1/3": N("1/3", 0, "The 1 chord with its 3rd in the bass — a smooth step up to the 4.", { bass: 2 }),
  "5/7": N("5/7", 4, "The 5 chord with its 3rd in the bass — walks up into the 1 or down to the 6-.", { bass: 6 }),
  "1/5": N("1/5", 0, "The 1 chord over its 5th — the classic 'about to resolve' sound.", { bass: 4 }),
  "4/5": N("4/5", 3, "The 4 chord over the 5 in the bass — a soft, gospel-style dominant.", { bass: 4 }),
};

export const FLAVORS = [
  { id: "triad", name: "Triad", about: "Plain major or minor (or diminished on the 7)" },
  { id: "seventh", name: "7th", about: "maj7, 7, -7, ø7 — whatever the key gives" },
  { id: "sus2", name: "sus2", about: "The 3rd swapped for the 2nd" },
  { id: "sus4", name: "sus4", about: "The 3rd swapped for the 4th" },
  { id: "add9", name: "add9", about: "A triad with the 9th on top" },
  { id: "six", name: "6", about: "A triad with the 6th added" },
  { id: "ninth", name: "9th", about: "7th chord plus the 9th" },
  { id: "eleventh", name: "11th", about: "Minor 11, or the sus-sounding dominant 11" },
  { id: "thirteenth", name: "13th", about: "7th, 9th and 13th — no 11" },
  { id: "sixnine", name: "6/9", about: "Major with the 6th and 9th, no 7th" },
  { id: "sevensus4", name: "7sus4", about: "Dominant 7 with a suspended 4th" },
] as const;
export type FlavorId = (typeof FLAVORS)[number]["id"];

export const TIER_SETUP: Record<Tier, { numbers: string[]; flavors: FlavorId[] }> = {
  beginner: { numbers: ["1", "4", "5"], flavors: ["triad"] },
  intermediate: { numbers: ["1", "2-", "3-", "4", "5", "6-", "1/3"], flavors: ["triad", "seventh"] },
  advanced: { numbers: ["1", "2-", "3-", "4", "5", "6-", "7°", "b3", "b6", "b7", "3", "1/3", "5/7"], flavors: ["triad", "seventh", "sus2", "sus4", "add9", "six"] },
  expert: {
    numbers: ["1", "2-", "3-", "4", "5", "6-", "7°", "b3", "b6", "b7", "3", "2", "1/3", "5/7", "1/5", "4/5"],
    flavors: ["triad", "seventh", "sus2", "sus4", "add9", "six", "ninth", "eleventh", "thirteenth", "sixnine", "sevensus4"],
  },
};

/** Semitones above the key's 1 of the note `steps` scale-steps above the number's root (can pass 12). */
function stackTone(num: NashNumber, steps: number): number {
  const i = num.degree + 2 * steps;
  return num.scale[i % 7]! + 12 * Math.floor(i / 7);
}
/** Intervals above the chord root, stacking `steps` from the number's scale. */
function stackIntervals(num: NashNumber, steps: number[]): number[] {
  const base = stackTone(num, 0);
  return steps.map((s) => stackTone(num, s) - base);
}

export interface NashChord {
  number: string;
  flavor: FlavorId;
  /** Intervals above the chord's root, low to high. */
  intervals: number[];
  /** Root in semitones above the key's 1. */
  rootSemis: number;
  /** Bass note in semitones above the key's 1 (slash chords), else the root. */
  bassSemis: number;
  /** Chart symbol, e.g. "2-7", "59", "1/3", "b7" — the number part, then the quality part. */
  symbol: string;
  num: string;
  qual: string;
  /** Chord-symbol suffix (letter name style), e.g. "m7", "maj9", "7sus4". */
  suffix: string;
}

const triadKind = (iv: number[]) => {
  const t = iv.includes(4) ? 4 : 3;
  const f = iv.includes(7) ? 7 : iv.includes(6) ? 6 : iv.includes(8) ? 8 : 7;
  return t === 4 ? (f === 8 ? "aug" : "maj") : f === 6 ? "dim" : "min";
};

/**
 * The chord a number makes with a flavour, or null when that flavour doesn't fit the key there
 * (e.g. a 13th on the 3-, whose 9th is flat). Slash chords take triads only.
 */
export function buildChord(numberId: string, flavor: FlavorId): NashChord | null {
  const num = NUMBERS[numberId];
  if (!num) return null;
  if (num.bass !== undefined && flavor !== "triad") return null;
  const tri = stackIntervals(num, [0, 1, 2]);
  const kind = triadKind(tri);
  const sev = stackIntervals(num, [3])[0]!;
  const ninth = stackIntervals(num, [4])[0]!;
  const eleventh = stackIntervals(num, [5])[0]!;
  const thirteenth = stackIntervals(num, [6])[0]!;
  const third = tri[1]!, fifth = tri[2]!;
  const has = (semis: number) => num.scale.some((s) => (((s - stackTone(num, 0)) % 12) + 12) % 12 === semis % 12);
  const minus = kind === "min" ? "-" : kind === "dim" ? "°" : kind === "aug" ? "+" : "";
  const numLabel = num.bass !== undefined ? num.id : num.id.replace(/[-°]$/, "");
  const sym = (s: string) => `${numLabel}${s}`;
  const Q = (q: string) => ({ symbol: sym(q), qual: q });
  const sevName = () => {
    if (kind === "maj" && sev === 11) return { nns: "maj7", sfx: "maj7" };
    if (kind === "maj" && sev === 10) return { nns: "7", sfx: "7" };
    if (kind === "min" && sev === 10) return { nns: "-7", sfx: "m7" };
    if (kind === "min" && sev === 11) return { nns: "-(maj7)", sfx: "m(maj7)" };
    if (kind === "dim" && sev === 10) return { nns: "ø", sfx: "m7b5" };
    if (kind === "dim" && sev === 9) return { nns: "°7", sfx: "dim7" };
    if (kind === "aug" && sev === 11) return { nns: "+maj7", sfx: "maj7#5" };
    return null;
  };
  const base = { number: numberId, flavor, num: numLabel, rootSemis: ((stackTone(num, 0) + 12) % 12), bassSemis: num.bass !== undefined ? MAJOR[num.bass]! : ((stackTone(num, 0) + 12) % 12) };
  const triSfx = kind === "maj" ? "" : kind === "min" ? "m" : kind === "dim" ? "dim" : "aug";
  switch (flavor) {
    case "triad":
      return { ...base, intervals: tri, ...(num.bass !== undefined ? { symbol: num.id, qual: "" } : Q(minus)), suffix: triSfx };
    case "seventh": {
      const n = sevName();
      return n ? { ...base, intervals: [0, third, fifth, sev], ...Q(n.nns), suffix: n.sfx } : null;
    }
    case "sus2":
      return fifth === 7 && has(2) && kind !== "dim" ? { ...base, intervals: [0, 2, 7], ...Q("sus2"), suffix: "sus2" } : null;
    case "sus4":
      return fifth === 7 && has(5) && kind !== "dim" ? { ...base, intervals: [0, 5, 7], ...Q("sus4"), suffix: "sus4" } : null;
    case "sevensus4":
      return fifth === 7 && has(5) && sev === 10 ? { ...base, intervals: [0, 5, 7, 10], ...Q("7sus4"), suffix: "7sus4" } : null;
    case "add9":
      return (kind === "maj" || kind === "min") && ninth === 14 ? { ...base, intervals: [0, third, fifth, 14], ...Q(`${minus}add9`), suffix: `${kind === "min" ? "m" : ""}add9` } : null;
    case "six":
      return (kind === "maj" || kind === "min") && has(9) ? { ...base, intervals: [0, third, fifth, 9], ...Q(`${minus}6`), suffix: `${kind === "min" ? "m" : ""}6` } : null;
    case "sixnine":
      return kind === "maj" && has(9) && ninth === 14 ? { ...base, intervals: [0, third, fifth, 9, 14], ...Q("6/9"), suffix: "6/9" } : null;
    case "ninth": {
      const n = sevName();
      if (!n || ninth !== 14 || (kind !== "maj" && kind !== "min")) return null;
      const s = n.sfx === "maj7" ? "maj9" : n.sfx === "7" ? "9" : n.sfx === "m7" ? "m9" : null;
      return s ? { ...base, intervals: [0, third, fifth, sev, 14], ...Q(n.nns.replace("7", "9")), suffix: s } : null;
    }
    case "eleventh": {
      if (eleventh !== 17 || ninth !== 14) return null;
      if (kind === "min" && sev === 10) return { ...base, intervals: [0, 3, 7, 10, 14, 17], ...Q("-11"), suffix: "m11" };
      // The dominant 11: the 3rd clashes with the 11, so it's left out (a 9sus4 sound).
      if (kind === "maj" && sev === 10) return { ...base, intervals: [0, 7, 10, 14, 17], ...Q("11"), suffix: "11" };
      return null;
    }
    case "thirteenth": {
      const n = sevName();
      if (!n || ninth !== 14 || thirteenth !== 21 || (kind !== "maj" && kind !== "min")) return null;
      const s = n.sfx === "maj7" ? "maj13" : n.sfx === "7" ? "13" : n.sfx === "m7" ? "m13" : null;
      // The 5th and 11th are left out, the usual way to voice a 13th.
      return s ? { ...base, intervals: [0, third, sev, 14, 21], ...Q(n.nns.replace("7", "13")), suffix: s } : null;
    }
  }
}

// ---------------------------------------------------------------- keys and names

/** The 12 major keys, spelled the usual way. */
export const KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"] as const;
const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
export const keyPc = (key: string) => (NATURAL[LETTERS.indexOf(key[0]!)]! + (key.includes("#") ? 1 : key.includes("b") ? -1 : 0) + 12) % 12;

/** Letter name of a scale degree (+ alteration) in a key: b7 in C is Bb, 3 in E is G#. */
export function noteIn(key: string, degree: number, alter = 0): string {
  const letterIdx = (LETTERS.indexOf(key[0]!) + degree) % 7;
  const target = (keyPc(key) + MAJOR[degree]! + alter + 24) % 12;
  let diff = (target - NATURAL[letterIdx]! + 12) % 12;
  if (diff > 6) diff -= 12;
  return LETTERS[letterIdx]! + (diff === 1 ? "#" : diff === 2 ? "x" : diff === -1 ? "b" : diff === -2 ? "bb" : "");
}

/** The chord's everyday name in a key: "2-7" in D is "Em7", "1/3" in G is "G/B". */
export function chordName(key: string, c: NashChord): string {
  const num = NUMBERS[c.number]!;
  const root = noteIn(key, num.degree, num.alter);
  return `${root}${c.suffix}${num.bass !== undefined ? `/${noteIn(key, num.bass)}` : ""}`;
}

// ---------------------------------------------------------------- sound

/** Notes to play: the bass low (E2–D#3), the other chord tones voiced close above it. */
export function voice(key: string, c: NashChord): number[] {
  const kp = keyPc(key);
  const low = (pc: number) => 40 + ((pc - 4 + 24) % 12);
  const rootPc = (kp + c.rootSemis) % 12;
  const bass = low((kp + c.bassSemis) % 12);
  const r = low(rootPc);
  const slash = c.bassSemis !== c.rootSemis;
  const lo = (slash ? bass : r) + 7;
  const pcs = [...new Set(c.intervals.map((i) => (rootPc + i) % 12))];
  const upper = pcs.filter((pc) => slash || pc !== rootPc).map((pc) => lo + ((pc - lo) % 12 + 12) % 12);
  if (!slash) upper.push(r + 12);
  return [bass, ...[...new Set(upper)].sort((a, b) => a - b)];
}

/** The 1-4-5-1 that sets the key before each question. */
export const cadence = (key: string) => ["1", "4", "5", "1"].map((n) => voice(key, buildChord(n, "triad")!));

// ---------------------------------------------------------------- questions

export interface NashSetup {
  numbers: string[];
  flavors: FlavorId[];
}

/** Every (number, flavour) the setup allows — only combinations that fit the key. */
export function choices(setup: NashSetup): NashChord[] {
  const out: NashChord[] = [];
  for (const n of setup.numbers) for (const f of setup.flavors) {
    const c = buildChord(n, f);
    if (c) out.push(c);
  }
  // A number whose chosen flavours all clash with the key still gets its plain triad.
  for (const n of setup.numbers) if (!out.some((c) => c.number === n)) out.push(buildChord(n, "triad")!);
  return out;
}

const pick = <T,>(xs: readonly T[], rand: () => number) => xs[Math.floor(rand() * xs.length) % xs.length]!;

/** A single mystery chord: a random number (never three alike in a row), then a flavour that fits it. */
export function nashQuestion(setup: NashSetup, recent: readonly string[], rand: () => number = Math.random): { key: string; chords: NashChord[] } {
  const all = choices(setup);
  const nums = [...new Set(all.map((c) => c.number))];
  const twice = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2] ? recent[recent.length - 1] : null;
  let n = pick(nums, rand);
  for (let i = 0; i < 6 && n === twice; i++) n = pick(nums, rand);
  if (n === twice) n = nums.find((x) => x !== twice) ?? n;
  return { key: pick(KEYS, rand), chords: [pick(all.filter((c) => c.number === n), rand)] };
}

/** Well-worn four-chord progressions; one that uses only the chosen numbers is preferred. */
export const PROGRESSIONS = [
  ["1", "4", "5", "1"], ["1", "5", "6-", "4"], ["1", "6-", "4", "5"], ["6-", "4", "1", "5"], ["2-", "5", "1", "1"],
  ["1", "4", "6-", "5"], ["1", "b7", "4", "1"], ["1", "3", "6-", "4"], ["1", "1/3", "4", "5"], ["1", "5/7", "6-", "4"],
  ["4", "5", "3-", "6-"], ["1", "b6", "b7", "1"], ["1", "2", "4", "1"], ["1", "3-", "4", "5"], ["6-", "2-", "5", "1"],
  ["1", "b3", "4", "1"], ["1", "4/5", "1", "1"], ["4", "1/3", "2-", "5"], ["1", "1/5", "5", "1"], ["1", "7°", "1/3", "4"],
];

/** A four-chord progression in a random key (usually a well-known one, sometimes random). */
export function nashProgression(setup: NashSetup, rand: () => number = Math.random): { key: string; chords: NashChord[] } {
  const all = choices(setup);
  const nums = new Set(all.map((c) => c.number));
  const known = PROGRESSIONS.filter((p) => p.every((n) => nums.has(n)));
  let seq: string[];
  if (known.length && rand() < 0.7) seq = pick(known, rand);
  else {
    const list = [...nums];
    seq = ["1"];
    while (seq.length < 4) {
      const n = pick(list, rand);
      if (n !== seq[seq.length - 1]) seq.push(n);
    }
    if (!nums.has("1")) seq[0] = pick(list, rand);
  }
  return { key: pick(KEYS, rand), chords: seq.map((n) => pick(all.filter((c) => c.number === n), rand)) };
}

/** Points for a right number (+ a bonus for naming the flavour too), growing with the streak. */
export const nashPoints = (streak: number, flavorRight: boolean) => Math.round((100 + (flavorRight ? 50 : 0)) * (1 + Math.min(10, streak) * 0.1));
