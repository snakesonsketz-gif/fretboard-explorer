import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rootHue } from "@/components/sequencer/shared";
import type { TargetChord } from "@/lib/listen/score";
import { loadPalette, type PaletteChord } from "@/lib/sequences";
import { CHORDS, ROOTS, pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";

/** "Chord to play": your saved chords, plus any root + chord type. Shared by Listen and Develop. */
export function ChordPicker({ target, onPick, disabled = false, testId = "listen-target" }: { target: TargetChord; onPick: (t: TargetChord) => void; disabled?: boolean; testId?: string }) {
  const [palette, setPalette] = useState<PaletteChord[]>([]);
  const [qRoot, setQRoot] = useState("C");
  const [qChord, setQChord] = useState("maj");
  useEffect(() => setPalette(loadPalette()), []);
  const pick = (c: PaletteChord | TargetChord) => onPick({ rootName: c.rootName, degrees: [...c.degrees], label: c.label });

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Chord to play</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md px-2.5 py-1.5 font-mono text-base font-black" style={{ background: `oklch(0.45 0.1 ${rootHue(target.rootName)})` }} data-testid={testId}>
          {pretty(target.label)}
        </span>
        {palette.map((c) => (
          <button key={c.key} type="button" disabled={disabled} onClick={() => pick(c)} className={cn("rounded-md border px-2 py-1 font-mono text-sm", c.label === target.label && c.rootName === target.rootName ? "border-primary" : "border-border hover:border-foreground/40")}>
            {pretty(c.label)}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Select value={qRoot} onValueChange={setQRoot} disabled={disabled}>
          <SelectTrigger className="h-8 w-20" aria-label="Root"><SelectValue /></SelectTrigger>
          <SelectContent>{ROOTS.map((r) => <SelectItem key={r.name} value={r.name}>{pretty(r.name)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={qChord} onValueChange={setQChord} disabled={disabled}>
          <SelectTrigger className="h-8 w-44" aria-label="Chord type"><SelectValue /></SelectTrigger>
          <SelectContent>{CHORDS.map((c) => <SelectItem key={c.id} value={c.id}>{pretty(`${qRoot}${c.suffix}`)} — {c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="secondary" className="h-8 gap-1" disabled={disabled} onClick={() => {
          const c = CHORDS.find((x) => x.id === qChord) ?? CHORDS[0]!;
          pick({ rootName: qRoot, degrees: c.degrees, label: `${qRoot}${c.suffix}` });
        }}>
          <Plus className="h-3.5 w-3.5" /> Use
        </Button>
      </div>
    </div>
  );
}
