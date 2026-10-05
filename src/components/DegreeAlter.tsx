import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { alterDegree } from "@/lib/modes";
import { parseDegree, pretty, spellDegree, type Degree, type Root } from "@/lib/theory";

const ALTERS: [number, string][] = [
  [-2, "𝄫"],
  [-1, "♭"],
  [0, "♮"],
  [1, "♯"],
  [2, "𝄪"],
];

interface Props {
  root: Root;
  degrees: Degree[];
  /** Unmodified preset degrees, used to show what each degree was originally. */
  original: Degree[];
  onChange: (next: Degree[]) => void;
}

/** Per-degree accidental control: keeps the degree number and letter spelling. */
export function DegreeAlter({ root, degrees, original, onChange }: Props) {
  const origByNum = new Map(original.map((d) => [parseDegree(d).number, d]));
  return (
    <div className="space-y-1.5 rounded-md border border-border/70 p-2" data-testid="degree-alter">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        Alter a degree (keeps its number and letter)
      </p>
      <div className="flex flex-wrap gap-2">
        {degrees.map((d) => {
          const { number, alter } = parseDegree(d);
          const orig = origByNum.get(number);
          const changed = orig !== undefined && orig !== d;
          const isNew = orig === undefined;
          return (
            <div
              key={d}
              className={cn(
                "rounded-md border px-1.5 py-1",
                changed ? "border-dashed border-foreground/70" : isNew ? "border-primary/60" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                <span className="font-bold">{pretty(d)}</span>
                <span className="text-muted-foreground">{pretty(spellDegree(root, d))}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {changed ? `was ${pretty(orig)} (${pretty(spellDegree(root, orig))})` : isNew ? "added" : "original"}
              </div>
              {number === 1 ? (
                <div className="text-[10px] text-muted-foreground">root</div>
              ) : (
                <div className="mt-1 flex gap-0.5">
                  {ALTERS.map(([a, g]) => {
                    const next = alterDegree(degrees, d, a);
                    return (
                      <Button
                        key={a}
                        size="sm"
                        variant={a === alter ? "default" : "secondary"}
                        className="h-6 w-6 p-0 text-xs"
                        disabled={!next}
                        title={next ? `${a === 0 ? "" : g}${number}` : "Would duplicate another note or the root"}
                        aria-label={`Set degree ${number} to ${g}${number}`}
                        onClick={() => next && next !== degrees && onChange(next)}
                      >
                        {g}
                      </Button>
                    );
                  })}
                  {changed ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1 text-[10px]"
                      onClick={() => {
                        const next = alterDegree(degrees, d, parseDegree(orig).alter);
                        if (next) onChange(next);
                      }}
                    >
                      orig
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
