import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { containingScales, readings, rootForPc, type Reading } from "@/lib/identifier";
import { modeRotations, type ModeRotation } from "@/lib/modes";
import { pcsToDegrees, pretty, spellDegree, type Root } from "@/lib/theory";
import { ModeFamily } from "./ModeFamily";

const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

interface Props {
  /** Absolute pitch classes currently shown on the fretboard. */
  currentPcs: number[];
  /** Notes of the marked shape, lowest first, if any. */
  shapePcs: number[];
  onLoad: (r: Reading) => void;
  onLoadScale: (root: Root, scaleId: string) => void;
  onLoadMode: (m: ModeRotation) => void;
}

export function IdentifierPanel({ currentPcs, shapePcs, onLoad, onLoadScale, onLoadMode }: Props) {
  const [pcs, setPcs] = useState<number[]>([]);
  const [bass, setBass] = useState<number | null>(null);
  const toggle = (p: number) => {
    setPcs((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
    if (bass === p) setBass(null);
  };
  const res = useMemo(() => readings(pcs, bass ?? undefined), [pcs, bass]);
  const contain = useMemo(() => containingScales(pcs), [pcs]);
  const heptatonic = res.find((r) => r.kind === "scale" && modeRotations(r.root, r.degrees).length);
  const fallbackRoot = rootForPc(bass ?? pcs[0] ?? 0);

  return (
    <div className="panel space-y-3 p-3" data-testid="identifier">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Notes</span>
        {NAMES.map((n, p) => (
          <Button
            key={n}
            size="sm"
            variant={pcs.includes(p) ? "default" : "secondary"}
            className="h-7 min-w-9 px-2 font-mono text-xs"
            aria-pressed={pcs.includes(p)}
            aria-label={`Identifier note ${n}`}
            onClick={() => toggle(p)}
          >
            {n}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => { setPcs([...new Set(currentPcs)]); setBass(null); }}>
          From fretboard notes
        </Button>
        <Button size="sm" variant="secondary" disabled={shapePcs.length === 0}
          onClick={() => { setPcs([...new Set(shapePcs)]); setBass(shapePcs[0] ?? null); }}>
          From marked shape
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setPcs([]); setBass(null); }}>Clear</Button>
        {pcs.length ? (
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Bass:
            {pcs.map((p) => (
              <Button key={p} size="sm" variant={bass === p ? "default" : "ghost"} className="h-6 px-1.5 font-mono text-xs"
                onClick={() => setBass(bass === p ? null : p)}>
                {NAMES[p]}
              </Button>
            ))}
          </span>
        ) : null}
      </div>

      {pcs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Pick notes, or take them from the fretboard or a marked shape.</p>
      ) : (
        <div className="space-y-2" data-testid="identifier-results">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {res.length === 0 ? "No standard name" : res.length === 1 ? "1 reading" : `${res.length} readings — the same notes, different roots`}
          </p>
          {res.length === 0 ? (
            <p className="font-mono text-sm">
              {pretty(fallbackRoot.name)} custom ({pretty(pcsToDegrees(pcs.map((p) => p - fallbackRoot.pc)).join(" "))})
            </p>
          ) : null}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {res.map((r, i) => (
              <div key={i} className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold">{pretty(r.slash ?? r.name)}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {r.kind === "chord" ? "chord · arpeggio" : "scale"}
                    {r.inversion ? ` · ${r.inversion}` : ""}
                  </span>
                </div>
                <div className="font-mono text-primary">{pretty(r.degrees.join(" "))}</div>
                <div className="font-mono text-muted-foreground">{r.notes.map(pretty).join(" ")}</div>
                <Button size="sm" className="mt-1 h-6 px-2 text-xs" onClick={() => onLoad(r)}>
                  Load on fretboard
                </Button>
              </div>
            ))}
          </div>
          {heptatonic ? (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Modal family</p>
              <ModeFamily root={heptatonic.root} degrees={heptatonic.degrees} onPick={onLoadMode} />
            </div>
          ) : null}
          {contain.length ? (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                Seven-note scales containing all these notes
              </p>
              <div className="flex flex-wrap gap-1">
                {contain.map(({ root, scale }) => (
                  <Button key={`${root.name}-${scale.id}`} size="sm" variant="ghost" className="h-6 px-2 text-xs"
                    onClick={() => onLoadScale(root, scale.id)}>
                    {pretty(root.name)} {scale.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="font-mono text-[11px] text-muted-foreground">
            Notes: {pcs.slice().sort((a, b) => a - b).map((p) => NAMES[p]).join(" ")}
            {bass !== null ? ` · bass ${NAMES[bass]}` : ""}
            {res[0] ? ` · spelled from ${pretty(res[0].root.name)}: ${res[0].degrees.map((d) => pretty(spellDegree(res[0]!.root, d))).join(" ")}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
