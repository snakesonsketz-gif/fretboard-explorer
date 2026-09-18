import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { pluck } from "@/lib/audio";
import { DOUBLE_INLAY, INLAY_FRETS, buildFretboard, type Tuning } from "@/lib/fretboard";
import { INTERVAL_SHORT, parseDegree, pretty, type Degree, type Root } from "@/lib/theory";

export type LabelMode = "note" | "degree" | "interval";

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
  roles?: Record<string, "chord tone" | "tension" | "avoid">;
  onNote?: (info: { midi: number; label: string }) => void;
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
    onNote,
  } = props;

  const rows = useMemo(
    () => buildFretboard({ tuning, fretFrom, fretTo, root, degrees, preferFlats }),
    [tuning, fretFrom, fretTo, root, degrees, preferFlats],
  );

  const frets: number[] = [];
  for (let f = fretFrom; f <= fretTo; f++) frets.push(f);
  const shown = leftHanded ? [...frets].reverse() : frets;
  // Low string at the bottom, like looking at your own guitar.
  const stringRows = [...rows].reverse();

  return (
    <div className="scrollbar-thin-x w-full overflow-x-auto">
      <div className="min-w-[680px] select-none">
        {/* fret numbers */}
        <div
          className="grid gap-1 pb-1 text-[10px] font-mono text-muted-foreground"
          style={{ gridTemplateColumns: `2.5rem repeat(${shown.length}, minmax(2.25rem, 1fr))` }}
        >
          <div />
          {shown.map((f) => (
            <div key={f} className="text-center">
              {f}
              {INLAY_FRETS.has(f) ? (
                <span className={cn("ml-0.5", DOUBLE_INLAY.has(f) && "text-primary")}>•</span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="fret-wood overflow-hidden rounded-lg border border-border p-1">
          {stringRows.map((row, ri) => {
            const notes = leftHanded ? [...row].reverse() : row;
            const openName = tuning.strings[tuning.strings.length - 1 - ri];
            return (
              <div
                key={ri}
                className="grid items-center gap-1 py-[3px]"
                style={{
                  gridTemplateColumns: `2.5rem repeat(${shown.length}, minmax(2.25rem, 1fr))`,
                }}
              >
                <div className="text-center font-mono text-xs text-muted-foreground">
                  {pretty(openName.note)}
                </div>
                {notes.map((n) => {
                  const role = n.degree ? roles?.[n.degree] : undefined;
                  const visible = n.inSet || showAllNotes;
                  const label =
                    labelMode === "degree"
                      ? (n.degree ?? "")
                      : labelMode === "interval"
                        ? (INTERVAL_SHORT[n.intervalSemitones ?? -1] ?? "")
                        : n.noteName;
                  const midi =
                    openName.pc + (openName.octave + 1) * 12 + (n.fret - 0) + 0;
                  const realMidi =
                    tuning.strings[n.string].pc +
                    (tuning.strings[n.string].octave + 1) * 12 +
                    n.fret;
                  void midi;
                  return (
                    <button
                      type="button"
                      key={`${n.string}-${n.fret}`}
                      onClick={() => {
                        pluck(realMidi);
                        onNote?.({ midi: realMidi, label: n.noteName });
                      }}
                      className={cn(
                        "relative flex h-8 items-center justify-center rounded-sm border-r border-fret-wire/60 transition-colors",
                        !visible && "opacity-0 hover:opacity-40",
                      )}
                      aria-label={`${n.noteName} string ${n.string + 1} fret ${n.fret}`}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-fret-string/40" />
                      <span
                        className={cn(
                          "note-dot relative z-10 flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold leading-none",
                          n.inSet
                            ? roleClass(n.degree, n.isRoot, role)
                            : "bg-neutral-note/70 text-muted-foreground",
                        )}
                      >
                        {pretty(label)}
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
