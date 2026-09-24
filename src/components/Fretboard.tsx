import { useMemo, useRef, type PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { pluck } from "@/lib/audio";
import { DOUBLE_INLAY, INLAY_FRETS, buildFretboard, type Tuning } from "@/lib/fretboard";
import { INTERVAL_SHORT, parseDegree, pretty, type Degree, type Root } from "@/lib/theory";

export type LabelMode = "note" | "degree" | "interval";

export interface FretPos {
  string: number;
  fret: number;
}

export interface FretboardProps {
  tuning: Tuning;
  root: Root;
  degrees: Degree[];
  fretFrom: number;
  fretTo: number;
  leftHanded: boolean;
  labelMode: LabelMode;
  preferFlats: boolean;
  showAllNotes: boolean;
  roles?: Record<string, "chord tone" | "tension" | "avoid"> | undefined;
  /** Degrees that differ from the unmodified preset — drawn with a dashed ring. */
  altered?: Set<string> | undefined;
  selected?: FretPos | null | undefined;
  onSelect?: ((pos: FretPos) => void) | undefined;
  /** Drag / arrow-key edit of the selected note, in semitones. */
  onShift?: ((delta: number) => void) | undefined;
  onNote?: ((info: { midi: number; label: string }) => void) | undefined;
}

/** Color role for a degree, using semantic tokens only. */
function roleClass(degree: Degree | undefined, isRoot: boolean, role?: string): string {
  if (isRoot) return "bg-root text-root-foreground";
  if (role === "avoid") return "bg-avoid text-foreground";
  if (role === "tension") return "bg-tension text-foreground";
  if (!degree) return "bg-neutral-note text-foreground";
  const { number, alter } = parseDegree(degree);
  if (number === 3 || number === 10) return "bg-third text-background";
  if (number === 5 && alter === 0) return "bg-fifth text-background";
  if (number === 7 || number === 4) return "bg-seventh text-background";
  if (number >= 9 || number === 6 || number === 2) return "bg-extension text-background";
  return "bg-tension text-foreground";
}

export function Fretboard(props: FretboardProps) {
  const {
    tuning,
    root,
    degrees,
    fretFrom,
    fretTo,
    leftHanded,
    labelMode,
    preferFlats,
    showAllNotes,
    roles,
    altered,
    selected,
    onSelect,
    onShift,
    onNote,
  } = props;

  const rows = useMemo(
    () => buildFretboard({ tuning, fretFrom, fretTo, root, degrees, preferFlats }),
    [tuning, fretFrom, fretTo, root, degrees, preferFlats],
  );

  const drag = useRef<{ x: number; w: number; applied: number } | null>(null);

  const frets: number[] = [];
  for (let f = fretFrom; f <= fretTo; f++) frets.push(f);
  const shown = leftHanded ? [...frets].reverse() : frets;
  const stringRows = [...rows].reverse();
  const cols = `2.5rem repeat(${shown.length}, minmax(2.5rem, 1fr))`;
  const nStrings = tuning.strings.length;

  const onDown = (e: RPointerEvent<HTMLButtonElement>, pos: FretPos, inSet: boolean) => {
    onSelect?.(pos);
    if (!inSet || !onShift) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: e.currentTarget.getBoundingClientRect().width + 4, applied: 0 };
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || !onShift) return;
    const steps = Math.round((e.clientX - d.x) / d.w) * (leftHanded ? -1 : 1);
    if (steps !== d.applied) {
      onShift(steps - d.applied);
      d.applied = steps;
    }
  };
  const onUp = (midi: number, label: string) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.applied === 0) {
      pluck(midi);
      onNote?.({ midi, label });
    }
  };

  return (
    <div className="scrollbar-thin-x w-full overflow-x-auto">
      <div className="min-w-[720px] select-none">
        <div
          className="grid gap-1 pb-1 font-mono text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: cols }}
        >
          <div />
          {shown.map((f) => (
            <div key={f} className="text-center">
              {f}
            </div>
          ))}
        </div>

        <div className="fret-wood relative overflow-hidden rounded-lg border border-border p-1">
          {stringRows.map((row, ri) => {
            const stringIndex = nStrings - 1 - ri;
            const notes = leftHanded ? [...row].reverse() : row;
            const open = tuning.strings[stringIndex]!;
            // lower strings drawn thicker
            const thickness = 1 + ((nStrings - 1 - stringIndex) / Math.max(1, nStrings - 1)) * 2.5;
            return (
              <div
                key={ri}
                className="relative grid items-center gap-1"
                style={{ gridTemplateColumns: cols }}
              >
                <div className="z-10 text-center font-mono text-xs font-semibold text-foreground">
                  {pretty(open.note)}
                </div>
                {/* the string itself */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-fret-string"
                  style={{ left: "2.75rem", height: `${thickness}px` }}
                />
                {notes.map((n) => {
                  const role = n.degree ? roles?.[n.degree] : undefined;
                  const visible = n.inSet || showAllNotes;
                  const isSel = selected?.string === n.string && selected?.fret === n.fret;
                  const label =
                    labelMode === "degree"
                      ? (n.degree ?? "")
                      : labelMode === "interval"
                        ? (INTERVAL_SHORT[n.intervalSemitones ?? -1] ?? "")
                        : n.noteName;
                  const os = tuning.strings[n.string]!;
                  const midi = os.pc + (os.octave + 1) * 12 + n.fret;
                  const isNut = n.fret === 0;
                  const isAltered = !!n.degree && altered?.has(n.degree);
                  return (
                    <button
                      type="button"
                      key={`${n.string}-${n.fret}`}
                      data-string={n.string}
                      data-fret={n.fret}
                      onPointerDown={(e) => onDown(e, { string: n.string, fret: n.fret }, n.inSet)}
                      onPointerMove={onMove}
                      onPointerUp={() => onUp(midi, n.noteName)}
                      onPointerCancel={() => (drag.current = null)}
                      onKeyDown={(e) => {
                        if (!n.inSet || !onShift) return;
                        if (e.key === "ArrowLeft" || e.key === "-") {
                          e.preventDefault();
                          onSelect?.({ string: n.string, fret: n.fret });
                          onShift(-1);
                        } else if (e.key === "ArrowRight" || e.key === "+" || e.key === "=") {
                          e.preventDefault();
                          onSelect?.({ string: n.string, fret: n.fret });
                          onShift(1);
                        }
                      }}
                      className={cn(
                        "relative z-10 flex h-9 items-center justify-center outline-none",
                        isNut
                          ? leftHanded
                            ? "border-l-4 border-fret-string"
                            : "border-r-4 border-fret-string"
                          : leftHanded
                            ? "border-l-2 border-fret-wire/70"
                            : "border-r-2 border-fret-wire/70",
                        isSel && "touch-none",
                      )}
                      aria-pressed={isSel}
                      aria-label={`${n.noteName} on ${pretty(open.note)} string, fret ${n.fret}${n.degree ? `, degree ${n.degree}` : ""}`}
                    >
                      {ri === Math.floor(nStrings / 2) && INLAY_FRETS.has(n.fret) ? (
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute h-2 w-2 rounded-full bg-fret-wire/50",
                            DOUBLE_INLAY.has(n.fret) && "bg-primary/60",
                          )}
                          style={{ top: "-0.25rem" }}
                        />
                      ) : null}
                      <span
                        className={cn(
                          "note-dot relative flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold leading-none transition-transform",
                          n.inSet
                            ? roleClass(n.degree, n.isRoot, role)
                            : "bg-neutral-note/70 text-muted-foreground",
                          !visible && !isSel && "opacity-0 hover:opacity-40",
                          isAltered && "outline-2 outline-dashed outline-offset-2 outline-foreground/70",
                          isSel && "scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-background",
                          isSel && !n.inSet && "opacity-80",
                        )}
                      >
                        {pretty(label || (isSel ? n.noteName : ""))}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
