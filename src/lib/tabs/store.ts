/** Saved tabs and the working draft, kept on this device. */
import type { TabDoc } from "./model";

const LIST_KEY = "fretlab.tabs.v1";
const DRAFT_KEY = "fretlab.tabs.draft.v1";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or unavailable */
  }
}

const valid = (d: unknown): d is TabDoc => !!d && typeof d === "object" && Array.isArray((d as TabDoc).cols) && !!(d as TabDoc).tuning?.midis?.length;

export const loadTabs = (): TabDoc[] => (read<unknown[]>(LIST_KEY) ?? []).filter(valid).sort((a, b) => b.updated - a.updated);
export const saveTabs = (list: TabDoc[]) => write(LIST_KEY, list);
export function upsertTab(doc: TabDoc): TabDoc[] {
  const list = loadTabs().filter((d) => d.id !== doc.id);
  const next = [{ ...doc, updated: Date.now() }, ...list];
  saveTabs(next);
  return next;
}
export function deleteTab(id: string): TabDoc[] {
  const next = loadTabs().filter((d) => d.id !== id);
  saveTabs(next);
  return next;
}
export const loadDraft = (): TabDoc | null => {
  const d = read<unknown>(DRAFT_KEY);
  return valid(d) ? d : null;
};
export const saveDraft = (d: TabDoc) => write(DRAFT_KEY, d);
