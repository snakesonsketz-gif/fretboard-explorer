/**
 * A chord box: the six strings drawn vertically (low E on the left), frets across, a dot where
 * each finger goes, "x" over strings not played and "o" over open strings. Strings to play wrong
 * on purpose are drawn red; strings to mute on purpose get a "~".
 */
export function ChordBox({ tab, wrong = [], muted = [], size = 132 }: { tab: string; wrong?: number[] | undefined; muted?: number[] | undefined; size?: number }) {
  const frets = [...tab].map((c) => (c === "x" ? null : Number(c)));
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const hi = Math.max(0, ...fretted);
  const start = hi > 4 ? Math.min(...fretted) : 1; // first fret shown
  const rows = 4;
  const W = size, H = size * 1.18;
  const left = 18, right = W - 10, top = 30, bottom = H - 12;
  const sx = (s: number) => left + (s * (right - left)) / 5;
  const fy = (i: number) => top + (i * (bottom - top)) / rows;
  const mid = (f: number) => (fy(f - start) + fy(f - start + 1)) / 2;
  // A barre: the lowest fret, pressed on several strings.
  const low = fretted.length ? Math.min(...fretted) : 0;
  const barre = frets.map((f, s) => (f === low ? s : -1)).filter((s) => s >= 0);
  const showBarre = low > 0 && barre.length >= 3 && barre[barre.length - 1]! - barre[0]! >= 3;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Chord shape ${tab}`} className="shrink-0">
      {start === 1 ? <rect x={left - 1} y={top - 4} width={right - left + 2} height={4} className="fill-foreground" /> : (
        <text x={2} y={mid(start) + 4} className="fill-muted-foreground font-mono" fontSize={11}>{start}</text>
      )}
      {Array.from({ length: rows + 1 }, (_, i) => <line key={`f${i}`} x1={left} x2={right} y1={fy(i)} y2={fy(i)} className="stroke-muted-foreground/60" strokeWidth={1} />)}
      {Array.from({ length: 6 }, (_, s) => <line key={`s${s}`} x1={sx(s)} x2={sx(s)} y1={top} y2={bottom} className="stroke-muted-foreground" strokeWidth={1 + (5 - s) * 0.18} />)}
      {showBarre ? <rect x={sx(barre[0]!) - 7} y={mid(low) - 7} width={sx(barre[barre.length - 1]!) - sx(barre[0]!) + 14} height={14} rx={7} className="fill-primary" /> : null}
      {frets.map((f, s) => {
        const isWrong = wrong.includes(s), isMuted = muted.includes(s);
        const label = f === null ? "x" : isMuted ? "~" : f === 0 ? "o" : "";
        return (
          <g key={s}>
            {label ? <text x={sx(s)} y={top - 10} textAnchor="middle" fontSize={label === "~" ? 16 : 12} fontWeight={700} className={isMuted ? "fill-root" : isWrong && f === 0 ? "fill-destructive" : "fill-muted-foreground"}>{label}</text> : null}
            {f !== null && f > 0 && !(showBarre && f === low && !isWrong) ? (
              <circle cx={sx(s)} cy={mid(f)} r={7} className={isWrong ? "fill-destructive" : "fill-primary"} />
            ) : null}
          </g>
        );
      })}
      {["E", "A", "D", "G", "B", "e"].map((n, s) => (
        <text key={n} x={sx(s)} y={H - 1} textAnchor="middle" fontSize={9} className="fill-muted-foreground font-mono">{n}</text>
      ))}
    </svg>
  );
}
