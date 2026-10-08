import { Button } from "@/components/ui/button";
import { modeRotations, type ModeRotation } from "@/lib/modes";
import { pretty, spellDegree, type Degree, type Root } from "@/lib/theory";

interface Props {
  root: Root;
  degrees: Degree[];
  onPick: (m: ModeRotation) => void;
}

/** The seven rotations of one heptatonic pitch collection. */
export function ModeFamily({ root, degrees, onPick }: Props) {
  const rows = modeRotations(root, degrees);
  if (rows.length === 0) return null;
  const notes = degrees.map((d) => pretty(spellDegree(root, d))).join(" ");
  return (
    <div className="space-y-1.5" data-testid="mode-family">
      <p className="text-[11px] text-muted-foreground">
        Same pitch collection ({notes}) — each mode puts a different note at 1 and renumbers the degrees.
      </p>
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((m) => (
          <button
            key={m.index}
            type="button"
            onClick={() => onPick(m)}
            className={`rounded-md border px-2 py-1 text-left text-xs ${m.index === 0 ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/60"}`}
          >
            <span className="font-semibold">{pretty(m.name)}</span>
            <span className="block font-mono text-[10px] text-primary">{pretty(m.degrees.join(" "))}</span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {m.notes.map(pretty).join(" ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModeFamilyButton(props: Props & { label?: string }) {
  return modeRotations(props.root, props.degrees).length ? (
    <Button size="sm" variant="secondary" onClick={() => props.onPick(modeRotations(props.root, props.degrees)[0]!)}>
      {props.label ?? "Open"}
    </Button>
  ) : null;
}
