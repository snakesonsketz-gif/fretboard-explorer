import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A note with its scale-degree label above it, like a tiny fretboard dot. */
export function NoteChip({ degree, note, accent }: { degree: string; note: string; accent?: boolean }) {
  return (
    <span className={cn("inline-flex min-w-9 flex-col items-center rounded-lg border px-1.5 py-0.5 leading-tight", accent ? "border-primary bg-primary/15" : "border-border bg-secondary/60")}>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{degree}</span>
      <span className="font-mono text-xs font-bold text-foreground">{note}</span>
    </span>
  );
}

/** A labelled fact: small caption over a bold value. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "gold" | "sky" | "default" }) {
  return (
    <div className={cn("rounded-lg border px-2 py-1", tone === "gold" ? "border-amber-400/50 bg-amber-400/10" : tone === "sky" ? "border-sky-500/40 bg-sky-500/10" : "border-border bg-secondary/40")}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xs font-bold text-foreground">{value}</div>
    </div>
  );
}

/** A numbered step card. */
export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-border/70 bg-secondary/30 p-2">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0">
        <div className="text-xs font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export interface MapPos {
  form: string;
  from: number;
  to: number;
}

/** The forms laid end to end along the neck, with the current one lit and tappable. */
export function CagedMap({ positions, current, onPick, maxFret }: { positions: MapPos[]; current: number; onPick: (i: number) => void; maxFret: number }) {
  const W = 300;
  const H = 46;
  const x = (f: number) => 4 + (Math.max(0, Math.min(maxFret, f)) / maxFret) * (W - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Shapes along the neck" data-testid="caged-map">
      <line x1={4} y1={H - 8} x2={W - 4} y2={H - 8} className="stroke-border" />
      {positions.map((p, i) => {
        const x1 = x(p.from);
        const x2 = x(p.to + 1);
        const row = i % 2 === 0 ? 4 : 18;
        const on = i === current;
        return (
          <g key={`${p.form}-${p.from}-${i}`} onClick={() => onPick(i)} className="cursor-pointer">
            <rect x={x1} y={row} width={Math.max(10, x2 - x1)} height={13} rx={4} className={on ? "fill-primary" : "fill-secondary stroke-border"} />
            <text x={(x1 + x2) / 2} y={row + 10} textAnchor="middle" className={cn("text-[9px] font-bold", on ? "fill-primary-foreground" : "fill-foreground")}>
              {p.form}
            </text>
          </g>
        );
      })}
      {[0, 3, 5, 7, 9, 12, 15, 17, 19, 21].filter((f) => f <= maxFret).map((f) => (
        <text key={f} x={x(f)} y={H - 1} textAnchor="middle" className="fill-muted-foreground text-[8px]">
          {f}
        </text>
      ))}
    </svg>
  );
}
