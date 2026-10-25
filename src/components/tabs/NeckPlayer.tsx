/**
 * The tab on a fretboard: the notes being played light up with their fret numbers, the next
 * notes show dashed so you can get ready, and the speed control slows it down to learn it.
 */
import { Pause, Play, Repeat } from "lucide-react";
import { Neck, type NeckDot } from "@/components/Neck";
import { cellText, type TabDoc } from "@/lib/tabs/model";
import { lineNames } from "@/lib/tabs/render";
import { cn } from "@/lib/utils";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25];

export function NeckPlayer({
  doc,
  at,
  playing,
  speed,
  setSpeed,
  loop,
  setLoop,
  onPlay,
}: {
  doc: TabDoc;
  /** Column to show: the one playing, else the selected one. */
  at: number | null;
  playing: boolean;
  speed: number;
  setSpeed: (v: number) => void;
  loop: boolean;
  setLoop: (v: boolean) => void;
  onPlay: () => void;
}) {
  const cols = doc.cols;
  const noteIdx = cols.map((c, i) => (c.kind === "notes" ? i : -1)).filter((i) => i >= 0);
  const cur = at !== null && cols[at]?.kind === "notes" ? at : at !== null ? (noteIdx.find((i) => i >= at) ?? null) : (noteIdx[0] ?? null);
  const next = cur !== null ? (noteIdx.find((i) => i > cur) ?? null) : null;
  const maxFret = Math.max(0, ...cols.flatMap((c) => c.cells.map((x) => (x && typeof x.fret === "number" ? x.fret : 0))));
  const to = Math.min(24, Math.max(12, maxFret + 1));
  const dots: NeckDot[] = [];
  const taken = new Set<string>();
  if (cur !== null)
    cols[cur]!.cells.forEach((x, s) => {
      if (!x || typeof x.fret !== "number") return;
      taken.add(`${s}-${x.fret}`);
      dots.push({ s, fret: x.fret, tone: "now", label: String(x.fret) });
    });
  if (next !== null)
    cols[next]!.cells.forEach((x, s) => {
      if (!x || typeof x.fret !== "number" || taken.has(`${s}-${x.fret}`)) return;
      dots.push({ s, fret: x.fret, tone: "next", label: String(x.fret) });
    });
  const bar = cur === null ? 0 : cols.slice(0, cur).filter((c) => c.kind === "bar").length + 1;
  const curCol = cur !== null ? cols[cur] : undefined;
  const techniques = curCol ? curCol.cells.filter((x) => x && cellText(x) !== String(x.fret)).map((x) => cellText(x!) + (x!.link ?? "")) : [];

  return (
    <div className="space-y-2" data-testid="neck-player">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onPlay} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow" aria-label={playing ? "Stop" : "Play"} data-testid="neck-play">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Speed">
          {SPEEDS.map((v) => (
            <button key={v} type="button" role="radio" aria-checked={Math.abs(speed - v) < 0.001} onClick={() => setSpeed(v)} className={cn("rounded px-2 py-1.5 font-semibold", Math.abs(speed - v) < 0.001 ? "bg-primary text-primary-foreground" : "text-muted-foreground")} data-testid={`speed-${v * 100}`}>
              {v * 100}%
            </button>
          ))}
        </div>
        <label className="flex min-w-[9rem] flex-1 items-center gap-2 text-xs text-muted-foreground">
          <input type="range" min={10} max={200} step={5} value={Math.round(speed * 100)} onChange={(e) => setSpeed(Number(e.target.value) / 100)} className="flex-1 accent-[var(--color-primary)]" aria-label="Speed in percent" data-testid="speed-slider" />
          <span className="w-24 text-right font-mono text-foreground">
            {Math.round(speed * 100)}% · {Math.round(doc.bpm * speed)} bpm
          </span>
        </label>
        <button type="button" onClick={() => setLoop(!loop)} aria-pressed={loop} className={cn("inline-flex h-9 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold", loop ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")} data-testid="loop">
          <Repeat className="h-4 w-4" /> Loop
        </button>
      </div>
      <Neck midis={doc.tuning.midis} names={doc.tuning.names} from={0} to={to} dots={dots} testId="player-neck" ariaLabel="The tab on the fretboard" />
      {/* the tab around the playhead, moving with it */}
      {cur !== null ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background/60 px-2 py-1.5 font-mono text-[13px] leading-[1.15]" data-testid="player-tab">
          <div className="flex items-stretch justify-center">
            <div className="flex flex-col pr-1 text-[11px] font-bold text-muted-foreground">
              {lineNames(doc.tuning.names).map((nm, r) => (
                <span key={r} className="h-[17px]">
                  {nm}
                </span>
              ))}
            </div>
            {cols.slice(Math.max(0, cur - 5), cur + 10).map((c, k) => {
              const i = Math.max(0, cur - 5) + k;
              const now = i === cur;
              return (
                <div key={c.id} className={cn("flex flex-col items-center px-1", now && "rounded bg-primary/25 text-primary", c.kind === "bar" && "px-0")}>
                  {[...c.cells].reverse().map((x, r) => (
                    <span key={r} className={cn("h-[17px] whitespace-pre", !x && "text-muted-foreground/50", now && x && "font-bold")}>
                      {c.kind === "bar" ? "|" : x ? cellText(x) + (x.link ?? "") : "-"}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {cur === null ? (
          "Nothing to show yet — write or load a tab."
        ) : (
          <>
            Bar {bar} · column {cur + 1} of {cols.length}
            {curCol?.chord ? <b className="text-foreground"> · {curCol.chord}</b> : null}
            {techniques.length ? <span className="font-mono text-primary"> · {techniques.join(" ")}</span> : null}
            <span> · lit = play now, dashed = next</span>
          </>
        )}
      </p>
    </div>
  );
}
