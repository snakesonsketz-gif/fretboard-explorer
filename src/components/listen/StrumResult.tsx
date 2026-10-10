import { pretty } from "@/lib/theory";
import type { StrumReport, Verdict } from "@/lib/listen/score";
import { cn } from "@/lib/utils";
import { verdictClass, verdictText } from "./verdicts";

const dot: Record<Verdict, string> = { good: "bg-extension", fix: "bg-root", unsure: "bg-muted-foreground/50" };

const NOTE_STYLE: Record<string, string> = {
  heard: "bg-extension/80 text-background",
  missing: "bg-root text-root-foreground",
  faint: "bg-secondary text-muted-foreground ring-1 ring-border",
  hidden: "bg-secondary text-muted-foreground ring-1 ring-border",
  overtone: "bg-secondary text-muted-foreground ring-1 ring-border",
  "left-out": "bg-secondary text-muted-foreground",
};

function Tile({ title, verdict, score, children }: { title: string; verdict: Verdict; score?: string | null; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-3", verdictClass[verdict])} data-testid={`tile-${title.toLowerCase().replace(/\W+/g, "")}`} data-verdict={verdict}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot[verdict])} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
        <span className="ml-auto font-mono text-sm font-bold">{score ?? verdictText[verdict]}</span>
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function StrumResult({ report, label }: { report: StrumReport; label: string }) {
  const r = report;
  return (
    <div className="space-y-2" data-testid="strum-result">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Tile title="Accuracy" verdict={r.accuracy.verdict} score={r.accuracy.score === null ? null : `${r.accuracy.score}%`}>
          <p className="text-foreground">{r.accuracy.summary}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.accuracy.notes.map((n) => (
              <span key={n.degree} title={n.note} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold", NOTE_STYLE[n.status])}>
                {pretty(n.name)}
                {n.status === "missing" ? " ✕" : n.status === "heard" ? " ✓" : n.status === "left-out" ? " –" : " ?"}
              </span>
            ))}
            {r.accuracy.extras.map((e) => (
              <span key={e.name} title={e.status === "wrong" ? "Extra note — not in the chord" : "Maybe an extra note — too faint to be sure (not counted)"} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold", e.status === "wrong" ? "bg-third text-background" : "bg-secondary text-muted-foreground ring-1 ring-border")}>
                +{pretty(e.name)}{e.status === "maybe" ? "?" : ""}
              </span>
            ))}
          </div>
        </Tile>
        <Tile title="Clarity" verdict={r.clarity.verdict} score={r.clarity.score === null ? null : `${r.clarity.score}%`}>
          {r.clarity.summary}
        </Tile>
        <Tile title="Ring-out" verdict={r.ringOut.verdict} score={`${r.ringOut.seconds.toFixed(1)} s${r.ringOut.untilNext ? "+" : ""}`}>
          {r.ringOut.summary}
        </Tile>
        <Tile title="Timing" verdict={r.timing.verdict} score={r.timing.offsetMs === null ? null : `${r.timing.offsetMs >= 0 ? "+" : ""}${Math.round(r.timing.offsetMs)} ms`}>
          {r.timing.summary}
        </Tile>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {pretty(label)} · {Math.abs(r.tuningCents) >= 8 ? `guitar about ${Math.abs(Math.round(r.tuningCents))} cents ${r.tuningCents < 0 ? "flat" : "sharp"} · ` : "in tune · "}
        <span title="Hover a note for details">✓ heard · ✕ missing · ? couldn't tell (not counted) · – optional</span>
      </p>
    </div>
  );
}
