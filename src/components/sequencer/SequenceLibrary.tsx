import { useEffect, useState } from "react";
import { FilePlus2, FolderOpen, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadSequences, saveSequences, songToArrangement, type SavedSequence } from "@/lib/sequences";
import { loadSongs, type Song } from "@/lib/song";
import { emptyArrangement, newId, type Arrangement } from "@/lib/timeline";

interface Props {
  arr: Arrangement;
  update: (fn: (a: Arrangement) => Arrangement) => void;
  onLoaded: () => void;
}

export function SequenceLibrary({ arr, update, onLoaded }: Props) {
  const [list, setList] = useState<SavedSequence[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [name, setName] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [songId, setSongId] = useState<string>("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    setList(loadSequences());
    setSongs(loadSongs().filter((s) => s.sections.some((sec) => sec.slots.length)));
  }, []);
  const persist = (next: SavedSequence[]) => {
    setList(next);
    saveSequences(next);
  };
  const say = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash(""), 1800);
  };

  const save = (asNew: boolean) => {
    const n = name.trim() || `Idea ${list.length + 1}`;
    const id = !asNew && currentId && list.some((s) => s.id === currentId) ? currentId : newId();
    const entry: SavedSequence = { id, name: n, arrangement: arr, updatedAt: Date.now() };
    persist([entry, ...list.filter((s) => s.id !== id)]);
    setCurrentId(id);
    setName(n);
    say(`Saved “${n}”`);
  };

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Saved sequences">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Saved sequences</h2>
        <span className="text-xs text-primary" aria-live="polite">{flash}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this idea" className="h-9 w-48" aria-label="Sequence name" />
        <Button size="sm" className="h-9 gap-1" onClick={() => save(false)}><Save className="h-4 w-4" /> {currentId ? "Save" : "Save"}</Button>
        {currentId ? <Button size="sm" variant="secondary" className="h-9" onClick={() => save(true)}>Save as new</Button> : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-9 gap-1"
          onClick={() => {
            update((a) => ({ ...emptyArrangement(), bpm: a.bpm, ts: a.ts, measures: a.measures, drums: { ...a.drums, lanes: a.drums.lanes.map((l) => ({ ...l, hits: [] })) } }));
            setCurrentId(null);
            setName("");
            onLoaded();
          }}
          title="Clear chords and drums (Undo brings them back)"
        >
          <FilePlus2 className="h-4 w-4" /> New
        </Button>
      </div>

      {list.length ? (
        <ul className="divide-y divide-border/60 rounded-md border border-border/60">
          {list.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
              <span className="font-semibold">{s.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.arrangement.chords.length} chords · {s.arrangement.measures} bars · {s.arrangement.ts.beats}/{s.arrangement.ts.unit} · {s.arrangement.bpm} bpm
              </span>
              <span className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    update(() => s.arrangement);
                    setCurrentId(s.id);
                    setName(s.name);
                    onLoaded();
                    say(`Loaded “${s.name}”`);
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Load
                </Button>
                <Button
                  size="sm"
                  variant={confirmDelete === s.id ? "destructive" : "ghost"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    if (confirmDelete !== s.id) return setConfirmDelete(s.id);
                    persist(list.filter((x) => x.id !== s.id));
                    setConfirmDelete(null);
                    if (currentId === s.id) setCurrentId(null);
                  }}
                  onBlur={() => setConfirmDelete(null)}
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {confirmDelete === s.id ? "Really delete?" : ""}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing saved yet. Your work is kept as a draft on this device either way.</p>
      )}

      {songs.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">From a song</span>
          <Select value={songId} onValueChange={setSongId}>
            <SelectTrigger className="h-9 w-56" aria-label="Song"><SelectValue placeholder="Pick a song from Explore" /></SelectTrigger>
            <SelectContent>{songs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            size="sm"
            variant="secondary"
            className="h-9"
            disabled={!songId}
            onClick={() => {
              const s = songs.find((x) => x.id === songId);
              if (!s) return;
              update((a) => songToArrangement(s, a));
              setCurrentId(null);
              setName(s.name);
              onLoaded();
              say(`Loaded the chords of “${s.name}”`);
            }}
          >
            Load its chords
          </Button>
          <span className="text-[11px] text-muted-foreground">Uses the song's sections, repeats, bar lengths, tempo and time signature. Your drums stay.</span>
        </div>
      ) : null}
    </section>
  );
}
