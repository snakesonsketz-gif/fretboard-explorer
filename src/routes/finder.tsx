import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitCompareArrows, ScanSearch } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChordFinder } from "@/components/finder/ChordFinder";
import { Compare } from "@/components/finder/Compare";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finder")({
  head: () => ({ meta: [{ title: "Chord finder & compare — Fretlab" }] }),
  component: FinderPage,
});

type Tool = "finder" | "compare";
const KEY = "fretlab.finder.tool.v1";

/** Two tools: name any chord shape you fret, and compare two chords, scales or arpeggios. */
export function FinderPage() {
  const [tool, setTool] = useState<Tool>("finder");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "compare") setTool("compare");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const pick = (t: Tool) => {
    setTool(t);
    try {
      window.localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 sm:px-4" data-testid="finder-page">
        <div className="flex gap-1 rounded-lg bg-secondary/60 p-1" role="tablist" aria-label="Tools">
          {(
            [
              ["finder", "Chord finder", ScanSearch, "Tap frets, get the chord names"],
              ["compare", "Compare", GitCompareArrows, "Two chords, scales or arpeggios"],
            ] as const
          ).map(([id, label, Icon, sub]) => (
            <button key={id} type="button" role="tab" aria-selected={tool === id} onClick={() => pick(id)} className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-left transition-colors", tool === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} data-testid={`tool-${id}`}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{label}</span>
                <span className={cn("hidden text-[11px] leading-tight sm:block", tool === id ? "text-primary-foreground/80" : "text-muted-foreground")}>{sub}</span>
              </span>
            </button>
          ))}
        </div>
        <section className="panel p-3 sm:p-4">{tool === "finder" ? <ChordFinder /> : <Compare />}</section>
      </main>
    </AppShell>
  );
}
