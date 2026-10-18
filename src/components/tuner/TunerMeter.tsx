import { zoneOf, IN_TUNE_CENTS } from "@/lib/tuner/tracker";
import { cn } from "@/lib/utils";

const RANGE = 50; // cents each side
const SWEEP = 62; // degrees each side

const angle = (cents: number) => (Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE) * SWEEP;
const pt = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [120 + r * Math.cos(a), 128 + r * Math.sin(a)] as const;
};
function arc(from: number, to: number, r: number) {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

/** Needle gauge, −50 to +50 cents, with the in-tune band in the middle. */
export function TunerMeter({ cents, active }: { cents: number | null; active: boolean }) {
  const zone = cents === null ? null : zoneOf(cents);
  const color = zone === "in-tune" ? "var(--color-extension)" : zone === "close" ? "var(--color-primary)" : zone === "off" ? "var(--color-third)" : "var(--color-muted-foreground)";
  const deg = cents === null ? 0 : angle(cents);
  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-md" role="img" aria-label={cents === null ? "Tuning meter, no note" : `Tuning meter: ${Math.round(cents)} cents`} data-testid="tuner-meter">
      <path d={arc(-SWEEP, SWEEP, 100)} fill="none" stroke="var(--color-border)" strokeWidth="14" strokeLinecap="round" />
      <path d={arc(-angle(10), angle(10), 100)} fill="none" stroke="color-mix(in oklab, var(--color-primary) 45%, transparent)" strokeWidth="14" />
      <path d={arc(-angle(IN_TUNE_CENTS), angle(IN_TUNE_CENTS), 100)} fill="none" stroke="var(--color-extension)" strokeWidth="14" />
      {Array.from({ length: 11 }, (_, i) => {
        const c = -50 + i * 10;
        const [x1, y1] = pt(angle(c), c === 0 ? 80 : 86);
        const [x2, y2] = pt(angle(c), 92);
        const [lx, ly] = pt(angle(c), 118);
        return (
          <g key={c}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-muted-foreground)" strokeWidth={c === 0 ? 2 : 1} />
            {Math.abs(c) === 50 || c === 0 || Math.abs(c) === 20 ? (
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--color-muted-foreground)" fontFamily="var(--font-mono)">
                {c > 0 ? `+${c}` : c}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x="22" y="138" fontSize="9" fill="var(--color-muted-foreground)">flat</text>
      <text x="218" y="138" fontSize="9" textAnchor="end" fill="var(--color-muted-foreground)">sharp</text>
      <g
        style={{ transform: `rotate(${deg}deg)`, transformOrigin: "120px 128px", transition: "transform 120ms ease-out" }}
        className={cn(!active && "opacity-30")}
      >
        <line x1="120" y1="128" x2="120" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="120" cy="128" r="6" fill={color} />
    </svg>
  );
}
