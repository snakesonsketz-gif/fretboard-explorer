import { useState } from "react";
import { ChevronDown, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StrumReport, Thresholds, Verdict } from "@/lib/listen/score";
import { TAKE_LABELS, verdictFor, type Take, type TakeLabel, type TakeStrum } from "@/lib/listen/takes";
import { pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";
import { StrumDetail } from "./StrumDetail";

const DOT: Record<Verdict, string> = { good: "bg-extension", fix: "bg-root", unsure: "bg-muted-foreground/40" };
const RESULT: Record<string, { text: string; cls: string }> = {
  good: { text: "✓", cls: "bg-extension/80 text-background" },
  bad: { text: "✕", cls: "bg-root text-root-foreground" },
  maybe: { text: "?", cls: "bg-secondary text-foreground ring-1 ring-border" },
  unsure: { text: "–", cls: "bg-secondary text-muted-foreground" },
};

export function TakeCard({ take, strums, reports, T, onPlay, onDelete, onRelabel }: {
  take: Take;
  strums: TakeStrum[] | undefined;
  reports: StrumReport[] | undefined;
  T: Thresholds;
  onPlay: (from?: number) => void;
  onDelete: () => void;
  onRelabel: (label: TakeLabel) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const secs = take.pcm.length / take.sampleRate;
  return (
    <article className="rounded-lg border border-border/70 bg-card/60 p-2.5" data-testid="take" data-label={take.label}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-secondary px-2 py-1 font-mono text-sm font-black">{pretty(take.target.label)}</span>
        <Select value={take.label} onValueChange={(v) => onRelabel(v as TakeLabel)}>
          <SelectTrigger className="h-8 w-36" aria-label="What was played"><SelectValue /></SelectTrigger>
          <SelectContent>{TAKE_LABELS.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {secs.toFixed(1)} s · {new Date(take.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          {take.source === "file" ? ` · ${take.fileName ?? "file"}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => onPlay()} aria-label="Play take"><Play className="h-3.5 w-3.5" /></Button>
          {confirm ? (
            <Button size="sm" variant="destructive" className="h-8 px-2 text-xs" onClick={onDelete}>Delete?</Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setConfirm(true)} onBlur={() => setConfirm(false)} aria-label="Delete take"><Trash2 className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      </div>
      {take.note ? <p className="mt-1 text-xs text-muted-foreground">“{take.note}”</p> : null}

      {!strums || !reports ? (
        <p className="mt-2 text-xs text-muted-foreground" aria-busy="true">Analysing…</p>
      ) : !strums.length ? (
        <p className="mt-2 text-xs text-muted-foreground">No strums found. Strum firmly, a second or more apart, with the phone close to the guitar.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {strums.map((s, i) => {
            const r = reports[i]!;
            const v = verdictFor(take.label, r);
            return (
              <li key={i} data-testid="take-strum" data-result={v.result}>
                <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                  className={cn("flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-secondary/60", open === i && "bg-secondary/60")}>
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded font-bold", RESULT[v.result]!.cls)} title={v.why}>{RESULT[v.result]!.text}</span>
                  <span className="w-12 font-mono text-muted-foreground">{s.time.toFixed(1)} s</span>
                  {([["A", r.accuracy.verdict], ["C", r.clarity.verdict], ["R", r.ringOut.verdict]] as [string, Verdict][]).map(([k, vd]) => (
                    <span key={k} className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground" title={{ A: "Accuracy", C: "Clarity", R: "Ring-out" }[k]}>
                      <span className={cn("h-2 w-2 rounded-full", DOT[vd])} />{k}
                    </span>
                  ))}
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.why ?? r.accuracy.summary}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open === i && "rotate-180")} />
                </button>
                {open === i ? (
                  <div className="mt-1 space-y-1.5 pl-1">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => onPlay(Math.max(0, s.time - 0.1))}><Play className="h-3 w-3" /> Hear this strum</Button>
                      <span className="text-[11px] text-muted-foreground">{r.accuracy.summary} {r.clarity.summary}</span>
                    </div>
                    <StrumDetail m={s.measure} r={r} target={take.target} T={T} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
