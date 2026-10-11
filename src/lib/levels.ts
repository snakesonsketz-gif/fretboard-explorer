/**
 * Difficulty tiers shared by the Explore library (chords, scales, arpeggios) and the games.
 * A beginner sees the fundamentals first and works up; everything not listed for an earlier
 * tier is Expert.
 */
import type { Favorite } from "./favorites";
import { CHORDS } from "./theory";

export const TIERS = [
  { id: "beginner", name: "Beginner", blurb: "The fundamentals" },
  { id: "intermediate", name: "Intermediate", blurb: "Colours and 7ths" },
  { id: "advanced", name: "Advanced", blurb: "Extensions, barres and modes" },
  { id: "expert", name: "Expert", blurb: "Altered, exotic and jazz" },
] as const;
export type Tier = (typeof TIERS)[number]["id"];
export const tierIndex = (t: Tier) => TIERS.findIndex((x) => x.id === t);
export const tierName = (t: Tier) => TIERS[tierIndex(t)]!.name;
export const isTier = (v: unknown): v is Tier => TIERS.some((t) => t.id === v);

/** Neon colour per tier (games and tabs). */
export const TIER_COLOR: Record<Tier, string> = { beginner: "#39ff14", intermediate: "#00e5ff", advanced: "#ff2bd6", expert: "#ff7a00" };

const set = (s: string) => new Set(s.trim().split(/\s+/));

const CHORD_TIERS: Record<Exclude<Tier, "expert">, Set<string>> = {
  beginner: set("maj min 5 7 m7 maj7 sus2 sus4 add9"),
  intermediate: set(`dim aug 6 m6 69 m7b5 dim7 mmaj7 7sus4 madd9 add11 madd11 9 m9 maj9 5add9 octave
    7no5 maj7no5 m7no5 guide-3-7 guide-maj guide-min sus4add9 6sus2`),
  advanced: set(`11 m11 13 m13 maj11 maj13 maj7s11 m69 7add13 m7add11 9sus4 13sus4 maj7sus4 7sus2 maj7sus2
    7b9 7s9 7s11 7b13 7s5 7b5 7alt maj7s5 maj7b5 m7s5 majb5 dim9 augadd9 dimadd9 add13 addS11 maj7add13
    6sus4 7add6 6add11 m7b9 add9no3 madd9add11 6no5 mmaj7no5 dim7no5 shell-m6 shell-m7b5
    rl-maj9 rl-m9 rl-9 rl-69 slash-IV slash-V slash-II slash-bVII slash-IIm quartal3 so-what 9s11 9s5 9b5 13b9 13s9 13s11`),
};

export function chordTier(id: string): Tier {
  for (const t of ["beginner", "intermediate", "advanced"] as const) if (CHORD_TIERS[t].has(id)) return t;
  return "expert";
}

const SCALE_TIERS: Record<Exclude<Tier, "expert">, Set<string>> = {
  beginner: set("major-pentatonic minor-pentatonic blues ionian aeolian"),
  intermediate: set("dorian mixolydian lydian phrygian locrian harmonic-minor melodic-minor major-blues chromatic"),
  advanced: set(`phrygian-dominant lydian-dominant altered whole-tone dim-whole-half dim-half-whole bebop-dominant
    bebop-major bebop-dorian bebop-melodic-minor dorian-b2 lydian-augmented mixolydian-b6 locrian-nat2 harmonic-major
    hungarian-minor double-harmonic dominant-pentatonic minor6-pentatonic egyptian blues-minor-pent major-hexatonic
    minor-hexatonic hirajoshi kumoi japanese-insen spanish-8`),
};

export function scaleTier(id: string): Tier {
  for (const t of ["beginner", "intermediate", "advanced"] as const) if (SCALE_TIERS[t].has(id)) return t;
  return "expert";
}

const ARP_TIERS: Record<Exclude<Tier, "expert">, Set<string>> = {
  beginner: set("full triad"),
  intermediate: set("shell seventh add9 sixths r37 guide no5 sus4 sus2 to9"),
  advanced: set("rootless upper to11 to13 69 add6 from3 from7 top3 addmaj7 addb7 half-dim full-dim aug-form"),
};

export function arpeggioTier(id: string): Tier {
  for (const t of ["beginner", "intermediate", "advanced"] as const) if (ARP_TIERS[t].has(id)) return t;
  return "expert";
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The library chord a set of degrees spells, if any. */
export const chordDefFor = (degrees: readonly string[]) => CHORDS.find((c) => sameSet(c.degrees, degrees));

/** A saved chord's tier: the library chord it spells, or by how many notes and alterations it has. */
export function favoriteTier(f: Pick<Favorite, "degrees">): Tier {
  const def = chordDefFor(f.degrees);
  if (def) return chordTier(def.id);
  const altered = f.degrees.filter((d) => /[b#]/.test(d) && d !== "b3" && d !== "b7").length;
  if (f.degrees.length <= 3 && !altered) return "intermediate";
  if (f.degrees.length <= 4 && altered <= 1) return "advanced";
  return "expert";
}

// ---------------------------------------------------------------- remembered choice

const KEY = "fretlab.tier.v1";
export function loadTier(scope: string, fallback: Tier = "beginner"): Tier {
  try {
    const v = (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, string>)[scope];
    return isTier(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
export function saveTier(scope: string, t: Tier) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
    all[scope] = t;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* not remembered */
  }
}
