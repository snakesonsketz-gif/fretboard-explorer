import { Copy, Play, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pretty } from "@/lib/theory";
import {
  arrangementTicks,
  beatTicks,
  describeLength,
  gridTicks,
  measureTicks,
  newId,
  overlaps,
  roomAfter,
  toBarBeat,
  type Arrangement,
  type ChordEvent,
  type Grid,
} from "@/lib/timeline";
import type { PaletteChord } from "@/lib/sequences";

interface Props {
  arr: Arrangement;
  chord: ChordEvent;
  grid: Grid;
  armed: PaletteChord | null;
  update: (fn: (a: Arrangement) => Arrangement) => void;
  onSelect: (id: string | null) => void;
  onPreview: (c: ChordEvent) => void;
}

/** Precise editing of the selected chord — the touch-friendly alternative to dragging. */
export function ChordInspector({ arr, chord: c, grid, armed, update, onSelect, onPreview }: Props) {
  const len = arrangementTicks(arr);
  const step = gridTicks(arr.ts, grid);
  const room = roomAfter(arr.chords, c.start, len, c.id);
  const pos = toBarBeat(c.start, arr.ts);
  const sub = pos.tick / step;
  const patch = (p: Partial<ChordEvent>) => update((a) => ({ ...a, chords: a.chords.map((x) => (x.id === c.id ? { ...x, ...p } : x)) }));
  const canMove = (s: number) => s >= 0 && s + c.duration <= len && !overlaps(arr.chords, s, c.duration, c.id);
  const lengths: [string, number][] = [
    ["1 beat", beatTicks(arr.ts)],
    ["2 beats", beatTicks(arr.ts) * 2],
    ["1 bar", measureTicks(arr.ts)],
    ["2 bars", measureTicks(arr.ts) * 2],
  ];
  const nextStart = c.start + c.duration;
  const canDuplicate = roomAfter(arr.chords, nextStart, len, c.id) >= Math.min(c.duration, step) && !arr.chords.some((x) => x.start === nextStart);

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Selected chord" data-testid="chord-inspector">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-black">{pretty(c.label)}</h2>
        <span className="font-mono text-xs text-muted-foreground">{c.degrees.map(pretty).join(" ")}</span>
        <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1" onClick={() => onPreview(c)}><Play className="h-3.5 w-3.5" /> Hear</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Starts</p>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" className="h-9 w-9 p-0" disabled={!canMove(c.start - step)} onClick={() => patch({ start: c.start - step })} aria-label="Move earlier">←</Button>
            <span className="min-w-36 text-center font-mono text-sm" data-testid="chord-start">
              Bar {pos.bar} · Beat {pos.beat}{sub ? ` +${Number.isInteger(sub) ? sub : sub.toFixed(1)}/${grid}` : ""}
            </span>
            <Button size="sm" variant="secondary" className="h-9 w-9 p-0" disabled={!canMove(c.start + step)} onClick={() => patch({ start: c.start + step })} aria-label="Move later">→</Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rings for</p>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" className="h-9 w-9 p-0" disabled={c.duration - step < step} onClick={() => patch({ duration: c.duration - step })} aria-label="Shorter">−</Button>
            <span className="min-w-36 text-center font-mono text-sm" data-testid="chord-length">{describeLength(c.duration, arr.ts)}</span>
            <Button size="sm" variant="secondary" className="h-9 w-9 p-0" disabled={c.duration + step > room} onClick={() => patch({ duration: c.duration + step })} aria-label="Longer">+</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {lengths.map(([label, t]) => (
              <Button key={label} size="sm" variant={c.duration === t ? "default" : "secondary"} className="h-7 px-2 text-xs" disabled={t > room} onClick={() => patch({ duration: t })}>
                {label}
              </Button>
            ))}
            <Button size="sm" variant={c.duration === room ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => patch({ duration: room })} title="Ring until the next chord (or the end)">
              Until next
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
        <Button
          size="sm"
          variant="secondary"
          className="gap-1"
          disabled={!canDuplicate}
          onClick={() => {
            const id = newId();
            const d = Math.min(c.duration, roomAfter(arr.chords, nextStart, len, c.id));
            update((a) => ({ ...a, chords: [...a.chords, { ...c, id, start: nextStart, duration: d }] }));
            onSelect(id);
          }}
        >
          <Copy className="h-3.5 w-3.5" /> Repeat after
        </Button>
        {armed ? (
          <Button size="sm" variant="secondary" className="gap-1" onClick={() => patch({ rootName: armed.rootName, degrees: [...armed.degrees], label: armed.label })}>
            <Replace className="h-3.5 w-3.5" /> Swap to {pretty(armed.label)}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1 text-destructive-foreground"
          onClick={() => {
            update((a) => ({ ...a, chords: a.chords.filter((x) => x.id !== c.id) }));
            onSelect(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    </section>
  );
}
