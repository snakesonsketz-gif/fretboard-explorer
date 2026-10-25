/**
 * A clean, tappable guitar neck (SVG) shared by the chord finder, the compare view and the tab
 * player. The thinnest string is on top, like tab. Dots can be coloured per layer (A / B / both),
 * show a note, degree or fret number, and the whole neck scrolls sideways on a phone.
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DotTone = "a" | "b" | "both" | "pick" | "now" | "next" | "faint" | "tone";

export interface NeckDot {
  /** String index, low → high. */
  s: number;
  fret: number;
  label?: string | undefined;
  tone: DotTone;
  /** A ring around the dot (the root). */
  ring?: boolean | undefined;
}

export const NECK_COLORS = { a: "#38bdf8", b: "#f472b6", both: "#a78bfa" };

const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE = [12, 24];

export interface NeckProps {
  midis: number[];
  names: string[];
  from?: number;
  to?: number;
  dots: NeckDot[];
  /** Strings marked as not played (an x by the nut). */
  muted?: number[] | undefined;
  onTap?: ((s: number, fret: number) => void) | undefined;
  /** Tap on a string's name (e.g. to mute it). */
  onName?: ((s: number) => void) | undefined;
  /** A highlighted band of frets (a position). */
  band?: { from: number; to: number } | null | undefined;
  className?: string | undefined;
  testId?: string | undefined;
  /** Extra SVG drawn over the neck. */
  children?: ReactNode;
  ariaLabel?: string | undefined;
}

