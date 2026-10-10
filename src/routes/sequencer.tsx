import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ChordInspector } from "@/components/sequencer/ChordInspector";
import { ChordPalette } from "@/components/sequencer/ChordPalette";
import { ChordTimeline } from "@/components/sequencer/ChordTimeline";
import { DrumGrid } from "@/components/sequencer/DrumGrid";
import { SequenceLibrary } from "@/components/sequencer/SequenceLibrary";
import { TransportBar } from "@/components/sequencer/TransportBar";
import { useSequencer } from "@/components/sequencer/useSequencer";
import { engine } from "@/lib/engine";
import { loadPalette, type PaletteChord } from "@/lib/sequences";
import { arrangementTicks, beatTicks, chordMidis, measureTicks, newId, roomAfter, type ChordEvent, type Grid } from "@/lib/timeline";

export const Route = createFileRoute("/sequencer")({
  head: () => ({ meta: [{ title: "Sequencer — Fretlab" }] }),
  component: SequencerPage,
});

type NewLen = "beat" | "2beats" | "bar" | "2bars";

function SequencerPage() {
  const seq = useSequencer();
  const { arr, playing, undo } = seq;
  const [grid, setGrid] = useState<Grid>(1);
  const [zoom, setZoom] = useState<number | null>(null);
  const [palette, setPalette] = useState<PaletteChord[]>([]);
  const [armed, setArmed] = useState<PaletteChord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLen, setNewLen] = useState<NewLen>("bar");

  useEffect(() => setPalette(loadPalette()), []);
  // Ctrl/Cmd+Z undoes the last sequencer edit (not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !typing) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const preview = (c: Pick<ChordEvent, "rootName" | "degrees" | "midis">) => void engine.previewChord(chordMidis(c), arr.strumMs);
  const arm = (c: PaletteChord | null) => {
    setArmed(c);
    if (c && !playing) preview(c);
  };
  const lenTicks = { beat: beatTicks(arr.ts), "2beats": beatTicks(arr.ts) * 2, bar: measureTicks(arr.ts), "2bars": measureTicks(arr.ts) * 2 }[newLen];

  const place = (tick: number) => {
    if (!armed) return;
    const room = roomAfter(arr.chords, tick, arrangementTicks(arr));
    if (room <= 0) return;
    const id = newId();
    seq.update((a) => ({ ...a, chords: [...a.chords, { id, start: tick, duration: Math.min(lenTicks, room), rootName: armed.rootName, degrees: [...armed.degrees], label: armed.label }] }));
    setSelectedId(id);
  };

  const selected = arr.chords.find((c) => c.id === selectedId) ?? null;

  // Everything here lives on this device (draft, saved chords, samples), so the server has
  // nothing real to draw. Until the page is interactive and the draft is loaded, show a
  // loading state rather than an empty grid that ignores taps.
  if (!seq.ready)
    return (
      <AppShell>
        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
          <section className="panel p-6 text-sm text-muted-foreground" aria-busy="true" data-testid="sequencer-loading">
            Loading your sequencer…
          </section>
        </main>
      </AppShell>
    );

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4">
        <TransportBar
          arr={arr}
          playing={playing}
          canUndo={seq.canUndo}
          grid={grid}
          onGrid={setGrid}
          onPlay={() => void seq.play()}
          onStop={seq.stop}
          onUndo={seq.undo}
          onBpm={seq.setBpm}
          update={seq.update}
        />
        <ChordPalette palette={palette} armed={armed} onArm={arm} onAdd={(c) => setPalette((p) => [...p, c])} />
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">New chords ring for</span>
          {([["beat", "1 beat"], ["2beats", "2 beats"], ["bar", "1 bar"], ["2bars", "2 bars"]] as [NewLen, string][]).map(([k, l]) => (
            <Button key={k} size="sm" variant={newLen === k ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => setNewLen(k)}>{l}</Button>
          ))}
          <span className="text-muted-foreground">(shortened automatically if the next chord is closer)</span>
        </div>
        <ChordTimeline
          arr={arr}
          grid={grid}
          zoom={zoom}
          onZoom={setZoom}
          selectedId={selectedId}
          onSelect={setSelectedId}
          armedLabel={armed?.label ?? null}
          onPlace={place}
          onPreview={preview}
          playing={playing}
          currentChord={seq.currentChord}
          set={seq.set}
          update={seq.update}
          snapshot={seq.snapshot}
        />
        {selected ? (
          <ChordInspector arr={arr} chord={selected} grid={grid} armed={armed} update={seq.update} onSelect={setSelectedId} onPreview={preview} />
        ) : null}
        <DrumGrid arr={arr} playing={playing} set={seq.set} update={seq.update} snapshot={seq.snapshot} />
        <SequenceLibrary arr={arr} update={seq.update} onLoaded={() => setSelectedId(null)} />
      </main>
    </AppShell>
  );
}
