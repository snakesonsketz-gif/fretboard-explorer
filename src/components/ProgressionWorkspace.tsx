import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { playChord } from "@/lib/audio";
import { click } from "@/lib/metronome";
import {
  CHORDS,
  ROOTS,
  degreeToSemitones,
  identify,
  degreesToPitchClasses,
  pretty,
  rootByName,
  type Degree,
} from "@/lib/theory";
import {
  loadProgressions,
  saveProgressions,
  type Progression,
  type ProgressionSlot,
} from "@/lib/favorites";

interface Props {
  currentRootName: string;
  currentDegrees: Degree[];
}

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

export function ProgressionWorkspace({ currentRootName, currentDegrees }: Props) {
  const [saved, setSaved] = useState<Progression[]>([]);
  const [name, setName] = useState("Untitled progression");
  const [slots, setSlots] = useState<ProgressionSlot[]>([]);
  const [bpm, setBpm] = useState(90);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const beatRef = useRef(0);

  useEffect(() => setSaved(loadProgressions()), []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const b = beatRef.current % 4;
      click(b === 0);
      beatRef.current += 1;
      setBeat(beatRef.current);
    }, (60 / bpm) * 1000);
    return () => window.clearInterval(interval);
  }, [running, bpm]);

  const addCurrent = () => {
    const det = identify(rootByName(currentRootName), degreesToPitchClasses(currentDegrees));
    const suffix = det.known?.suffix ?? "custom";
    setSlots((s) => [
      ...s,
      { id: newId(), rootName: currentRootName, suffix, degrees: currentDegrees },
    ]);
  };

  const move = (i: number, dir: -1 | 1) => {
    setSlots((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const persist = () => {
    if (slots.length === 0) return;
    const prog: Progression = { id: newId(), name, bpm, slots };
    const next = [prog, ...saved].slice(0, 30);
    setSaved(next);
    saveProgressions(next);
  };

  const removeSaved = (id: string) => {
    const next = saved.filter((p) => p.id !== id);
    setSaved(next);
    saveProgressions(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your own chords only — nothing is written for you. Add the chord currently on the
        fretboard, reorder it, and practise against the click.
      </p>

      <div className="panel space-y-3 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 sm:max-w-xs"
            aria-label="Progression name"
          />
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={addCurrent}>
              Add current chord
            </Button>
            <Button size="sm" variant="secondary" onClick={persist}>
              Save
            </Button>
          </div>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chords yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s, i) => (
              <div key={s.id} className="rounded-lg border border-border bg-secondary p-2">
                <button
                  type="button"
                  className="font-display text-base font-bold"
                  onClick={() =>
                    playChord(s.degrees.map((d) => 48 + rootByName(s.rootName).pc + degreeToSemitones(d)))
                  }
                >
                  {pretty(s.rootName + (s.suffix === "custom" ? " custom" : s.suffix))}
                </button>
                <div className="mt-1 flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)}>
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)}>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setSlots((x) => x.filter((y) => y.id !== s.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
            Metronome
          </h4>
          <Button
            size="sm"
            onClick={() => {
              beatRef.current = 0;
              setBeat(0);
              setRunning((r) => !r);
            }}
          >
            {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {running ? "Stop" : "Start"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 font-mono text-lg text-primary">{bpm}</span>
          <Slider
            value={[bpm]}
            min={40}
            max={220}
            step={1}
            onValueChange={(v) => setBpm(v[0])}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                "h-2.5 w-8 rounded-full " +
                (running && (beat - 1) % 4 === i ? "bg-primary" : "bg-muted")
              }
            />
          ))}
        </div>
      </div>

      {saved.length > 0 ? (
        <div className="panel space-y-2 p-4">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
            Saved progressions
          </h4>
          {saved.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border p-2"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {p.slots.map((s) => pretty(s.rootName + s.suffix)).join(" – ")} · {p.bpm} bpm
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setName(p.name);
                    setBpm(p.bpm);
                    setSlots(p.slots);
                  }}
                >
                  Load
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeSaved(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {ROOTS.length} roots and {CHORDS.length} chord types are available from the selectors above
        when building a progression.
      </p>
    </div>
  );
}
