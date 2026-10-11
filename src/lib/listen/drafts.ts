/**
 * A recording in progress, written to the device every few seconds while it records. If the page
 * is killed before the take is saved (an iPad reloaded the page right after Done, Oct 2026), the
 * audio is still here and the Develop tab turns it back into a take.
 */
const DB = "fretlab-drafts";
const STORE = "draft";

export interface DraftMeta {
  startedAt: number;
  sampleRate: number;
  /** What was being recorded (a guided step, or a free take's label and chord). */
  step?: string;
  info: Record<string, unknown>;
}

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? (req.result as T) : null);
      t.onerror = t.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Start a new draft (any old one is dropped). */
export async function startDraft(meta: DraftMeta): Promise<void> {
  await tx("readwrite", (s) => {
    s.clear();
    s.put(meta, "meta");
  });
}

/** Add the next stretch of audio (16-bit). */
export async function appendDraft(n: number, pcm: Int16Array): Promise<void> {
  await tx("readwrite", (s) => s.put(pcm, `chunk-${String(n).padStart(5, "0")}`));
}

export async function clearDraft(): Promise<void> {
  await tx("readwrite", (s) => s.clear());
}

/** A draft left behind by a page that never finished saving it, if there is one. */
export async function loadDraft(): Promise<{ meta: DraftMeta; pcm: Int16Array } | null> {
  const meta = await tx<DraftMeta>("readonly", (s) => s.get("meta"));
  if (!meta) return null;
  const keys = ((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? []).filter((k) => String(k).startsWith("chunk-")).sort();
  const chunks: Int16Array[] = [];
  for (const k of keys) {
    const c = await tx<Int16Array>("readonly", (s) => s.get(k));
    if (c) chunks.push(c);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  if (!total) return null;
  const pcm = new Int16Array(total);
  let at = 0;
  for (const c of chunks) {
    pcm.set(c, at);
    at += c.length;
  }
  return { meta, pcm };
}
