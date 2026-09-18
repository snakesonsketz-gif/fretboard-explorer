export interface Favorite {
  id: string;
  label: string;
  mode: "chord" | "scale" | "arpeggio";
  rootName: string;
  degrees: string[];
  createdAt: number;
}

const KEY = "fretlab.favorites.v1";

export function loadFavorites(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
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
