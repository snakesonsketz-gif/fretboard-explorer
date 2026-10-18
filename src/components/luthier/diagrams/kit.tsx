/**
 * Drawing kit for the Luthier diagrams: a figure frame with numbered how-to steps, and small SVG
 * pieces (numbered callouts, labels, arrows, dimension lines) that keep every diagram consistent.
 * Colours come from the theme so the diagrams match the app.
 */
import { useId, type ReactNode } from "react";

export const C = {
  ink: "var(--color-foreground)",
  dim: "var(--color-muted-foreground)",
  line: "color-mix(in oklab, var(--color-foreground) 55%, transparent)",
  faint: "color-mix(in oklab, var(--color-foreground) 18%, transparent)",
  wood: "color-mix(in oklab, #b07a45 70%, var(--color-card))",
  woodDark: "color-mix(in oklab, #6b4426 75%, var(--color-card))",
  metal: "#c9cdd3",
  string: "#e9e2cf",
  accent: "var(--color-primary)",
  good: "var(--color-extension)",
  bad: "var(--color-third)",
  card: "var(--color-card)",
};

/** A diagram with its title, the picture, and numbered steps matching the numbers in the picture. */
export function Figure({ title, children, how, note, viewBox = "0 0 360 200", testId }: { title: string; children: ReactNode; how: ReactNode[]; note?: ReactNode; viewBox?: string; testId?: string }) {
  return (
    <figure className="space-y-2 rounded-xl border border-border bg-background/40 p-3" data-testid={testId ?? "luthier-diagram"}>
      <figcaption className="font-display text-sm font-bold">{title}</figcaption>
      <svg viewBox={viewBox} className="w-full" role="img" aria-label={title} style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </svg>
      <ol className="space-y-1 text-[13px] leading-snug">
        {how.map((h, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
            <span className="text-muted-foreground">{h}</span>
          </li>
        ))}
      </ol>
      {note ? <p className="rounded-md bg-secondary/50 px-2 py-1.5 text-xs text-muted-foreground">{note}</p> : null}
    </figure>
  );
}

/** Numbered marker matching the how-to list. */
export const N = ({ n, x, y }: { n: number; x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r={8} fill={C.accent} />
    <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="var(--color-primary-foreground)">
      {n}
    </text>
  </g>
);

export const T = ({ x, y, children, anchor = "start", size = 10, color = C.dim, weight = 400 }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; size?: number; color?: string; weight?: number }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontWeight={weight} dominantBaseline="middle">
    {children}
  </text>
);

/** Straight arrow (one head at x2,y2, or both ends with `both`). */
export function Arrow({ x1, y1, x2, y2, color = C.accent, both = false, w = 1.6 }: { x1: number; y1: number; x2: number; y2: number; color?: string; both?: boolean; w?: number }) {
  const id = `ah${useId().replace(/:/g, "")}`;
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} markerEnd={`url(#${id})`} markerStart={both ? `url(#${id})` : undefined} />
    </g>
  );
}

/** Curved "turn this way" arrow around a centre: clockwise if cw. */
export function Turn({ cx, cy, r = 12, cw = true, color = C.accent }: { cx: number; cy: number; r?: number; cw?: boolean; color?: string }) {
  const id = `tr${useId().replace(/:/g, "")}`;
  const a0 = cw ? -150 : -30;
  const a1 = cw ? 120 : -300;
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)] as const;
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={color} />
        </marker>
      </defs>
      <path d={`M ${x0} ${y0} A ${r} ${r} 0 1 ${cw ? 1 : 0} ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={1.8} markerEnd={`url(#${id})`} />
    </g>
  );
}

/** Small dimension bracket: a measured gap between y1 and y2 at x. */
export function Gap({ x, y1, y2, label, side = "right", color = C.accent }: { x: number; y1: number; y2: number; label?: string; side?: "left" | "right"; color?: string }) {
  const tx = side === "right" ? x + 8 : x - 8;
  return (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={color} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={color} strokeWidth={1.2} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1.2} />
      {label ? (
        <T x={tx} y={(y1 + y2) / 2} anchor={side === "right" ? "start" : "end"} color={color} weight={700}>
          {label}
        </T>
      ) : null}
    </g>
  );
}

/** Frets drawn on a side-view fretboard from x0 with spacing shrinking like a real neck. */
export function fretXs(x0: number, x1: number, count: number) {
  const scale = (x1 - x0) / (1 - 2 ** (-count / 12));
  return Array.from({ length: count + 1 }, (_, i) => x0 + scale * (1 - 2 ** (-i / 12)));
}
