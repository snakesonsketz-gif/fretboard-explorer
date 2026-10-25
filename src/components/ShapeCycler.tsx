/**
 * Arrows above the fretboard that step through every way to play what's selected: each chord
 * shape on the neck, or each scale / arpeggio pattern. Playable ones come first, big stretches
 * next, and shapes no human hand can hold last. "Whole neck" (before the first) shows everything.
 */
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVEL_NAME, type VoicingLevel } from "@/lib/voicings";
import { cn } from "@/lib/utils";

export interface CyclerItem {
  /** Main label: "x32010" or "E shape · frets 7–12". */
  label: string;
  /** Smaller line under it. */
  detail?: string | undefined;
  /** Finger placement line (chords). */
  fingers?: string | undefined;
  /** An extra explanation line (e.g. the inversion and how the note order changed). */
  note?: string | undefined;
  level: VoicingLevel;
}

export const LEVEL_STYLE: Record<VoicingLevel, string> = {
  known: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  stretch: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  impossible: "bg-red-500/15 text-red-300 border-red-500/50",
};

export function ShapeCycler({
  what,
  levels,
  describe,
  index,
  onChange,
  onPlay,
}: {
  /** "shape" / "pattern" — used in the labels. */
  what: string;
  /** The level of every item, in order (playable first, impossible last). */
  levels: VoicingLevel[];
  /** Describes one item — only called for the one on show. */
  describe: (i: number) => CyclerItem;
  /** null = whole neck (nothing picked). */
  index: number | null;
  onChange: (i: number | null) => void;
  onPlay?: (() => void) | undefined;
}) {
  const n = levels.length;
  const cur = index !== null && index < n ? describe(index) : undefined;
  // Step order: whole neck → 1 → … → n → whole neck.
  const step = (d: 1 | -1) => {
    if (!n) return;
    if (index === null) onChange(d === 1 ? 0 : n - 1);
    else {
      const next = index + d;
      onChange(next < 0 || next >= n ? null : next);
    }
  };
  const counts = { known: 0, easy: 0, stretch: 0, impossible: 0 } as Record<VoicingLevel, number>;
  for (const l of levels) counts[l]++;
  const first = (l: VoicingLevel) => levels.indexOf(l);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/30 p-1.5"
      data-testid="shape-cycler"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        }
      }}
    >
      <Button size="icon" variant="secondary" className="h-10 w-10 shrink-0" aria-label={`Previous ${what}`} disabled={!n} onClick={() => step(-1)} data-testid="cycler-prev">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        {cur ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-base font-bold" data-testid="cycler-label">
                {cur.label}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", LEVEL_STYLE[cur.level])} data-testid="cycler-level">
                {LEVEL_NAME[cur.level]}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              <span data-testid="cycler-pos">
                {index! + 1} of {n}
              </span>
              {cur.detail ? ` · ${cur.detail}` : ""}
            </div>
            {cur.fingers ? (
              <div className="mt-0.5 font-mono text-xs font-semibold text-foreground" data-testid="cycler-fingers">
                {cur.fingers}
              </div>
            ) : null}
            {cur.fingers ? (
              <div className="text-[10px] text-muted-foreground">1 index · 2 middle · 3 ring · 4 pinky · 0 open · x not played</div>
            ) : null}
            {cur.note ? (
              <div className="mt-0.5 text-[11px] text-foreground/85" data-testid="cycler-note">
                {cur.note}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="text-sm font-semibold">Whole neck</div>
            <div className="text-[11px] text-muted-foreground" data-testid="cycler-pos">
              {n ? `Use the arrows to step through all ${n} ways to play it` : `No ${what}s found`}
            </div>
          </>
        )}
      </div>
      {onPlay && cur ? (
        <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label={`Hear this ${what}`} onClick={onPlay}>
          <Volume2 className="h-4 w-4" />
        </Button>
      ) : null}
      <Button size="icon" variant="secondary" className="h-10 w-10 shrink-0" aria-label={`Next ${what}`} disabled={!n} onClick={() => step(1)} data-testid="cycler-next">
        <ChevronRight className="h-5 w-5" />
      </Button>
      {n ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-1 text-[11px]">
          {(["known", "easy", "stretch", "impossible"] as const).map((l) =>
            counts[l] ? (
              <button
                key={l}
                type="button"
                onClick={() => onChange(first(l))}
                className={cn("rounded-full border px-2 py-0.5 font-semibold", LEVEL_STYLE[l], cur?.level === l && "ring-1 ring-current")}
                data-testid={`cycler-jump-${l}`}
              >
                {LEVEL_NAME[l]} {counts[l]}
              </button>
            ) : null,
          )}
          {cur ? (
            <button type="button" onClick={() => onChange(null)} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">
              Whole neck
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
