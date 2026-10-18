/**
 * Drawing kit for the Luthier diagrams.
 *
 * A diagram is one drawing shown as a series of step pictures: each step shows only that step's
 * labels, arrows and marker, and lights up the parts it's about while the rest fades back. Readers
 * page through the steps one at a time, or see every step's picture laid out as a storyboard.
 *
 * Any annotation can belong to a step with `n` (a step number or a list of them); without `n` it
 * shows in every step. `Hl` lights its children up in its step(s) and fades them in the others.
 */
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, LayoutList, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

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

/* ------------------------------------------------------------------ step context */

export type StepTag = number | readonly number[];
type Ctx = { step: number | null; glow: string; layer: SVGGElement | null; width: number };
const StepCtx = createContext<Ctx>({ step: null, glow: "", layer: null, width: 360 });
export const useStep = () => useContext(StepCtx).step;
const matches = (step: number | null, n: StepTag | undefined) => n === undefined || step === null || (typeof n === "number" ? n === step : n.includes(step));
/** Is something tagged `n` visible in the current picture? */
export const useShown = (n: StepTag | undefined) => matches(useStep(), n);

/** Shows its children only in the given step(s) (and in the all-steps view). */
export function At({ n, children }: { n: StepTag; children: ReactNode }) {
  return useShown(n) ? <>{children}</> : null;
}

/** Draws its children on the top layer of the picture, above every part of the drawing. */
function OnTop({ children }: { children: ReactNode }) {
  const { layer } = useContext(StepCtx);
  return layer ? createPortal(children, layer) : null;
}

/** Keeps a box of the given width inside the picture's edges. */
function useClamp() {
  const { width } = useContext(StepCtx);
  return (x0: number, w: number) => Math.max(3, Math.min(width - 3 - w, x0));
}

/** Text outline in the card colour so labels stay readable over the drawing. */
export const HALO = { stroke: "var(--color-card)", strokeWidth: 3, strokeLinejoin: "round", paintOrder: "stroke" } as const;

/** Lights its children up in the given step(s); fades them back in the other steps. */
export function Hl({ n, children, dim = 0.28, glow: withGlow = true }: { n: StepTag; children: ReactNode; dim?: number; glow?: boolean }) {
  const { step, glow } = useContext(StepCtx);
  if (step === null) return <>{children}</>;
  const on = matches(step, n);
  return (
    <g opacity={on ? 1 : dim} filter={on && withGlow ? `url(#${glow})` : undefined}>
      {children}
    </g>
  );
}

const MODE_KEY = "fretlab.luthier.figmode.v1";
type Mode = "steps" | "all";
function loadMode(): Mode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "all" ? "all" : "steps";
  } catch {
    return "steps";
  }
}

/**
 * A diagram with its title and numbered instructions. Step by step: one picture per instruction,
 * with Back/Next. All at once: the full picture and the whole numbered list.
 */
