import { TAKE_LABELS, type ScoreLine } from "@/lib/listen/takes";
import { cn } from "@/lib/utils";

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");

/** How well the current thresholds agree with what the player says happened. */
export function Scorecard({ lines }: { lines: ScoreLine[] }) {
  const any = lines.some((l) => l.strums);
  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Scorecard">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Scorecard</h2>
        <span className="text-xs text-muted-foreground">Does Fretlab agree with what you played? Updates as you move the thresholds.</span>
      </div>
      {!any ? (
        <p className="text-sm text-muted-foreground">Record a few takes to see how the current thresholds do.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {lines.map((l) => {
            const name = TAKE_LABELS.find((t) => t.id === l.label)!.name;
            const judged = l.good + l.bad + l.maybe;
            const ok = l.label === "clean" ? l.bad === 0 : l.bad === 0 && l.maybe === 0;
            return (
              <div key={l.label} className={cn("rounded-lg border p-2.5 text-sm", !l.strums ? "border-border/60 opacity-60" : ok ? "border-extension/50 bg-extension/10" : "border-root/60 bg-root/10")} data-testid={`score-${l.label}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{l.takes} take{l.takes === 1 ? "" : "s"} · {l.strums} strum{l.strums === 1 ? "" : "s"}</span>
                  {l.strums ? <span className="ml-auto font-mono font-bold" data-testid="score-pct">{l.label === "clean" ? pct(l.good, l.good + l.bad) : pct(l.good, judged)}</span> : null}
                </div>
                {!l.strums ? (
                  <p className="text-xs text-muted-foreground">No takes yet.</p>
                ) : l.label === "clean" ? (
                  <p className="text-xs text-muted-foreground">
                    {l.good} came out clean · <b className={l.bad ? "text-foreground" : ""}>{l.bad} false alarm{l.bad === 1 ? "" : "s"}</b>
                    {l.bad ? ` (${Object.entries(l.why).map(([w, n]) => `${w} ×${n}`).join(", ")})` : ""}
                    {l.unsure ? ` · ${l.unsure} couldn't judge` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {l.good} caught · <b className={l.bad ? "text-foreground" : ""}>{l.bad} missed</b>
                    {l.maybe ? ` · ${l.maybe} only "maybe"` : ""}
                    {l.unsure ? ` · ${l.unsure} couldn't tell` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">
        Aim: <b>Clean</b> near 100% (no false alarms), mistakes caught as often as possible. If lowering a threshold to catch more mistakes starts flagging clean strums, the clean side wins — a wrong "you made a mistake" is worse than a missed one.
      </p>
    </section>
  );
}
