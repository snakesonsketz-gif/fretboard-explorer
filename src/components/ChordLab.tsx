import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHORDS,
  degreeToSemitones,
  degreesToPitchClasses,
  identify,
  pretty,
  spellDegree,
  type Degree,
  type Root,
} from "@/lib/theory";

const PALETTE: { group: string; degrees: Degree[] }[] = [
  { group: "Core", degrees: ["1", "b3", "3", "5"] },
  { group: "Altered 5th", degrees: ["b5", "#5"] },
  { group: "Sixths & sevenths", degrees: ["6", "bb7", "b7", "7"] },
  { group: "Suspensions", degrees: ["2", "4"] },
  { group: "Ninths", degrees: ["b9", "9", "#9"] },
  { group: "Elevenths", degrees: ["11", "#11"] },
  { group: "Thirteenths", degrees: ["b13", "13"] },
];

export interface ChordLabProps {
  root: Root;
  degrees: Degree[];
  onChange: (degrees: Degree[]) => void;
  onReset: () => void;
}

export function ChordLab({ root, degrees, onChange, onReset }: ChordLabProps) {
  const has = (d: Degree) => degrees.includes(d);

  const toggle = (d: Degree) => {
    if (has(d)) onChange(degrees.filter((x) => x !== d));
    else
      onChange(
        [...degrees, d].sort((a, b) => degreeToSemitones(a) - degreeToSemitones(b)),
      );
  };

  const pcs = degreesToPitchClasses(degrees);
  const detection = identify(root, pcs);

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Detected name
            </p>
            <h3 className="font-display text-2xl font-bold">
              {detection.known
                ? pretty(detection.known.name)
                : `${root.name} custom`}
            </h3>
          </div>
          <Badge variant={detection.known ? "default" : "secondary"}>
            {detection.known
              ? `recognised ${detection.known.kind}`
              : "custom interval set"}
          </Badge>
        </div>

        <p className="mt-3 font-mono text-sm text-primary">
          {pretty(degrees.join("  ")) || "—"}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {degrees.map((d) => pretty(spellDegree(root, d))).join(" · ") || "no intervals selected"}
        </p>

        {detection.known && "theory" in detection.known.def ? (
          <p className="mt-3 text-sm text-muted-foreground">{detection.known.def.theory}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No conventional name matches this set, so it is described by its formula. Reduced
            pitch-class reading: <span className="font-mono">{pretty(detection.formula)}</span>.
          </p>
        )}

        {detection.alternates.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detection.alternates.map((a) => (
              <Badge key={a} variant="outline" className="font-mono text-[11px]">
                {pretty(a)}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="panel space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
            Add / remove intervals
          </h4>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset
          </Button>
        </div>
        {PALETTE.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              {g.group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.degrees.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggle(d)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                    has(d)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-muted",
                  )}
                >
                  {pretty(d)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-4">
        <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
          Quick alterations
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "Major ↔ minor 3rd", run: () => swap(degrees, "3", "b3") },
            { label: "Sharpen the 5th", run: () => swap(degrees, "5", "#5") },
            { label: "Flatten the 5th", run: () => swap(degrees, "5", "b5") },
            { label: "Major ↔ dominant 7th", run: () => swap(degrees, "7", "b7") },
            { label: "Sus4", run: () => [...degrees.filter((d) => d !== "3" && d !== "b3"), "4"] },
            { label: "Sus2", run: () => [...degrees.filter((d) => d !== "3" && d !== "b3"), "2"] },
          ].map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant="secondary"
              onClick={() =>
                onChange(
                  [...new Set(a.run())].sort(
                    (x, y) => degreeToSemitones(x) - degreeToSemitones(y),
                  ),
                )
              }
            >
              {a.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every change re-runs detection against {CHORDS.length} chord types and the scale
          library, and redraws the fretboard immediately.
        </p>
      </div>
    </div>
  );
}

function swap(degrees: Degree[], a: Degree, b: Degree): Degree[] {
  if (degrees.includes(a)) return degrees.map((d) => (d === a ? b : d));
  if (degrees.includes(b)) return degrees.map((d) => (d === b ? a : d));
  return [...degrees, b];
}