export function Figure({ title, children, how, note, viewBox = "0 0 360 200", testId }: { title: string; children: ReactNode; how: ReactNode[]; note?: ReactNode; viewBox?: string; testId?: string }) {
  const glow = `glow${useId().replace(/:/g, "")}`;
  const [mode, setMode] = useState<Mode>("steps");
  const [i, setI] = useState(0);
  useEffect(() => setMode(loadMode()), []);
  const pick = (m: Mode) => {
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {
      /* storage unavailable */
    }
  };
  const step = mode === "steps" ? i + 1 : null;
  const last = how.length - 1;

  return (
    <figure className="space-y-2 rounded-xl border border-border bg-background/40 p-3" data-testid={testId ?? "luthier-diagram"} data-mode={mode}>
      <div className="flex items-start gap-2">
        <figcaption className="flex-1 font-display text-sm font-bold leading-snug">{title}</figcaption>
        <div className="inline-flex shrink-0 rounded-md bg-secondary/60 p-0.5" role="radiogroup" aria-label="Picture view">
          <button type="button" role="radio" aria-checked={mode === "steps"} onClick={() => pick("steps")} className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold", mode === "steps" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} title="One step at a time">
            <ListOrdered className="h-3 w-3" /> Steps
          </button>
          <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => pick("all")} className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold", mode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} title="Everything at once">
            <LayoutList className="h-3 w-3" /> All
          </button>
        </div>
      </div>

      {mode === "steps" ? (
        <div className="space-y-2">
          <Picture step={step!} glow={glow} viewBox={viewBox} title={title}>
            {children}
          </Picture>
          <div className="flex gap-2.5 rounded-lg bg-secondary/40 p-2.5" data-testid="luthier-diagram-step">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Step {i + 1} of {how.length}
              </p>
              <p className="text-[13px] leading-snug text-foreground">{how[i]}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Previous step" data-testid="luthier-step-prev">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex gap-1.5" role="tablist" aria-label="Steps">
              {how.map((_, k) => (
                <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Step ${k + 1}`} onClick={() => setI(k)} className={cn("h-2.5 rounded-full transition-all", k === i ? "w-6 bg-primary" : "w-2.5 bg-border hover:bg-primary/50")} />
              ))}
            </div>
            <button type="button" onClick={() => setI((v) => Math.min(last, v + 1))} disabled={i === last} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:text-foreground disabled:opacity-30" aria-label="Next step" data-testid="luthier-step-next">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="@container">
          <ol className="grid gap-3 @lg:grid-cols-2" data-testid="luthier-storyboard">
            {how.map((h, k) => (
              <li key={k} className="space-y-1.5">
                <Picture step={k + 1} glow={`${glow}s${k}`} viewBox={viewBox} title={title}>
                  {children}
                </Picture>
                <div className="flex gap-2 text-[12px] leading-snug">
                  <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{k + 1}</span>
                  <span className="text-muted-foreground">{h}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {note ? <div className="rounded-md bg-secondary/50 px-2 py-1.5 text-xs text-muted-foreground">{note}</div> : null}
    </figure>
  );
}

/** One step's picture: the drawing rendered with that step's labels and highlights. */
function Picture({ step, glow, viewBox, title, children }: { step: number; glow: string; viewBox: string; title: string; children: ReactNode }) {
  const [layer, setLayer] = useState<SVGGElement | null>(null);
  const width = Number(viewBox.split(/\s+/)[2]) || 360;
  return (
    <StepCtx.Provider value={{ step, glow, layer, width }}>
      <svg viewBox={viewBox} className="w-full rounded-lg bg-black/10" role="img" aria-label={`${title} — step ${step}`} style={{ fontFamily: "var(--font-sans)" }} data-step={step}>
        <defs>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.6" style={{ floodColor: "var(--color-primary)", floodOpacity: 0.65 }} />
          </filter>
        </defs>
        {children}
        <g ref={setLayer} />
      </svg>
    </StepCtx.Provider>
  );
}

/* ------------------------------------------------------------------ pieces */

/** Numbered marker for step n: in the step view only the current step's marker shows, with a halo. */
export function N({ n, x, y }: { n: number; x: number; y: number }) {
  const step = useStep();
  if (step !== null && step !== n) return null;
  return (
    <OnTop>
      {step === n ? <circle cx={x} cy={y} r={13} fill="none" stroke={C.accent} strokeWidth={1.5} opacity={0.6} /> : null}
      <circle cx={x} cy={y} r={step === n ? 9.5 : 8} fill={C.accent} />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={step === n ? 11 : 10} fontWeight={700} fill="var(--color-primary-foreground)">
        {n}
      </text>
    </OnTop>
  );
}

export function T({ x, y, children, anchor = "start", size = 10, color = C.dim, weight = 400, n, halo = true }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; size?: number; color?: string; weight?: number; n?: StepTag; halo?: boolean }) {
  if (!useShown(n)) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontWeight={weight} dominantBaseline="middle" {...(halo ? HALO : {})}>
      {children}
    </text>
  );
}

/** A labelled callout box for a step: a short, bold instruction written right on the picture. */
export function Tag({ x, y, children, n, anchor = "start", color = C.accent, w }: { x: number; y: number; children: string; n?: StepTag; anchor?: "start" | "middle" | "end"; color?: string; w?: number }) {
  const clamp = useClamp();
  if (!useShown(n)) return null;
  const width = w ?? children.length * 5.4 + 12;
  const x0 = clamp(anchor === "start" ? x : anchor === "middle" ? x - width / 2 : x - width, width);
  return (
    <OnTop>
      <rect x={x0} y={y - 9} width={width} height={18} rx={5} fill="color-mix(in oklab, var(--color-card) 88%, transparent)" stroke={color} strokeWidth={1} />
      <text x={x0 + width / 2} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fontWeight={700} fill={color}>
        {children}
      </text>
    </OnTop>
  );
}

/** Straight arrow (one head at x2,y2, or both ends with `both`). */
export function Arrow({ x1, y1, x2, y2, color = C.accent, both = false, w = 1.6, n }: { x1: number; y1: number; x2: number; y2: number; color?: string; both?: boolean; w?: number; n?: StepTag }) {
  const id = `ah${useId().replace(/:/g, "")}`;
  if (!useShown(n)) return null;
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
export function Turn({ cx, cy, r = 12, cw = true, color = C.accent, n }: { cx: number; cy: number; r?: number; cw?: boolean; color?: string; n?: StepTag }) {
  const id = `tr${useId().replace(/:/g, "")}`;
  if (!useShown(n)) return null;
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
export function Gap({ x, y1, y2, label, side = "right", color = C.accent, n }: { x: number; y1: number; y2: number; label?: string; side?: "left" | "right"; color?: string; n?: StepTag }) {
  if (!useShown(n)) return null;
  const tx = side === "right" ? x + 8 : x - 8;
  return (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={color} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={color} strokeWidth={1.2} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1.2} />
      {label ? (
        <text x={tx} y={(y1 + y2) / 2} textAnchor={side === "right" ? "start" : "end"} fontSize={10} fill={color} fontWeight={700} dominantBaseline="middle" {...HALO}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

/** A magnified detail circle: draws `children` scaled up around (cx, cy) inside a round window at (x, y). */
export function Zoom({ x, y, r, cx, cy, scale = 3, n, label, labelAt = "below", children }: { x: number; y: number; r: number; cx: number; cy: number; scale?: number; n?: StepTag; label?: string; labelAt?: "above" | "below"; children: ReactNode }) {
  const id = `zm${useId().replace(/:/g, "")}`;
  const clamp = useClamp();
  if (!useShown(n)) return null;
  const lw = (label?.length ?? 0) * 5;
  const lx = clamp(x - lw / 2, lw) + lw / 2;
  return (
    <OnTop>
      <defs>
        <clipPath id={id}>
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>
      <line x1={cx} y1={cy} x2={x - (r * (x - cx)) / Math.hypot(x - cx, y - cy)} y2={y - (r * (y - cy)) / Math.hypot(x - cx, y - cy)} stroke={C.accent} strokeWidth={1} strokeDasharray="3 2" />
      <circle cx={cx} cy={cy} r={r / scale} fill="none" stroke={C.accent} strokeWidth={1} />
      <circle cx={x} cy={y} r={r} fill="var(--color-card)" />
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(${x} ${y}) scale(${scale}) translate(${-cx} ${-cy})`}>{children}</g>
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.accent} strokeWidth={1.5} />
      {label ? (
        <text x={lx} y={labelAt === "below" ? y + r + 10 : y - r - 9} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.accent} dominantBaseline="middle" {...HALO}>
          {label}
        </text>
      ) : null}
    </OnTop>
  );
}

/** Frets drawn on a side-view fretboard from x0 with spacing shrinking like a real neck. */
export function fretXs(x0: number, x1: number, count: number) {
  const scale = (x1 - x0) / (1 - 2 ** (-count / 12));
  return Array.from({ length: count + 1 }, (_, i) => x0 + scale * (1 - 2 ** (-i / 12)));
}
