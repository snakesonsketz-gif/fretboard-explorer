import { useEffect, useMemo, useRef } from "react";
import type { Take } from "@/lib/listen/takes";

/**
 * The recording as a waveform, with a numbered mark at every strum Fretlab counted and a playhead
 * while it plays — so the player can listen and check each mark is a real strum. Tap to play from
 * that point.
 */
export function Waveform({ take, marks, position, onSeek }: {
  take: Take;
  /** Seconds of each counted strum. */
  marks: number[];
  /** Current playback position (seconds) or null; polled every frame. */
  position: () => number | null;
  onSeek?: (seconds: number) => void;
}) {
  const BARS = 200;
  const secs = Math.max(1e-6, take.pcm.length / take.sampleRate);
  const peaks = useMemo(() => {
    const per = Math.max(1, Math.floor(take.pcm.length / BARS));
    const out: number[] = [];
    for (let b = 0; b < BARS; b++) {
      let m = 0;
      for (let i = b * per; i < Math.min(take.pcm.length, (b + 1) * per); i++) m = Math.max(m, Math.abs(take.pcm[i]!));
      out.push(m / 32767);
    }
    const top = Math.max(1e-6, ...out);
    return out.map((v) => v / top);
  }, [take]);
  const head = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = position();
      const el = head.current;
      if (el) {
        el.style.opacity = p === null ? "0" : "1";
        if (p !== null) el.style.left = `${Math.min(100, (p / secs) * 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [position, secs]);

  return (
    <div
      className="relative h-16 w-full cursor-pointer touch-manipulation select-none overflow-hidden rounded-md bg-background/60"
      role="img"
      aria-label={`Recording waveform, ${marks.length} strum${marks.length === 1 ? "" : "s"} marked`}
      data-testid="waveform"
      onClick={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, ((e.clientX - r.left) / r.width) * secs));
      }}
    >
      <svg viewBox={`0 0 ${BARS} 40`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {peaks.map((v, i) => (
          <rect key={i} x={i + 0.15} width={0.7} y={20 * (1 - v)} height={Math.max(0.4, 40 * v)} className="fill-muted-foreground/60" />
        ))}
      </svg>
      {marks.map((m, i) => (
        <div key={i} className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${(m / secs) * 100}%` }} data-testid="waveform-mark">
          <span className="absolute left-1 top-0.5 rounded bg-primary px-1 font-mono text-[10px] font-bold leading-4 text-primary-foreground">{i + 1}</span>
        </div>
      ))}
      <div ref={head} className="absolute inset-y-0 w-0.5 bg-foreground" style={{ opacity: 0, left: 0 }} aria-hidden />
    </div>
  );
}
