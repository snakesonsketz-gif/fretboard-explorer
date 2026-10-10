/**
 * User drum samples, kept in the browser's IndexedDB (audio is too big for localStorage).
 * Samples stay on this device. Every call fails soft: a missing or blocked store just means
 * the lane falls back to its built-in sound.
 */
const DB = "fretlab-samples";
const STORE = "samples";
const MAX_BYTES = 8 * 1024 * 1024;

export interface SampleMeta {
  id: string;
  name: string;
  bytes: number;
  addedAt: number;
}

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Store an audio file. Returns its metadata, or an error message the UI can show. */
export async function saveSample(file: File): Promise<SampleMeta | { error: string }> {
  if (!/^audio\//.test(file.type) && !/\.(wav|mp3|ogg|m4a|aac|flac|aiff?)$/i.test(file.name))
    return { error: "That doesn't look like an audio file (WAV, MP3, OGG, M4A, FLAC)." };
  if (file.size > MAX_BYTES) return { error: `Too big (${(file.size / 1048576).toFixed(1)} MB). Drum hits should be under 8 MB.` };
  const meta: SampleMeta = { id: Math.random().toString(36).slice(2, 10), name: file.name.replace(/\.[^.]+$/, ""), bytes: file.size, addedAt: Date.now() };
  const data = await file.arrayBuffer();
  const ok = await tx("readwrite", (s) => s.put({ ...meta, data }));
  return ok === null ? { error: "Couldn't save the sample in this browser (storage may be blocked or full)." } : meta;
}

export async function listSamples(): Promise<SampleMeta[]> {
  const all = (await tx<({ data: ArrayBuffer } & SampleMeta)[]>("readonly", (s) => s.getAll())) ?? [];
  return all.map(({ data: _d, ...m }) => m).sort((a, b) => b.addedAt - a.addedAt);
}

export async function deleteSample(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

/** Decode a stored sample with the given decoder (the audio engine's context). */
export async function loadSampleBuffer(id: string, decode: (data: ArrayBuffer) => Promise<AudioBuffer>): Promise<AudioBuffer | null> {
  const rec = await tx<{ data: ArrayBuffer } | undefined>("readonly", (s) => s.get(id));
  if (!rec?.data) return null;
  try {
    return await decode(rec.data.slice(0));
  } catch {
    return null;
  }
}
