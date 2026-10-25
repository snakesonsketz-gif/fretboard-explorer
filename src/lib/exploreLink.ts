/**
 * Hand a chord to the Explore tab from another tab (the chord finder): saved for a fresh Explore
 * and announced with an event for one that's already open.
 */
export interface ExploreChord {
  rootName: string;
  degrees: string[];
  tuningId: string;
  /** Show this shape for it (fret per string, low first). */
  shape?: (number | null)[] | undefined;
}

const KEY = "fretlab.explore.open.v1";
export const OPEN_EVENT = "fretlab-open-chord";

export function openInExplore(c: ExploreChord) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable: the event still reaches an open Explore */
  }
  window.dispatchEvent(new CustomEvent<ExploreChord>(OPEN_EVENT, { detail: c }));
}

/** Take (and clear) a chord waiting for Explore. */
export function takePendingChord(): ExploreChord | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    window.localStorage.removeItem(KEY);
    return JSON.parse(raw) as ExploreChord;
  } catch {
    return null;
  }
}
