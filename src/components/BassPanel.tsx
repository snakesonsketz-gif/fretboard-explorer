import { NoteChip, Step } from "@/components/CagedVisuals";
import { BASS_JOBS, bassChoices } from "@/lib/bassView";
import type { Degree, Root } from "@/lib/theory";

/** Shown when a bass tuning is chosen: what the bass note does to the chord above it. */
export function BassPanel({ root, degrees, suffix, pretty, simple }: { root: Root; degrees: readonly Degree[]; suffix?: string | undefined; pretty: (s: string) => string; simple: (d: Degree) => string }) {
  const rows = bassChoices(root, degrees, suffix);
  return (
    <div className="space-y-2 rounded-md border border-border/70 p-2" data-testid="bass-panel">
      <div className="text-[11px] font-bold uppercase tracking-widest">Bass view: what the bass note does</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {BASS_JOBS.map((j) => (
          <div key={j.title} className="rounded-lg border border-border bg-secondary/40 p-1.5">
            <div className="text-xs font-bold">{j.title}</div>
            <div className="text-[10px] text-muted-foreground">{j.body}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground">Same chord on top, different note underneath. The bass decides the chord's weight:</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.degree} className="flex items-center gap-2 rounded-lg border border-border/70 p-1.5" data-testid="bass-choice">
            <NoteChip degree={pretty(simple(r.degree))} note={pretty(r.note)} accent={r.degree === "1"} />
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold">{pretty(r.name)}</div>
              <div className="text-[11px] text-muted-foreground">{r.effect}</div>
            </div>
          </div>
        ))}
      </div>
      <Step n={1} title="Frets are wider, notes are lower">Bass sounds an octave below the guitar's matching strings, so keep parts simple and rhythmic.</Step>
    </div>
  );
}
