/**
 * Developing songs: named, saved snapshots of everything in Jam (chords, what to play over each,
 * tempo, drums, layout, tuning and view settings) plus notes. Pure apart from the storage helpers.
 */
import type { Jam } from "@/lib/jam";
import { newId } from "@/lib/timeline";

export const SONGS_KEY = "fretlab.jam.songs.v1";
export const MODE_KEY = "fretlab.jam.mode.v1";

export interface JamView {
  tuningId: string;
  toFret: number;
  labels: "degree" | "note";
  showNext: boolean;
}

export interface JamSong {
  id: string;
  name: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  jam: Jam;
  view: JamView;
}

export interface JamMode {
  mode: "free" | "song";
  songId: string | null;
}

/** Deep copy so a saved song never shares objects with the live editor. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const cleanName = (name: string): string => name.trim().replace(/\s+/g, " ").slice(0, 60);

export function makeSong(name: string, jam: Jam, view: JamView, notes = "", now = Date.now()): JamSong {
  return { id: newId(), name: cleanName(name) || "Untitled song", notes, createdAt: now, updatedAt: now, jam: clone(jam), view: { ...view } };
}

/** Save over an existing song (same id) or add a new one; newest first. */
export function upsertSong(songs: JamSong[], song: JamSong, now = Date.now()): JamSong[] {
  const saved: JamSong = { ...song, name: cleanName(song.name) || "Untitled song", jam: clone(song.jam), view: { ...song.view }, updatedAt: now };
  const rest = songs.filter((s) => s.id !== song.id);
  return [saved, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const deleteSong = (songs: JamSong[], id: string): JamSong[] => songs.filter((s) => s.id !== id);

export function duplicateSong(song: JamSong, now = Date.now()): JamSong {
  return { ...clone(song), id: newId(), name: cleanName(`${song.name} copy`), createdAt: now, updatedAt: now };
}

/** True when the live Jam differs from the saved song (ignores name, which is saved separately). */
export function songChanged(song: JamSong | undefined, jam: Jam, view: JamView, notes: string, name: string): boolean {
  if (!song) return true;
  return JSON.stringify([song.jam, song.view, song.notes, song.name]) !== JSON.stringify([jam, view, notes, cleanName(name) || "Untitled song"]);
}

export function loadSongs(storage: Pick<Storage, "getItem"> = window.localStorage): JamSong[] {
  try {
    const raw = storage.getItem(SONGS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is JamSong => !!s && typeof s === "object" && typeof (s as JamSong).id === "string" && Array.isArray((s as JamSong).jam?.chords));
  } catch {
    return [];
  }
}

export function storeSongs(songs: JamSong[], storage: Pick<Storage, "setItem"> = window.localStorage): boolean {
  try {
    storage.setItem(SONGS_KEY, JSON.stringify(songs));
    return true;
  } catch {
    return false;
  }
}

export function loadMode(storage: Pick<Storage, "getItem"> = window.localStorage): JamMode {
  try {
    const m = JSON.parse(storage.getItem(MODE_KEY) ?? "null") as Partial<JamMode> | null;
    return { mode: m?.mode === "song" ? "song" : "free", songId: typeof m?.songId === "string" ? m.songId : null };
  } catch {
    return { mode: "free", songId: null };
  }
}

export function storeMode(m: JamMode, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  try {
    storage.setItem(MODE_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}
