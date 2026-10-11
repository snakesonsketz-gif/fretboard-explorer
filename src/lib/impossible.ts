/**
 * Shapes the player marked "impossible" in developer mode (e.g. a barre that would have to leave a
 * string open under it). They're never suggested again on this device, and the Develop tab lists
 * them so they can be sent back to whoever tunes the shape finder.
 */
export interface ImpossibleShape {
  /** Fret per string, low string first; null = not played. */
  shape: (number | null)[];
  tuningId: string;
  /** What the chord was when it was marked, e.g. "Fmaj7". */
  chord: string;
  /** The chord itself, so it can be opened again to look at the shape. */
  rootName?: string;
  degrees?: string[];
  at: number;
}

const KEY = "fretlab.impossible.v1";
const same = (a: readonly (number | null)[], b: readonly (number | null)[]) => a.length === b.length && a.every((f, i) => f === b[i]);

export function loadImpossible(): ImpossibleShape[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ImpossibleShape[];
  } catch {
    return [];
  }
}
function store(list: ImpossibleShape[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* not remembered */
  }
  window.dispatchEvent(new Event("fretlab-impossible"));
}
export function markImpossible(shape: (number | null)[], tuningId: string, chord: string, rootName?: string, degrees?: string[]): ImpossibleShape[] {
  const list = loadImpossible().filter((x) => !(x.tuningId === tuningId && same(x.shape, shape)));
  const next: ImpossibleShape[] = [{ shape: [...shape], tuningId, chord, at: Date.now(), ...(rootName && degrees ? { rootName, degrees: [...degrees] } : {}) }, ...list];
  store(next);
  return next;
}
export function unmarkImpossible(shape: (number | null)[], tuningId: string): ImpossibleShape[] {
  const next = loadImpossible().filter((x) => !(x.tuningId === tuningId && same(x.shape, shape)));
  store(next);
  return next;
}
export const isMarkedImpossible = (list: readonly ImpossibleShape[], shape: readonly (number | null)[], tuningId: string) =>
  list.some((x) => x.tuningId === tuningId && same(x.shape, shape));

/** The list as plain text, to paste into a message. */
export const impossibleReport = (list: readonly ImpossibleShape[]) =>
  list.map((x) => `${x.chord}: ${x.shape.map((f) => (f === null ? "x" : f)).join(" ")} (${x.tuningId}, marked ${new Date(x.at).toLocaleDateString()})`).join("\n");
