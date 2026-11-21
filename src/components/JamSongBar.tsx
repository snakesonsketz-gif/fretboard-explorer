import { useEffect, useState } from "react";
import { Copy, FolderOpen, Pencil, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Jam } from "@/lib/jam";
import {
  cleanName, deleteSong, duplicateSong, loadMode, loadSongs, makeSong, songChanged, storeMode, storeSongs, upsertSong,
  type JamSong, type JamView,
} from "@/lib/jamSongs";

const FREE_KEY = "fretlab.jam.free.v1";

interface Props {
  jam: Jam;
  view: JamView;
  /** Replace everything in Jam with this snapshot. */
  onOpen: (jam: Jam, view: JamView) => void;
  /** Called once saved songs and the mode are read from storage. */
  ready: boolean;
}

/** Free jam / Developing song switch, with save-and-name for everything in Jam. */
export function JamSongBar({ jam, view, onOpen, ready }: Props) {
  const [mode, setMode] = useState<"free" | "song">("free");
  const [songs, setSongs] = useState<JamSong[]>([]);
  const [songId, setSongId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [showList, setShowList] = useState(false);
  const [msg, setMsg] = useState("");

  const current = songs.find((s) => s.id === songId);
  const changed = songChanged(current, jam, view, notes, name);

  useEffect(() => {
    if (!ready) return;
    const all = loadSongs();
    setSongs(all);
    const m = loadMode();
    if (m.mode === "song") {
      setMode("song");
      const s = all.find((x) => x.id === m.songId);
      if (s) {
        setSongId(s.id);
        setName(s.name);
        setNotes(s.notes);
      }
    }
    // Only once, when the page has loaded its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const remember = (m: "free" | "song", id: string | null) => storeMode({ mode: m, songId: id });
  const flash = (t: string) => {
    setMsg(t);
    window.setTimeout(() => setMsg(""), 2500);
  };
  const persist = (next: JamSong[]) => {
    setSongs(next);
    if (!storeSongs(next)) flash("Couldn't save — storage is full or unavailable.");
  };

  const switchMode = (m: "free" | "song") => {
    if (m === mode) return;
    if (m === "song") {
      // Park the free jam so opening songs never overwrites it.
      try { window.localStorage.setItem(FREE_KEY, JSON.stringify({ jam, view })); } catch { /* storage unavailable */ }
      setMode("song");
      remember("song", songId);
      if (songId && current) onOpen(current.jam, current.view);
    } else {
      setMode("free");
      remember("free", null);
      try {
        const raw = window.localStorage.getItem(FREE_KEY);
        if (raw) {
          const f = JSON.parse(raw) as { jam: Jam; view: JamView };
          if (f?.jam) onOpen(f.jam, f.view);
        }
      } catch { /* ignore */ }
    }
  };

  const open = (s: JamSong) => {
    setSongId(s.id);
    setName(s.name);
    setNotes(s.notes);
    onOpen(s.jam, s.view);
    remember("song", s.id);
    setShowList(false);
  };

  const save = (asNew: boolean) => {
    const base = !asNew && current ? { ...current, name, notes } : makeSong(name, jam, view, notes);
    const song: JamSong = { ...base, jam, view, notes, name: cleanName(name) || "Untitled song" };
    persist(upsertSong(songs, song));
    setSongId(song.id);
    setName(song.name);
    remember("song", song.id);
    flash(asNew || !current ? `Saved “${song.name}”.` : `Updated “${song.name}”.`);
  };

  const newSong = () => {
    setSongId(null);
    setName("");
    setNotes("");
    remember("song", null);
  };

  return (
    <section className="panel space-y-2 p-3" data-testid="jam-song-bar">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Jam mode">
          {([["free", "Free jam"], ["song", "Developing song"]] as const).map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => switchMode(m)} className={cn("rounded px-2.5 py-1.5 font-semibold", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")} data-testid={`jam-mode-${m}`}>
              {label}
            </button>
          ))}
        </div>
        {mode === "song" ? (
          <>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your song" aria-label="Song name" className="h-9 min-w-0 flex-1 basis-40" maxLength={60} data-testid="jam-song-name" />
            <Button size="sm" className="gap-1" onClick={() => save(false)} data-testid="jam-song-save">
              <Save className="h-3.5 w-3.5" /> {current ? "Save" : "Save song"}
            </Button>
            {current ? (
              <Button size="sm" variant="secondary" onClick={() => save(true)} data-testid="jam-song-save-new">Save as new</Button>
            ) : null}
            <Button size="sm" variant="secondary" className="gap-1" onClick={() => setShowList((v) => !v)} aria-expanded={showList} data-testid="jam-song-list-toggle">
              <FolderOpen className="h-3.5 w-3.5" /> My songs ({songs.length})
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Switch to Developing song to save and name what you build.</span>
        )}
      </div>
      {mode === "song" ? (
        <>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes — ideas, what to fix, where it's going (saved with the song)" rows={2} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" aria-label="Song notes" data-testid="jam-song-notes" />
          <p className="text-[11px] text-muted-foreground" data-testid="jam-song-status" aria-live="polite">
            {msg || (current ? (changed ? "Unsaved changes." : `Saved · ${new Date(current.updatedAt).toLocaleString()}`) : "Not saved yet — everything below (chords, selections, tempo, drums, tuning) is saved with the song.")}
          </p>
          {showList ? (
            <ul className="space-y-1" data-testid="jam-song-list">
              {songs.map((s) => (
                <li key={s.id} className={cn("flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5", s.id === songId ? "border-primary/60 bg-primary/10" : "border-border bg-card/40")}>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(s)} data-testid="jam-song-open">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.jam.chords.length} chords · {s.jam.bpm} bpm · {new Date(s.updatedAt).toLocaleDateString()}</span>
                  </button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Rename ${s.name}`} onClick={() => { const n = window.prompt("Rename song", s.name); if (n && cleanName(n)) { persist(upsertSong(songs, { ...s, name: n }, s.updatedAt)); if (s.id === songId) setName(cleanName(n)); } }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Duplicate ${s.name}`} onClick={() => persist(upsertSong(songs, duplicateSong(s)))}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-third" aria-label={`Delete ${s.name}`} onClick={() => { if (window.confirm(`Delete “${s.name}”?`)) { persist(deleteSong(songs, s.id)); if (s.id === songId) newSong(); } }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
              {!songs.length ? <li className="text-sm text-muted-foreground">No saved songs yet.</li> : null}
              <li><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={newSong}>+ Start a new song (keeps what's on screen)</Button></li>
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
