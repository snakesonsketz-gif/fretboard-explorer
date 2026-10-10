import { useRef } from "react";
import { Play, Square, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { measureTicks, retimeChords, toBarBeat, type Arrangement, type Grid, type TimeSig } from "@/lib/timeline";
import { GRID_LABELS } from "./shared";
import { usePlayhead } from "./useSequencer";


interface Props {
  arr: Arrangement;
  playing: boolean;
  canUndo: boolean;
  grid: Grid;
  onGrid: (g: Grid) => void;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onBpm: (bpm: number) => void;
  update: (fn: (a: Arrangement) => Arrangement) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    {children}
  </label>
);

export function TransportBar({ arr, playing, canUndo, grid, onGrid, onPlay, onStop, onUndo, onBpm, update }: Props) {
  const counter = useRef<HTMLSpanElement>(null);
  usePlayhead(playing, (t) => {
    if (!counter.current) return;
    if (t < 0) {
      const beatsLeft = Math.ceil(-t / (measureTicks(arr.ts) / arr.ts.beats));
      counter.current.textContent = `Count-in ${beatsLeft}`;
    } else {
      const p = toBarBeat(t, arr.ts);
      counter.current.textContent = `Bar ${p.bar} · Beat ${p.beat}`;
    }
  });

  // Tap tempo: average of the last few taps, ignoring gaps longer than 2 s.
  const taps = useRef<number[]>([]);
  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now].slice(-6);
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i]!);
      onBpm(Math.round(Math.min(300, Math.max(30, 60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)))));
    }
  };

  const setTs = (ts: TimeSig) =>
    update((a) => {
      const len = a.measures * measureTicks(ts);
      return { ...a, ts, chords: retimeChords(a.chords, a.ts, ts, grid, len) };
    });
  const setMeasures = (m: number) =>
    update((a) => {
      const measures = Math.max(1, Math.min(64, m));
      const len = measures * measureTicks(a.ts);
      return { ...a, measures, chords: a.chords.filter((c) => c.start < len).map((c) => ({ ...c, duration: Math.min(c.duration, len - c.start) })) };
    });

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Transport">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" className="h-11 min-w-28 gap-2 text-base" onClick={playing ? onStop : onPlay} aria-label={playing ? "Stop" : "Play"}>
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Stop" : "Play"}
        </Button>
        <span ref={counter} className="min-w-32 font-mono text-sm text-primary" aria-live="off">
          Bar 1 · Beat 1
        </span>
        <Button size="sm" variant="ghost" className="ml-auto gap-1" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" /> Undo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label={`Tempo · ${arr.bpm} bpm`}>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" className="h-9 w-8 px-0" onClick={() => onBpm(Math.max(30, arr.bpm - 1))} aria-label="Slower">−</Button>
            <Input
              type="number"
              inputMode="numeric"
              min={30}
              max={300}
              value={arr.bpm}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) onBpm(Math.min(300, Math.max(30, v)));
              }}
              className="h-9 w-16 px-2 text-center font-mono"
              aria-label="Tempo in BPM"
            />
            <Button size="sm" variant="secondary" className="h-9 w-8 px-0" onClick={() => onBpm(Math.min(300, arr.bpm + 1))} aria-label="Faster">+</Button>
            <Button size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={tap} title="Tap this button in time to set the tempo">Tap</Button>
          </div>
        </Field>

        <Field label="Time signature">
          <div className="flex items-center gap-1">
            <Select value={String(arr.ts.beats)} onValueChange={(v) => setTs({ ...arr.ts, beats: Number(v) })}>
              <SelectTrigger className="h-9 w-16" aria-label="Beats per bar"><SelectValue /></SelectTrigger>
              <SelectContent>{[2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground">/</span>
            <Select value={String(arr.ts.unit)} onValueChange={(v) => setTs({ ...arr.ts, unit: Number(v) as TimeSig["unit"] })}>
              <SelectTrigger className="h-9 w-16" aria-label="Beat unit"><SelectValue /></SelectTrigger>
              <SelectContent>{[2, 4, 8, 16].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Field>

        <Field label="Measures">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" className="h-9 w-8 px-0" onClick={() => setMeasures(arr.measures - 1)} aria-label="Fewer measures">−</Button>
            <span className="w-8 text-center font-mono">{arr.measures}</span>
            <Button size="sm" variant="secondary" className="h-9 w-8 px-0" onClick={() => setMeasures(arr.measures + 1)} aria-label="More measures">+</Button>
          </div>
        </Field>

        <Field label="Snap to">
          <Select value={String(grid)} onValueChange={(v) => onGrid(Number(v) as Grid)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{([1, 2, 3, 4] as Grid[]).map((g) => <SelectItem key={g} value={String(g)}>{GRID_LABELS[g]}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <Field label="Count-in">
          <Select value={String(arr.countIn)} onValueChange={(v) => update((a) => ({ ...a, countIn: Number(v) as 0 | 1 | 2 }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Off</SelectItem>
              <SelectItem value="1">1 bar</SelectItem>
              <SelectItem value="2">2 bars</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={`Strum · ${arr.strumMs ? `${arr.strumMs} ms` : "off"}`}>
          <Slider className="py-3" min={0} max={60} step={2} value={[arr.strumMs]} onValueChange={(v) => update((a) => ({ ...a, strumMs: v[0] ?? 0 }))} aria-label="Strum speed" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={arr.loop} onCheckedChange={(v) => update((a) => ({ ...a, loop: v }))} /> Loop
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={arr.metronome} onCheckedChange={(v) => update((a) => ({ ...a, metronome: v }))} /> Click
        </label>
      </div>
    </section>
  );
}
