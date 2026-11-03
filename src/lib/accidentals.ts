/**
 * One app-wide choice for how note names are written: as spelled by the theory ("auto"), or
 * everything in sharps, or everything in flats. Applied where names are displayed (pretty()), so
 * every tab follows it; the music itself is unchanged.
 */
import { useSyncExternalStore } from "react";

export type Accidentals = "auto" | "sharps" | "flats";
const KEY = "fretlab.accidentals.v1";

let mode: Accidentals = "auto";
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "sharps" || v === "flats") mode = v;
  } catch {
    /* storage unavailable */
  }
}

export function getAccidentals(): Accidentals {
  load();
  return mode;
}

export function setAccidentals(next: Accidentals) {
  load();
  mode = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Re-renders when the setting changes. */
export function useAccidentals(): Accidentals {
  return useSyncExternalStore(subscribe, getAccidentals, () => "auto" as Accidentals);
}

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const ALTER: Record<string, number> = { "𝄫": -2, bb: -2, "♭": -1, b: -1, "𝄪": 2, "##": 2, "♯": 1, "#": 1 };

/**
 * A note letter with an accidental, not inside a word: "B♭", "Bb7", "F#m", "E♭maj7", "C♯/G♯".
 * The b/# must be followed by the end, a non-letter, or a chord-suffix start (m, dim, aug, sus, add).
 */
const NOTE_RE = /(?<![A-Za-z])([A-G])(𝄫|𝄪|♭|♯|bb|##|b|#)(?=$|[^a-z]|m|dim|aug|sus|add)/g;

/** Rewrite note names with accidentals in the chosen style ("auto" leaves the text as it is). */
export function applyAccidentals(text: string, m: Accidentals = getAccidentals()): string {
  if (m === "auto") return text;
  const names = m === "sharps" ? SHARP : FLAT;
  return text.replace(NOTE_RE, (_all, letter: string, acc: string) => names[(((LETTER_PC[letter]! + (ALTER[acc] ?? 0)) % 12) + 12) % 12]!);
}