export function Neck({ midis, names, from = 0, to = 15, dots, muted, onTap, onName, band, className, testId, children, ariaLabel }: NeckProps) {
  const uid = useId().replace(/:/g, "");
  const n = midis.length;
  const first = Math.max(1, from);
  const cols = to - first + 1;
  const nameW = 24;
  const openW = from === 0 ? 34 : 0;
  const fretW = 46;
  const gap = n > 6 ? 22 : 24;
  const top = 14;
  const H = top + (n - 1) * gap + 30;
  const W = nameW + openW + cols * fretW + 10;
  const x0 = nameW + openW;
  const y = (s: number) => top + (n - 1 - s) * gap;
  const fx = (f: number) => (f === 0 ? nameW + openW / 2 : x0 + (f - first + 0.5) * fretW);
  const shown = (f: number) => (f === 0 ? from === 0 : f >= first && f <= to);
  const midY = top + ((n - 1) * gap) / 2;

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-black/20", className)} data-testid={testId}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: `${Math.round(W * 0.82)}px` }} className="block w-full select-none" role="img" aria-label={ariaLabel ?? "Fretboard"}>
        <defs>
          <linearGradient id={`wood${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2617" />
            <stop offset="0.5" stopColor="#2c1c11" />
            <stop offset="1" stopColor="#21150c" />
          </linearGradient>
          <filter id={`glow${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.4" style={{ floodColor: "var(--color-primary)", floodOpacity: 0.9 }} />
          </filter>
        </defs>
        {/* fretboard */}
        <rect x={x0} y={top - 9} width={cols * fretW} height={(n - 1) * gap + 18} fill={`url(#wood${uid})`} rx={3} />
        {band ? (
          <rect x={x0 + (Math.max(first, band.from) - first) * fretW} y={top - 9} width={Math.max(0, Math.min(to, band.to) - Math.max(first, band.from) + 1) * fretW} height={(n - 1) * gap + 18} fill="var(--color-primary)" opacity={0.1} />
        ) : null}
        {/* inlays */}
        {Array.from({ length: cols }, (_, k) => first + k).map((f) =>
          INLAYS.includes(f) ? (
            <circle key={f} cx={fx(f)} cy={midY} r={4.5} fill="#e9dcc0" opacity={0.35} />
          ) : DOUBLE.includes(f) ? (
            <g key={f} opacity={0.35}>
              <circle cx={fx(f)} cy={midY - gap} r={4.5} fill="#e9dcc0" />
              <circle cx={fx(f)} cy={midY + gap} r={4.5} fill="#e9dcc0" />
            </g>
          ) : null,
        )}
        {/* frets (the nut is thick) */}
        {Array.from({ length: cols + 1 }, (_, k) => (
          <rect key={k} x={x0 + k * fretW - (k === 0 && from <= 1 ? 2.5 : 1)} y={top - 9} width={k === 0 && from <= 1 ? 5 : 2} height={(n - 1) * gap + 18} fill={k === 0 && from <= 1 ? "#e8e1cf" : "#9aa1a9"} />
        ))}
        {/* strings */}
        {midis.map((_, s) => (
          <line key={s} x1={nameW + 2} x2={W - 6} y1={y(s)} y2={y(s)} stroke="#d9d3c3" strokeWidth={0.8 + (1 - s / Math.max(1, n - 1)) * 1.6} opacity={muted?.includes(s) ? 0.3 : 0.85} />
        ))}
        {/* fret numbers */}
        {Array.from({ length: cols }, (_, k) => first + k).map((f) => (
          <text key={f} x={fx(f)} y={H - 6} textAnchor="middle" fontSize={10} fill={INLAYS.includes(f) || DOUBLE.includes(f) ? "var(--color-foreground)" : "var(--color-muted-foreground)"} fontWeight={INLAYS.includes(f) || DOUBLE.includes(f) ? 700 : 400}>
            {f}
          </text>
        ))}
        {from === 0 ? (
          <text x={fx(0)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">
            open
          </text>
        ) : null}
        {/* string names (tap to mute when wired) */}
        {names.map((nm, s) => (
          <g key={s} onClick={onName ? () => onName(s) : undefined} style={onName ? { cursor: "pointer" } : undefined}>
            <rect x={0} y={y(s) - gap / 2} width={nameW} height={gap} fill="transparent" />
            <text x={nameW / 2} y={y(s) + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={muted?.includes(s) ? 12 : 10.5} fontWeight={700} fill={muted?.includes(s) ? "var(--color-third)" : "var(--color-muted-foreground)"}>
              {muted?.includes(s) ? "×" : nm}
            </text>
          </g>
        ))}
        {/* tap targets */}
        {onTap
          ? midis.map((_, s) =>
              [...(from === 0 ? [0] : []), ...Array.from({ length: cols }, (_, k) => first + k)].map((f) => (
                <rect
                  key={`${s}-${f}`}
                  x={f === 0 ? nameW : x0 + (f - first) * fretW}
                  y={y(s) - gap / 2}
                  width={f === 0 ? openW : fretW}
                  height={gap}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onClick={() => onTap(s, f)}
                  data-testid={`neck-${s}-${f}`}
                />
              )),
            )
          : null}
        {/* dots */}
        {dots
          .filter((d) => shown(d.fret) && d.s >= 0 && d.s < n)
          .map((d, i) => (
            <Dot key={`${d.s}-${d.fret}-${d.tone}-${i}`} d={d} cx={fx(d.fret)} cy={y(d.s)} r={Math.min(10.5, gap * 0.44)} glow={`glow${uid}`} />
          ))}
        {children}
      </svg>
    </div>
  );
}

function Dot({ d, cx, cy, r, glow }: { d: NeckDot; cx: number; cy: number; r: number; glow: string }) {
  const text = d.label ? (
    <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={d.label.length > 2 ? 7.5 : 9} fontWeight={800} fill={d.tone === "faint" || d.tone === "next" ? "var(--color-foreground)" : "#0b0f14"} pointerEvents="none">
      {d.label}
    </text>
  ) : null;
  const ring = d.ring ? <circle cx={cx} cy={cy} r={r + 2.6} fill="none" stroke="#fff" strokeWidth={1.8} pointerEvents="none" /> : null;
  if (d.tone === "both")
    return (
      <g pointerEvents="none">
        {ring}
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`} fill={NECK_COLORS.a} />
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill={NECK_COLORS.b} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0b0f14" strokeOpacity={0.35} />
        {text}
      </g>
    );
  const fill =
    d.tone === "a" ? NECK_COLORS.a : d.tone === "b" ? NECK_COLORS.b : d.tone === "pick" || d.tone === "now" ? "var(--color-primary)" : d.tone === "tone" ? "#e5e7eb" : d.tone === "next" ? "transparent" : "#6b7280";
  return (
    <g pointerEvents="none" filter={d.tone === "now" ? `url(#${glow})` : undefined}>
      {ring}
      <circle
        cx={cx}
        cy={cy}
        r={d.tone === "faint" ? r * 0.62 : r}
        fill={fill}
        stroke={d.tone === "next" ? "var(--color-primary)" : "#0b0f14"}
        strokeOpacity={d.tone === "next" ? 0.8 : 0.35}
        strokeWidth={d.tone === "next" ? 1.6 : 1}
        strokeDasharray={d.tone === "next" ? "3 2" : undefined}
        opacity={d.tone === "faint" ? 0.75 : 1}
      />
      {d.tone === "faint" ? null : text}
    </g>
  );
}
