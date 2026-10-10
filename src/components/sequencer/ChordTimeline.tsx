import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pretty } from "@/lib/theory";
import {
  arrangementTicks,
  beatTicks,
  describeLength,
  gridTicks,
  measureTicks,
  overlaps,
  roomAfter,
  snap,
  snapDown,
  type Arrangement,
  type ChordEvent,
  type Grid,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { rootHue } from "./shared";
import { usePlayhead } from "./useSequencer";

interface Props {
  arr: Arrangement;
  grid: Grid;
  /** Pixels per beat, or null to fit the arrangement to the available width. */
  zoom: number | null;
  onZoom: (px: number | null) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  armedLabel: string | null;
  onPlace: (tick: number) => void;
  onPreview: (c: ChordEvent) => void;
  playing: boolean;
  currentChord: string | null;
  set: (fn: (a: Arrangement) => Arrangement) => void;
  update: (fn: (a: Arrangement) => Arrangement) => void;
  snapshot: () => void;
}

type Drag = { mode: "move" | "resize"; id: string; x0: number; orig: ChordEvent; moved: boolean };

export function ChordTimeline(p: Props) {
  const { arr, grid, selectedId, playing } = p;
  const len = arrangementTicks(arr);
  const scroller = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const totalBeats = len / beatTicks(arr.ts);
  // Fit: fill the width, but keep beats at least 28 px (touch-sized) — longer pieces scroll.
  const fitPx = avail ? Math.max(28, Math.min(120, Math.floor((avail - 2) / totalBeats))) : 44;
  const pxPerBeat = p.zoom ?? fitPx;
  const pxPerTick = pxPerBeat / beatTicks(arr.ts);
  const step = gridTicks(arr.ts, grid);
  const barPx = measureTicks(arr.ts) * pxPerTick;
  const width = Math.ceil(len * pxPerTick);
  const arrRef = useRef(arr);
  arrRef.current = arr;
  const drag = useRef<Drag | null>(null);
  const head = useRef<HTMLDivElement>(null);

  usePlayhead(playing, (t) => {
    const el = head.current;
    if (!el) return;
    if (!playing || t < 0) {
      el.style.opacity = "0";
      return;
    }
    const x = (t % len) * pxPerTick;
    el.style.opacity = "1";
    el.style.transform = `translateX(${x}px)`;
    const sc = scroller.current;
    if (sc && (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 24)) sc.scrollLeft = Math.max(0, x - 24);
  });

  const setChord = (id: string, patch: Partial<ChordEvent>) =>
    p.set((a) => ({ ...a, chords: a.chords.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const onBlockDown = (e: RPointerEvent<HTMLElement>, c: ChordEvent, mode: Drag["mode"]) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    p.onSelect(c.id);
    drag.current = { mode, id: c.id, x0: e.clientX, orig: c, moved: false };
  };
  const onBlockMove = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 4) return;
      d.moved = true;
      p.snapshot(); // one undo step for the whole drag
    }
    const chords = arrRef.current.chords;
    if (d.mode === "move") {
      const cand = Math.min(len - d.orig.duration, Math.max(0, snap(d.orig.start + dx / pxPerTick, step)));
      if (!overlaps(chords, cand, d.orig.duration, d.id)) setChord(d.id, { start: cand });
    } else {
      const room = roomAfter(chords, d.orig.start, len, d.id);
      setChord(d.id, { duration: Math.min(room, Math.max(step, snap(d.orig.duration + dx / pxPerTick, step))) });
    }
  };
  const onBlockUp = (c: ChordEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && d.mode === "move" && !playing) p.onPreview(c);
  };

  const onLaneDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const tick = Math.min(len - step, Math.max(0, snapDown(x / pxPerTick, step)));
    if (p.armedLabel) p.onPlace(tick);
    else p.onSelect(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = arr.chords.find((x) => x.id === selectedId);
    if (e.key === "Escape") return p.onSelect(null);
    if (!c) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      p.update((a) => ({ ...a, chords: a.chords.filter((x) => x.id !== c.id) }));
      p.onSelect(null);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (e.shiftKey) {
        const d = Math.min(roomAfter(arr.chords, c.start, len, c.id), Math.max(step, c.duration + dir * step));
        if (d !== c.duration) p.update((a) => ({ ...a, chords: a.chords.map((x) => (x.id === c.id ? { ...x, duration: d } : x)) }));
      } else {
        const s = c.start + dir * step;
        if (s >= 0 && s + c.duration <= len && !overlaps(arr.chords, s, c.duration, c.id))
          p.update((a) => ({ ...a, chords: a.chords.map((x) => (x.id === c.id ? { ...x, start: s } : x)) }));
      }
    }
  };

  const gridBg = [
    `repeating-linear-gradient(90deg, var(--color-border) 0 2px, transparent 2px ${barPx}px)`,
    `repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-border) 70%, transparent) 0 1px, transparent 1px ${pxPerBeat}px)`,
    grid > 1 ? `repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-border) 30%, transparent) 0 1px, transparent 1px ${pxPerBeat / grid}px)` : "",
  ].filter(Boolean).join(",");

  return (
    <section className="panel space-y-2 p-3 sm:p-4" aria-label="Chord timeline">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Chords</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => p.onZoom(Math.max(20, pxPerBeat - 12))} aria-label="Zoom out"><Minus className="h-4 w-4" /></Button>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Zoom</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => p.onZoom(Math.min(120, pxPerBeat + 12))} aria-label="Zoom in"><Plus className="h-4 w-4" /></Button>
          <Button size="sm" variant={p.zoom === null ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => p.onZoom(null)}>Fit</Button>
        </div>
      </div>
      <div ref={scroller} className="scrollbar-thin-x overflow-x-auto pb-1">
        <div className="relative select-none" style={{ width }}>
          <div className="relative h-5 font-mono text-[10px] text-muted-foreground" aria-hidden>
            {Array.from({ length: arr.measures }, (_, i) => (
              <span key={i} className="absolute top-0 pl-1" style={{ left: i * barPx }}>{i + 1}</span>
            ))}
          </div>
          <div
            role="listbox"
            aria-label={p.armedLabel ? `Timeline: tap to place ${p.armedLabel}` : "Timeline"}
            tabIndex={0}
            onPointerDown={onLaneDown}
            onKeyDown={onKey}
            data-testid="chord-lane"
            className={cn("relative h-20 rounded-md bg-secondary/30 outline-none focus-visible:ring-2 focus-visible:ring-primary", p.armedLabel && "cursor-copy")}
            style={{ backgroundImage: gridBg }}
          >
            {arr.chords.length === 0 ? (
              <p className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-xs text-muted-foreground">
                {p.armedLabel ? `Tap anywhere to place ${pretty(p.armedLabel)}` : "Pick a chord above, then tap here to place it"}
              </p>
            ) : null}
            {arr.chords.map((c) => {
              const w = c.duration * pxPerTick;
              const sel = c.id === selectedId;
              const now = c.id === p.currentChord;
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={sel}
                  data-testid="chord-block"
                  data-chord={c.label}
                  onPointerDown={(e) => onBlockDown(e, c, "move")}
                  onPointerMove={onBlockMove}
                  onPointerUp={() => onBlockUp(c)}
                  onPointerCancel={() => (drag.current = null)}
                  className={cn(
                    "absolute top-1.5 bottom-1.5 touch-none overflow-hidden rounded-md border px-1.5 py-1 text-left transition-[filter,box-shadow]",
                    sel ? "z-10 border-foreground ring-2 ring-primary" : "border-black/30",
                    now && "brightness-125 ring-2 ring-foreground",
                  )}
                  style={{ left: c.start * pxPerTick, width: Math.max(6, w - 2), background: `oklch(${now ? 0.55 : 0.45} 0.1 ${rootHue(c.rootName)})` }}
                  title={`${pretty(c.label)} · ${describeLength(c.duration, arr.ts)}`}
                >
                  {w > 26 ? <span className="block truncate font-mono text-sm font-bold leading-tight">{pretty(c.label)}</span> : null}
                  {w > 70 ? <span className="block truncate text-[10px] opacity-80">{describeLength(c.duration, arr.ts)}</span> : null}
                  <span
                    aria-label={`Change length of ${c.label}`}
                    onPointerDown={(e) => onBlockDown(e, c, "resize")}
                    onPointerMove={onBlockMove}
                    onPointerUp={() => onBlockUp(c)}
                    className="absolute right-0 top-0 h-full w-3 cursor-ew-resize touch-none bg-black/20 hover:bg-black/40 pointer-coarse:w-5"
                  />
                </div>
              );
            })}
            <div ref={head} aria-hidden className="pointer-events-none absolute -top-1 bottom-[-4px] left-0 z-20 w-0.5 bg-primary opacity-0 shadow-[0_0_6px] shadow-primary" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag a chord to move it, drag its right edge to change how long it rings. Gaps are rests. Keys: ←/→ move, Shift+←/→ length, Delete removes.
      </p>
    </section>
  );
}

