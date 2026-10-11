export interface Favorite {
  id: string;
  label: string;
  mode: "chord" | "scale" | "arpeggio";
  rootName: string;
  degrees: string[];
  createdAt: number;
  /** Chords: the fretboard shape picked when it was saved (fret per string, low first), and its tuning. */
  shape?: (number | null)[];
  tuningId?: string;
}

const KEY = "fretlab.favorites.v1";

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const rootPc = (name: string) =>
  ((LETTER_PC[name[0]?.toUpperCase() ?? "C"] ?? 0) + [...name.slice(1)].reduce((a, c) => a + (c === "#" || c === "♯" ? 1 : c === "b" || c === "♭" ? -1 : 0), 0) + 120) % 12;

/** What makes a saved item "the same": the same kind, on the same root note, with the same notes (shape and label don't count). */
export const favoriteKey = (f: Pick<Favorite, "mode" | "rootName" | "degrees">) => `${f.mode}:${rootPc(f.rootName)}:${[...f.degrees].sort().join(",")}`;

/** One entry per chord/scale/arpeggio: later copies of something already in the list are dropped. */
export function dedupeFavorites(list: Favorite[]): Favorite[] {
  const seen = new Set<string>();
  return list.filter((f) => {
    const k = favoriteKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function loadFavorites(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Favorite[]) : [];
    const clean = dedupeFavorites(list);
    // Copies saved before saving became one-per-chord are cleaned out for good.
    if (clean.length !== list.length) saveFavorites(clean);
    return clean;
  } catch {
    return [];
  }
}

export function saveFavorites(list: Favorite[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export interface ProgressionSlot {
  id: string;
  rootName: string;
  suffix: string;
  degrees: string[];
  note?: string;
}

export interface Progression {
  id: string;
  name: string;
  bpm: number;
  slots: ProgressionSlot[];
}

const PROG_KEY = "fretlab.progressions.v1";

export function loadProgressions(): Progression[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROG_KEY);
    return raw ? (JSON.parse(raw) as Progression[]) : [];
  } catch {
    return [];
  }
}

export function saveProgressions(list: Progression[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROG_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}
