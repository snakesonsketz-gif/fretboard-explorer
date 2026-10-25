/**
 * "Where do you want each note?" — pick, string by string, which chord note must be on it (or
 * that it isn't played), and only the shapes that match are shown.
 */
import { SlidersHorizontal, X } from "lucide-react";
import type { Tuning } from "@/lib/fretboard";
import { pretty, spellDegree, type Degree, type Root } from "@/lib/theory";
import { cn } from "@/lib/utils";

/** Per string, low first: null = any, "x" = not played, otherwise a degree ("5", "b3"…). */
export type Placement = (string | null)[];

export function NotePlacement({
  tuning,
  root,
  degrees,
  value,
  onChange,
  matches,
  total,
}: {
  tuning: Tuning;
  root: Root;
  degrees: Degree[];
  value: Placement;
  onChange: (p: Placement) => void;
  matches: number;
  total: number;
}) {
  const n = tuning.strings.length;
  const last = n - 1;
  const dup = tuning.strings[0]!.note === tuning.strings[last]!.note;
  const label = (si: number) => (dup && si === 0 ? "low " : dup && si === last ? "high " : "") + pretty(tuning.strings[si]!.note);
  const active = value.some((v) => v !== null);
  const set = (si: number, v: string | null) => {
    const next = Array.from({ length: n }, (_, i) => value[i] ?? null);
    next[si] = v;
    onChange(next);
  };
  return (
    <div className={cn("space-y-1.5 rounded-lg border p-2", active ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/20")} data-testid="note-placement">
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-widest">Where each note goes</span>
        <span className="text-[11px] text-muted-foreground" data-testid="placement-count">
          {active ? `${matches} of ${total} shapes match` : "pick a chord note for any string to filter the shapes"}
        </span>
        {active ? (
          <button type="button" onClick={() => onChange(Array(n).fill(null))} className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground" data-testid="placement-clear">
            <X className="h-3 w-3" /> Clear
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {/* high string first, like the fretboard */}
        {Array.from({ length: n }, (_, k) => last - k).map((si) => {
          const v = value[si] ?? null;
          return (
            <label key={si} className={cn("flex flex-col gap-0.5 rounded-md border px-1.5 py-1 text-[11px]", v ? "border-primary/60" : "border-border")}>
              <span className="font-semibold text-muted-foreground">{label(si)} string</span>
              <select
                value={v ?? ""}
                onChange={(e) => set(si, e.target.value || null)}
                className="h-7 rounded bg-background px-1 font-mono text-xs text-foreground"
                aria-label={`Note on the ${label(si)} string`}
                data-testid={`placement-${si}`}
              >
                <option value="">Any</option>
                {degrees.map((d) => (
                  <option key={d} value={d}>
                    {d === "1" ? "Root" : pretty(d)} ({pretty(spellDegree(root, d))})
                  </option>
                ))}
                <option value="x">Not played</option>
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Does a shape put the chosen notes on the chosen strings? Constraints for notes not in the chord are ignored. */
export function matchesPlacement(shape: readonly (number | null)[], placement: Placement, tuning: Tuning, rootPc: number, degreePc: (d: string) => number | null): boolean {
  for (let si = 0; si < placement.length; si++) {
    const want = placement[si];
    if (!want) continue;
    const f = shape[si];
    if (want === "x") {
      if (f !== null && f !== undefined) return false;
      continue;
    }
    const pc = degreePc(want);
    if (pc === null) continue;
    if (f === null || f === undefined) return false;
    if ((tuning.strings[si]!.pc + f) % 12 !== (rootPc + pc) % 12) return false;
  }
  return true;
}
