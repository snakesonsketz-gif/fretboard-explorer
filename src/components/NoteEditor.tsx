import { Minus, Plus, RotateCcw, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CANONICAL, pcOf } from "@/lib/edit";
import { INTERVAL_SHORT, pretty, spellDegree, type Degree, type Root } from "@/lib/theory";

export interface SelectedInfo {
  stringLabel: string;
  fret: number;
  noteName: string;
  midi: number;
  degree?: Degree | undefined;
  semis: number;
}

interface Props {
  root: Root;
  degrees: Degree[];
  selected: SelectedInfo | null;
  canUndo: boolean;
  modified: boolean;
  onShift: (delta: number) => void;
  onAddSelected: () => void;
  onRemoveSelected: () => void;
  onClearSelection: () => void;
  onTogglePc: (pc: number) => void;
  onUndo: () => void;
  onReset: () => void;
}

function octaveName(midi: number) {
  return `${Math.floor(midi / 12) - 1}`;
}

export function NoteEditor(p: Props) {
  const s = p.selected;
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-lg border border-border bg-secondary/40 p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Selected fret
          </p>
          {s ? (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={p.onClearSelection}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {s ? (
          <>
            <p className="mt-1 font-display text-xl font-bold" data-testid="selected-note">
              {pretty(s.noteName)}
              <span className="text-sm text-muted-foreground">{octaveName(s.midi)}</span>
              <span className="ml-2 font-mono text-sm text-primary">
                {s.degree ? pretty(s.degree) : "not in set"}
              </span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {pretty(s.stringLabel)} string · fret {s.fret} · {INTERVAL_SHORT[s.semis] ?? ""} above
              root
            </p>
            {s.degree ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => p.onShift(-1)} aria-label="Flatten selected note">
                  <Minus className="mr-1 h-3.5 w-3.5" /> ♭ semitone
                </Button>
                <Button size="sm" variant="secondary" onClick={() => p.onShift(1)} aria-label="Sharpen selected note">
                  <Plus className="mr-1 h-3.5 w-3.5" /> ♯ semitone
                </Button>
                {s.semis !== 0 ? (
                  <Button size="sm" variant="ghost" onClick={p.onRemoveSelected}>
                    Remove
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button size="sm" className="mt-2" onClick={p.onAddSelected}>
                Add {pretty(CANONICAL[s.semis]!)} to the set
              </Button>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {s.semis === 0
                ? "This is the root: moving it transposes the whole structure."
                : "Drag the note left/right along the string, or use ← / → keys, to move it by semitones. Every copy of this pitch updates."}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Tap any fret. Set notes can be dragged left/right to flatten or sharpen them; empty
            frets can be added.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Pitch collection
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={!p.canUndo} onClick={p.onUndo}>
              <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo
            </Button>
            <Button size="sm" variant="ghost" disabled={!p.modified} onClick={p.onReset}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Revert
            </Button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {CANONICAL.map((d, pc) => {
            const hit = p.degrees.find((x) => pcOf(x) === pc);
            return (
              <button
                key={pc}
                type="button"
                disabled={pc === 0}
                aria-pressed={!!hit}
                aria-label={`Toggle ${spellDegree(p.root, hit ?? d)}`}
                onClick={() => p.onTogglePc(pc)}
                className={cn(
                  "flex flex-col items-center rounded-md border px-1 py-1.5 font-mono text-[11px] leading-tight transition-colors",
                  hit
                    ? pc === 0
                      ? "border-root bg-root text-root-foreground"
                      : "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="font-bold">{pretty(spellDegree(p.root, hit ?? d))}</span>
                <span className="opacity-80">{pretty(hit ?? d)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{p.degrees.length} notes</span>
          {p.modified ? <Badge variant="outline">edited</Badge> : null}
          <span>Dashed ring on the fretboard = altered from the original.</span>
        </div>
      </div>
    </div>
  );
}
