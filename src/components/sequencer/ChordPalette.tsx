import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHORDS, ROOTS, pretty } from "@/lib/theory";
import { rootHue } from "./shared";
import type { PaletteChord } from "@/lib/sequences";
import { cn } from "@/lib/utils";

interface Props {
  palette: PaletteChord[];
  armed: PaletteChord | null;
  onArm: (c: PaletteChord | null) => void;
  onAdd: (c: PaletteChord) => void;
}

export function ChordPalette({ palette, armed, onArm, onAdd }: Props) {
  const [root, setRoot] = useState("C");
  const [chordId, setChordId] = useState("maj");
  const groups: [string, PaletteChord[]][] = [
    ["Saved on Explore", palette.filter((p) => p.source === "saved")],
    ["From your songs", palette.filter((p) => p.source === "song")],
    ["Added here", palette.filter((p) => p.source === "added")],
  ];
  const add = () => {
    const c = CHORDS.find((x) => x.id === chordId) ?? CHORDS[0]!;
    const pc: PaletteChord = { key: `${root}|${chordId}|${Date.now()}`, rootName: root, degrees: [...c.degrees], label: `${root}${c.suffix}`, source: "added" };
    onAdd(pc);
    onArm(pc);
  };

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Your chords">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Your chords</h2>
        <p className="text-xs text-muted-foreground">
          {armed ? (
            <>
              Tap the timeline to place <span className="font-semibold text-foreground">{pretty(armed.label)}</span>
              <button type="button" className="ml-2 text-primary underline-offset-2 hover:underline" onClick={() => onArm(null)}>done</button>
            </>
          ) : (
            "Pick a chord, then tap the timeline to place it."
          )}
        </p>
      </div>

      {groups.map(([title, items]) =>
        items.length ? (
          <div key={title} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onArm(armed?.key === c.key ? null : c)}
                  aria-pressed={armed?.key === c.key}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 font-mono text-sm font-semibold transition-colors",
                    armed?.key === c.key ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-border",
                  )}
                  style={{ background: `oklch(0.42 0.09 ${rootHue(c.rootName)})` }}
                >
                  {pretty(c.label)}
                </button>
              ))}
            </div>
          </div>
        ) : null,
      )}
      {!palette.some((p) => p.source === "saved") ? (
        <p className="text-xs text-muted-foreground">
          Chords you <span className="text-foreground">Save</span> on the{" "}
          <Link to="/" className="text-primary underline-offset-2 hover:underline">Explore</Link> tab show up here.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Quick add</span>
        <Select value={root} onValueChange={setRoot}>
          <SelectTrigger className="h-8 w-20" aria-label="Root"><SelectValue /></SelectTrigger>
          <SelectContent>{ROOTS.map((r) => <SelectItem key={r.name} value={r.name}>{pretty(r.name)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={chordId} onValueChange={setChordId}>
          <SelectTrigger className="h-8 w-48" aria-label="Chord type"><SelectValue /></SelectTrigger>
          <SelectContent>{CHORDS.map((c) => <SelectItem key={c.id} value={c.id}>{pretty(`${root}${c.suffix}`)} — {c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1" onClick={add}><Plus className="h-4 w-4" /> Add</Button>
      </div>
    </section>
  );
}
