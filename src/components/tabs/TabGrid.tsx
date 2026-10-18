/**
 * The tab itself, drawn as tab and editable in place: tap a spot on a string, then tap a fret
 * number (or type it). The keypad under the tab adds techniques, bar lines, rests, rhythm and
 * chord names. Works with a mouse and keyboard too: digits, x h p / \ b r ~, arrows, Enter, |, Delete.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Copy, CornerDownRight, Minus, Plus, Trash2 } from "lucide-react";
import { BEAT_NAMES, cellText, FX, type Cell, type Column, type Fx, type Link, type TabTuning } from "@/lib/tabs/model";
import { lineNames } from "@/lib/tabs/render";
import { cn } from "@/lib/utils";

export interface Sel {
  col: number;
  s: number;
}

export interface GridOps {
  setCell: (col: number, s: number, fn: (c: Cell | null) => Cell | null) => void;
  setCol: (col: number, fn: (c: Column) => Column) => void;
  insertCol: (at: number, kind: Column["kind"]) => void;
  duplicateCol: (col: number) => void;
  deleteCol: (col: number) => void;
}

const LINK_LABEL: Record<Link, string> = { h: "hammer-on", p: "pull-off", "/": "slide up", "\\": "slide down" };
const BEND_STEPS = [0, 0.5, 1, 2, 3, 4];
const BEND_LABEL: Record<number, string> = { 0.5: "¼", 1: "½", 2: "full", 3: "1½", 4: "2 steps" };
const INTO: (Cell["into"] | undefined)[] = [undefined, "/", "\\", "h"];
const INTO_LABEL = { "/": "slide in ↗", "\\": "slide in ↘", h: "hammer from nowhere" } as const;

export function TabGrid({
  cols,
  tuning,
  sel,
  onSel,
  ops,
  playing,
}: {
  cols: Column[];
  tuning: TabTuning;
  sel: Sel | null;
  onSel: (s: Sel | null) => void;
  ops: GridOps;
  playing: number | null;
}) {
  const n = tuning.midis.length;
  const names = lineNames(tuning.names);
  const scroller = useRef<HTMLDivElement>(null);
  const lastDigit = useRef<{ at: number; col: number; s: number } | null>(null);

  // Keep the selected / playing column in view.
  useEffect(() => {
    const idx = playing ?? sel?.col;
    if (idx === undefined || idx === null) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-col="${idx}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: playing !== null ? "smooth" : "auto" });
  }, [playing, sel?.col]);

  const cur = sel ? cols[sel.col] : undefined;
  const curCell = sel && cur ? (cur.cells[sel.s] ?? null) : null;

  const typeFret = (d: number) => {
    if (!sel) return;
    const now = Date.now();
    const l = lastDigit.current;
    ops.setCell(sel.col, sel.s, (c) => {
      // Two quick taps make a two-digit fret: 1 then 2 = 12.
      if (l && l.col === sel.col && l.s === sel.s && now - l.at < 1300 && c && typeof c.fret === "number" && c.fret < 10 && c.fret * 10 + d <= 24 && c.fret > 0)
        return { ...c, fret: c.fret * 10 + d };
      return { ...(c ?? {}), fret: d, bend: c?.bend, harmonic: c?.harmonic };
    });
    lastDigit.current = { at: now, col: sel.col, s: sel.s };
  };
  const edit = (fn: (c: Cell) => Cell) => sel && ops.setCell(sel.col, sel.s, (c) => (c && c.fret !== "x" ? fn(c) : c));
  const vibrato = () => edit((c) => (!c.vibrato ? { ...c, vibrato: true, wide: undefined } : !c.wide ? { ...c, wide: true } : { ...c, vibrato: undefined, wide: undefined }));
  const prebend = () => edit((c) => ({ ...c, prebend: !c.prebend || undefined, bend: c.bend ?? 2 }));
  const trill = () =>
    edit((c) => {
      const f = c.fret as number;
      const next = c.trill === undefined ? f + 2 : c.trill === f + 2 ? f + 1 : undefined;
      return { ...c, trill: next !== undefined && next <= 24 ? next : undefined };
    });
  const into = () => edit((c) => ({ ...c, into: INTO[(INTO.indexOf(c.into) + 1) % INTO.length] }));
  const outSlide = () => edit((c) => ({ ...c, out: c.out === undefined ? "\\" : c.out === "\\" ? "/" : undefined }));
  const toggleFx = (f: Fx) => sel && ops.setCol(sel.col, (c) => ({ ...c, fx: c.fx?.includes(f) ? c.fx.filter((x) => x !== f) : [...(c.fx ?? []), f] }));
  const toggle = (k: "vibrato" | "harmonic" | "ghost" | "tap" | "release" | "pinch") =>
    sel && ops.setCell(sel.col, sel.s, (c) => (c ? { ...c, [k]: !c[k], ...(k === "release" && !c.bend ? { bend: 2 } : {}) } : c));
  const link = (lk: Link) => sel && ops.setCell(sel.col, sel.s, (c) => (c ? { ...c, link: c.link === lk ? undefined : lk } : c));
  const bend = () =>
    sel &&
    ops.setCell(sel.col, sel.s, (c) => {
      if (!c || c.fret === "x") return c;
      const next = BEND_STEPS[(BEND_STEPS.indexOf(c.bend ?? 0) + 1) % BEND_STEPS.length]!;
      return { ...c, bend: next || undefined, release: next ? c.release : undefined };
    });
  const dead = () => sel && ops.setCell(sel.col, sel.s, (c) => (c?.fret === "x" ? null : { fret: "x" }));
  const clear = () => sel && ops.setCell(sel.col, sel.s, () => null);
  const move = (dc: number, ds: number) => {
    if (!sel) return onSel({ col: Math.max(0, cols.length - 1), s: n - 1 });
    let col = sel.col + dc;
    if (col >= cols.length) {
      ops.insertCol(cols.length, "notes");
      col = cols.length;
    }
    onSel({ col: Math.max(0, col), s: Math.max(0, Math.min(n - 1, sel.s + ds)) });
  };
  const next = () => {
    if (!sel) return;
    ops.insertCol(sel.col + 1, "notes");
    onSel({ col: sel.col + 1, s: sel.s });
  };

  const onKey = (e: KeyboardEvent) => {
    if (!sel) return;
    const k = e.key;
    if (/^\d$/.test(k)) typeFret(Number(k));
    else if (k === "x" || k === "X") dead();
    else if (k === "h" || k === "p" || k === "/" || k === "\\") link(k as Link);
    else if (k === "b") bend();
    else if (k === "r") toggle("release");
    else if (k === "~" || k === "v") vibrato();
    else if (k === "<" || k === ">") toggle("harmonic");
    else if (k === "(" || k === ")") toggle("ghost");
    else if (k === "t") toggle("tap");
    else if (k === "Backspace" || k === "Delete") clear();
    else if (k === "ArrowRight") move(1, 0);
    else if (k === "ArrowLeft") move(-1, 0);
    else if (k === "ArrowUp") move(0, 1);
    else if (k === "ArrowDown") move(0, -1);
    else if (k === "Enter") next();
    else if (k === "|") {
      ops.insertCol(sel.col + 1, "bar");
      onSel({ col: sel.col + 2 > cols.length ? sel.col + 1 : sel.col + 2, s: sel.s });
      if (sel.col + 2 > cols.length) ops.insertCol(sel.col + 2, "notes");
    } else if (k === "Escape") onSel(null);
    else return;
    e.preventDefault();
  };

  const lengthName = cur && cur.kind !== "bar" ? (BEAT_NAMES.find((b) => Math.abs(b.beats - cur.beats) < 0.01) ?? { name: `${cur.beats} beats`, short: `${cur.beats}` }) : null;
  const cycleLength = () => {
    if (!sel || !cur || cur.kind === "bar") return;
    const order = [0.5, 1, 2, 4, 0.25, 1 / 3];
    const i = order.findIndex((b) => Math.abs(b - cur.beats) < 0.01);
    ops.setCol(sel.col, (c) => ({ ...c, beats: order[(i + 1) % order.length]! }));
  };

  return (
    <div className="space-y-2">
      <div
        ref={scroller}
        tabIndex={0}
        onKeyDown={onKey}
        className="relative overflow-x-auto rounded-xl border border-border bg-background/60 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        data-testid="tab-grid"
        aria-label="Tab editor. Pick a spot, then type a fret."
      >
        <div className="flex min-w-max items-stretch font-mono text-[13px]">
          {/* string names */}
          <div className="sticky left-0 z-10 flex flex-col bg-card/95 pr-1 pl-2 shadow-[4px_0_8px_-6px_rgba(0,0,0,0.6)]">
            <div className="h-8" />
            {names.map((nm, r) => (
              <div key={r} className="flex h-7 items-center justify-end text-[11px] font-bold text-muted-foreground">
                {nm.trim()}
              </div>
            ))}
            <div className="h-4" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="h-8" />
            {names.map((_, r) => (
              <div key={r} className="h-7 w-1.5 border-l-2 border-foreground/50" />
            ))}
            <div className="h-4" />
          </div>
          {cols.map((c, ci) => (
            <ColumnView key={c.id} c={c} ci={ci} n={n} sel={sel} onSel={onSel} playing={playing === ci} />
          ))}
          {/* add a column */}
          <div className="flex flex-col">
            <div className="h-8" />
            <button
              type="button"
              onClick={() => {
                ops.insertCol(cols.length, "notes");
                onSel({ col: cols.length, s: sel?.s ?? n - 1 });
              }}
              className="mx-1 flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-2 text-muted-foreground hover:border-primary hover:text-primary"
              style={{ height: `${n * 28}px` }}
              aria-label="Add a column"
              data-testid="tab-add-col"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-4" />
          </div>
        </div>
      </div>

      {sel && cur ? (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-card/70 p-2" data-testid="tab-keypad">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <span className="text-muted-foreground">
              Column {sel.col + 1} · <b className="text-foreground">{names[n - 1 - sel.s]?.trim()}</b> string
              {curCell ? (
                <>
                  {" · "}
                  <b className="font-mono text-primary">{cellText(curCell)}</b>
                  {curCell.link ? ` (${LINK_LABEL[curCell.link]} →)` : ""}
                </>
              ) : (
                " · empty"
              )}
            </span>
            <span className="hidden text-muted-foreground sm:inline">Tap 1 then 2 quickly for fret 12</span>
          </div>
          {cur.kind === "notes" ? (
            <>
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-13">
                {Array.from({ length: 13 }, (_, d) => (
                  <Key key={d} onClick={() => (d < 10 ? typeFret(d) : sel && ops.setCell(sel.col, sel.s, (c) => ({ ...(c ?? {}), fret: d })))} strong testId={`tab-fret-${d}`}>
                    {d}
                  </Key>
                ))}
                <Key onClick={() => sel && ops.setCell(sel.col, sel.s, (c) => ({ ...(c ?? {}), fret: Math.min(24, (typeof c?.fret === "number" ? c.fret : 12) + 1) }))} title="Fret up one">
                  +1
                </Key>
              </div>
              <div className="flex flex-wrap gap-1">
                <Key onClick={() => link("h")} on={curCell?.link === "h"} title="Hammer-on to the next note">h</Key>
                <Key onClick={() => link("p")} on={curCell?.link === "p"} title="Pull-off to the next note">p</Key>
                <Key onClick={() => link("/")} on={curCell?.link === "/"} title="Slide up to the next note">/</Key>
                <Key onClick={() => link("\\")} on={curCell?.link === "\\"} title="Slide down to the next note">\</Key>
                <Key onClick={bend} on={!!curCell?.bend} title="Bend: ¼ → ½ → full → 1½ → 2 steps → off">
                  bend{curCell?.bend ? ` ${BEND_LABEL[curCell.bend] ?? curCell.bend}` : ""}
                </Key>
                <Key onClick={prebend} on={!!curCell?.prebend} title="Pre-bend: bend before picking">pre-bend</Key>
                <Key onClick={() => toggle("release")} on={!!curCell?.release} title="Bend and release">rel</Key>
                <Key onClick={vibrato} on={!!curCell?.vibrato} title="Vibrato: ~ → wide ~~ → off">{curCell?.wide ? "~~" : "~"}</Key>
                <Key onClick={() => toggle("harmonic")} on={!!curCell?.harmonic} title="Natural harmonic">&lt;&gt;</Key>
                <Key onClick={() => toggle("pinch")} on={!!curCell?.pinch} title="Pinch / artificial harmonic">[ ]</Key>
                <Key onClick={trill} on={curCell?.trill !== undefined} title="Trill with the fret 2 up → 1 up → off">tr{curCell?.trill !== undefined ? curCell.trill : ""}</Key>
                <Key onClick={into} on={!!curCell?.into} title="How the note starts: slide in from below → from above → hammer-on from nowhere → normal">
                  {curCell?.into ? INTO_LABEL[curCell.into] : "in"}
                </Key>
                <Key onClick={outSlide} on={!!curCell?.out} title="Slide off the note: down → up → off">{curCell?.out ? `slide off ${curCell.out === "/" ? "↗" : "↘"}` : "out"}</Key>
                <Key onClick={() => toggle("ghost")} on={!!curCell?.ghost} title="Ghost note">( )</Key>
                <Key onClick={() => toggle("tap")} on={!!curCell?.tap} title="Tap">tap</Key>
                <Key onClick={dead} on={curCell?.fret === "x"} title="Dead / muted note">x</Key>
                <Key onClick={clear} title="Clear this spot" testId="tab-clear">⌫</Key>
              </div>
            </>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">{cur.kind === "bar" ? "Bar line." : "Rest."} Move to a note column to write frets.</p>
          )}
          <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
            {cur.kind !== "bar" ? (
              <Key onClick={cycleLength} title="Note length (tap to change)" testId="tab-length">
                {lengthName?.short} <span className="text-[10px] text-muted-foreground">{lengthName?.name}</span>
              </Key>
            ) : null}
            {cur.kind === "notes" ? (
              <>
                <Key onClick={() => ops.setCol(sel.col, (c) => ({ ...c, pm: !c.pm }))} on={!!cur.pm} title="Palm mute">PM</Key>
                <Key onClick={() => ops.setCol(sel.col, (c) => ({ ...c, ring: !c.ring }))} on={!!cur.ring} title="Let ring">ring</Key>
                <Key onClick={() => ops.setCol(sel.col, (c) => ({ ...c, strum: c.strum === "down" ? "up" : c.strum === "up" ? undefined : "down" }))} on={!!cur.strum} title="Pick or strum direction: down → up → none">
                  {cur.strum === "up" ? "↑" : "↓"} pick
                </Key>
                <input
                  value={cur.chord ?? ""}
                  onChange={(e) => ops.setCol(sel.col, (c) => ({ ...c, chord: e.target.value.slice(0, 10) || undefined }))}
                  placeholder="chord name"
                  aria-label="Chord name above this column"
                  className="h-9 w-24 rounded-md border border-border bg-background px-2 text-xs"
                />
              </>
            ) : null}
          </div>
          {cur.kind === "notes" ? (
            <div className="flex flex-wrap gap-1" aria-label="Effects for this column">
              {(Object.keys(FX) as Fx[]).map((f) => (
                <Key key={f} onClick={() => toggleFx(f)} on={!!cur.fx?.includes(f)} title={FX[f].name} small>
                  {FX[f].mark === ">" ? "> accent" : FX[f].mark === "." ? "· staccato" : FX[f].name}
                </Key>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            <Key onClick={() => move(-1, 0)} title="Previous column"><ArrowLeft className="h-4 w-4" /></Key>
            <Key onClick={() => move(0, 1)} title="String above (thinner)"><ChevronUp className="h-4 w-4" /></Key>
            <Key onClick={() => move(0, -1)} title="String below (thicker)"><ChevronDown className="h-4 w-4" /></Key>
            <Key onClick={() => move(1, 0)} title="Next column"><ArrowRight className="h-4 w-4" /></Key>
            <Key onClick={next} title="New column after this one (Enter)" testId="tab-next"><CornerDownRight className="h-4 w-4" /> new</Key>
            <Key onClick={() => ops.insertCol(sel.col + 1, "bar")} title="Bar line after this column">| bar</Key>
            <Key onClick={() => ops.insertCol(sel.col + 1, "rest")} title="Rest after this column">rest</Key>
            <Key onClick={() => ops.duplicateCol(sel.col)} title="Copy this column"><Copy className="h-4 w-4" /></Key>
            <Key
              onClick={() => {
                ops.deleteCol(sel.col);
                onSel(cols.length > 1 ? { col: Math.max(0, sel.col - 1), s: sel.s } : null);
              }}
              title="Delete this column"
              testId="tab-delete-col"
            >
              <Trash2 className="h-4 w-4" />
            </Key>
            <Key onClick={() => onSel(null)} title="Done"><Minus className="h-4 w-4" /> done</Key>
          </div>
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">Tap any spot on a string to write a fret there. On a computer you can type: numbers, x h p / \ b r ~, arrows, Enter for a new column, | for a bar line.</p>
      )}
    </div>
  );
}

function ColumnView({ c, ci, n, sel, onSel, playing }: { c: Column; ci: number; n: number; sel: Sel | null; onSel: (s: Sel) => void; playing: boolean }) {
  const selCol = sel?.col === ci;
  if (c.kind === "bar")
    return (
      <div className="flex flex-col" data-col={ci}>
        <div className="h-8" />
        <button type="button" onClick={() => onSel({ col: ci, s: sel?.s ?? n - 1 })} className={cn("relative mx-1 w-3", selCol && "rounded bg-primary/20")} style={{ height: `${n * 28}px` }} aria-label={`Bar line, column ${ci + 1}`}>
          <span className="absolute inset-y-[14px] left-1/2 w-0.5 -translate-x-1/2 bg-foreground/70" />
        </button>
        <div className="h-4" />
      </div>
    );
  const cells = [...c.cells].map((cell, s) => ({ cell, s })).reverse();
  return (
    <div className={cn("flex flex-col transition-colors", playing && "rounded-md bg-primary/25", selCol && !playing && "bg-primary/[0.07]")} data-col={ci}>
      <div className="flex h-8 flex-col items-center justify-end px-0.5 pb-0.5 leading-none">
        {c.chord ? <span className="max-w-[4.5rem] truncate font-sans text-[11px] font-bold text-primary">{c.chord}</span> : null}
        <span className="flex gap-0.5 font-sans text-[9px] font-semibold text-muted-foreground">
          {c.strum ? <span className="text-[11px] text-foreground">{c.strum === "down" ? "↓" : "↑"}</span> : null}
          {c.pm ? <span className="rounded bg-secondary px-0.5">PM</span> : null}
          {c.ring ? <span>ring</span> : null}
          {c.fx?.map((f) => (
            <span key={f} className="max-w-[3.5rem] truncate rounded bg-primary/15 px-0.5 text-primary">
              {FX[f].mark}
            </span>
          ))}
        </span>
      </div>
      {cells.map(({ cell, s }) => {
        const on = selCol && sel?.s === s;
        const text = c.kind === "rest" ? "" : cell ? cellText(cell) : "";
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSel({ col: ci, s })}
            className={cn(
              "tab-string relative flex h-7 min-w-[1.75rem] items-center justify-center px-1",
              on && "z-[1] rounded-md bg-primary/25 ring-2 ring-primary",
            )}
            aria-label={`Column ${ci + 1}, string ${n - s}${text ? `, ${text}` : ", empty"}`}
            data-testid={on ? "tab-sel" : undefined}
          >
            {text ? (
              <span className={cn("relative z-[1] rounded bg-background px-0.5 font-bold", cell?.fret === "x" ? "text-muted-foreground" : "text-foreground", cell?.ghost && "opacity-70")}>
                {text}
                {cell?.link ? <span className="text-primary">{cell.link}</span> : null}
              </span>
            ) : null}
          </button>
        );
      })}
      <div className="flex h-4 items-start justify-center">
        {c.kind === "rest" ? <span className="font-sans text-[9px] text-muted-foreground">rest</span> : <BeatMark beats={c.beats} />}
      </div>
    </div>
  );
}

/** The note length under each column, as a small note symbol. */
function BeatMark({ beats }: { beats: number }) {
  const b = BEAT_NAMES.find((x) => Math.abs(x.beats - beats) < 0.01);
  const glyph = beats >= 4 ? "𝅝" : beats >= 2 ? "𝅗𝅥" : beats >= 1 ? "♩" : Math.abs(beats - 1 / 3) < 0.01 ? "♪³" : beats >= 0.5 ? "♪" : "♬";
  return (
    <span className="font-sans text-[10px] leading-none text-muted-foreground/70" title={b?.name ?? `${beats} beats`}>
      {glyph}
    </span>
  );
}

function Key({ children, onClick, on, title, strong, testId, small }: { children: ReactNode; onClick: () => void; on?: boolean; title?: string; strong?: boolean; testId?: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      data-testid={testId}
      className={cn(
        "inline-flex min-w-[2.25rem] touch-manipulation items-center justify-center gap-1 rounded-md border px-2 transition-colors",
        small ? "h-8 text-xs" : "h-9 text-sm",
        strong ? "font-mono font-bold" : "font-semibold",
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60",
      )}
    >
      {children}
    </button>
  );
}
