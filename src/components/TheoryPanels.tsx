import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playSequence } from "@/lib/audio";
import {
  CHORDS,
  INTERVAL_LONG,
  INTERVAL_SHORT,
  MAJOR_MODE_NAMES,
  SCALES,
  classifyAgainstChord,
  degreeToSemitones,
  degreesToPitchClasses,
  harmonize,
  identify,
  majorModeViews,
  parallelModeViews,
  parentMajorOf,
  pretty,
  rootByName,
  spellDegree,
  type ChordDef,
  type Degree,
  type Root,
  type ScaleDef,
} from "@/lib/theory";

/* ---------------------------------------------------------------- intervals */

export function IntervalTable({ root, degrees }: { root: Root; degrees: Degree[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Degree</th>
            <th className="px-3 py-2">Note</th>
            <th className="px-3 py-2">Interval</th>
            <th className="px-3 py-2 text-right">Semitones</th>
          </tr>
        </thead>
        <tbody>
          {degrees.map((d) => {
            const semis = degreeToSemitones(d);
            const pc = ((semis % 12) + 12) % 12;
            return (
              <tr key={d} className="border-t border-border/70">
                <td className="px-3 py-2 font-mono text-primary">{pretty(d)}</td>
                <td className="px-3 py-2 font-mono">{pretty(spellDegree(root, d))}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {INTERVAL_LONG[pc]}
                  <span className="ml-2 font-mono text-xs">{INTERVAL_SHORT[pc]}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{semis}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- tensions */

export function TensionPanel({
  scale,
  chordDegrees,
  chordLabel,
}: {
  scale: Degree[];
  chordDegrees: Degree[];
  chordLabel: string;
}) {
  const rows = classifyAgainstChord(scale, chordDegrees);
  const tone = {
    "chord tone": "bg-fifth text-background",
    tension: "bg-tension text-foreground",
    avoid: "bg-avoid text-foreground",
  } as const;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Each scale degree measured against <span className="font-mono">{pretty(chordLabel)}</span>.
        Avoid notes sit a semitone above a guide tone (the 3rd or 7th).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span
            key={r.degree}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-xs font-semibold",
              tone[r.role],
            )}
            title={r.role}
          >
            {pretty(r.degree)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-fifth" /> chord tone
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-tension" /> colour tension
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-avoid" /> avoid / handle with care
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- harmonizer */

export function Harmonizer({
  root,
  scale,
  seventh,
  onToggleSeventh,
  onPick,
}: {
  root: Root;
  scale: ScaleDef;
  seventh: boolean;
  onToggleSeventh: () => void;
  onPick: (degrees: Degree[], rootName: string) => void;
}) {
  const chords = harmonize(root, scale, seventh);
  if (chords.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Diatonic harmonisation needs a seven-note scale. {scale.name} has {scale.degrees.length}{" "}
        notes, so there is no one-chord-per-degree reading.
      </p>
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Chords built on each degree of {root.name} {scale.name}.
        </p>
        <Button size="sm" variant="secondary" onClick={onToggleSeventh}>
          {seventh ? "Show triads" : "Show 7th chords"}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {chords.map((c) => (
          <button
            key={c.roman}
            type="button"
            onClick={() => onPick(c.degrees, c.name.replace(/(maj7|m7b5|m7|dim7|m|aug|dim|7|#5|\(maj7\)|\?).*$/, "") || root.name)}
            className="panel p-3 text-left transition-colors hover:bg-muted"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-sm text-primary">{pretty(c.roman)}</span>
              <span className="font-display text-base font-bold">{pretty(c.name)}</span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {c.notes.map((n) => pretty(n)).join(" · ")}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{c.function}</p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground/90">
              {c.substitutions.map((s) => (
                <li key={s}>↳ {pretty(s)}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- modes */

export function ModeViews({
  root,
  activeScale,
  onPick,
}: {
  root: Root;
  activeScale: ScaleDef;
  onPick: (scaleId: string, rootName: string) => void;
}) {
  const modeIndex = activeScale.modeOf?.family === "major" ? activeScale.modeOf.index : 0;
  const parent = parentMajorOf(root, modeIndex);
  const parentRoot = rootByName(parent);
  const relative = majorModeViews(parentRoot);
  const parallel = parallelModeViews(root);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
          Relative modes — one key, seven roots
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          All seven share the exact notes of {parentRoot.name} major. Only the starting note, and
          therefore the tonal centre, changes.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {relative.map((m, i) => (
            <button
              key={m.modeName}
              type="button"
              onClick={() => onPick(m.scaleId, m.root)}
              className={cn(
                "panel p-3 text-left transition-colors hover:bg-muted",
                i === modeIndex && "border-primary",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display font-bold">
                  {pretty(m.root)} {m.modeName}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  degree {i + 1}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {m.notes.map((n) => pretty(n)).join(" ")}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
          Parallel modes — one root, seven formulas
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          All seven start on {root.name}. Comparing the formulas shows exactly which notes change
          the colour.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {parallel.map((m, i) => (
            <button
              key={m.modeName}
              type="button"
              onClick={() => onPick(m.scaleId, root.name)}
              className={cn(
                "panel p-3 text-left transition-colors hover:bg-muted",
                i === modeIndex && "border-primary",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display font-bold">
                  {pretty(root.name)} {m.modeName}
                </span>
                <span className="font-mono text-[11px] text-primary">
                  {pretty(m.degrees.join(" "))}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.characteristic}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- chord-scale */

export function ChordScalePanel({
  root,
  chord,
  onPickScale,
}: {
  root: Root;
  chord: ChordDef;
  onPickScale: (scaleId: string) => void;
}) {
  const chordPcs = new Set(degreesToPitchClasses(chord.degrees));
  const recommended = (chord.scales ?? []).map((id) => SCALES.find((s) => s.id === id)!).filter(Boolean);
  const containing = SCALES.filter(
    (s) =>
      s.degrees.length >= 5 &&
      s.id !== "chromatic" &&
      [...chordPcs].every((pc) => degreesToPitchClasses(s.degrees).includes(pc)),
  ).slice(0, 10);

  return (
    <div className="space-y-4">
      {recommended.length > 0 ? (
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
            Primary chord-scale choices
          </h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {recommended.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPickScale(s.id)}
                className="panel p-3 text-left transition-colors hover:bg-muted"
              >
                <p className="font-display font-bold">
                  {root.name} {s.name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-primary">
                  {pretty(s.degrees.join(" "))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.characteristic}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
          Every scale that contains this chord
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {containing.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickScale(s.id)}
              className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:bg-muted"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- parent scale */

export function ParentScalePanel({ root, degrees }: { root: Root; degrees: Degree[] }) {
  const pcs = degreesToPitchClasses(degrees);
  const matches = SCALES.filter(
    (s) => s.id !== "chromatic" && pcs.every((pc) => degreesToPitchClasses(s.degrees).includes(pc)),
  );
  const detection = identify(root, pcs);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Formula</p>
        <p className="font-mono text-sm text-primary">{pretty(degrees.join(" "))}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Parent scales containing this set
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {matches.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No scale in the library contains every note — this set is outside the standard
              collections.
            </span>
          ) : (
            matches.map((s) => (
              <Badge key={s.id} variant="outline" className="text-[11px]">
                {root.name} {s.name}
              </Badge>
            ))
          )}
        </div>
      </div>
      {detection.alternates.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Enharmonic / rotational readings
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {detection.alternates.map((a) => (
              <Badge key={a} variant="secondary" className="font-mono text-[11px]">
                {pretty(a)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- wrapper */

export function AdvancedTheory({
  root,
  degrees,
  scale,
  chord,
  seventh,
  onToggleSeventh,
  onPickScale,
  onPickDegrees,
}: {
  root: Root;
  degrees: Degree[];
  scale: ScaleDef;
  chord: ChordDef;
  seventh: boolean;
  onToggleSeventh: () => void;
  onPickScale: (scaleId: string, rootName?: string) => void;
  onPickDegrees: (degrees: Degree[]) => void;
}) {
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="intervals">
        <AccordionTrigger>Interval &amp; formula analysis</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <IntervalTable root={root} degrees={degrees} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              playSequence(
                degrees.map((d) => 48 + root.pc + degreeToSemitones(d)),
              )
            }
          >
            Hear the set ascending
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="parent">
        <AccordionTrigger>Parent scale &amp; enharmonic readings</AccordionTrigger>
        <AccordionContent>
          <ParentScalePanel root={root} degrees={degrees} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="tensions">
        <AccordionTrigger>Tensions &amp; avoid notes</AccordionTrigger>
        <AccordionContent>
          <TensionPanel
            scale={scale.degrees}
            chordDegrees={chord.degrees}
            chordLabel={`${root.name}${chord.suffix}`}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="chordscale">
        <AccordionTrigger>Chord-scale relationships</AccordionTrigger>
        <AccordionContent>
          <ChordScalePanel root={root} chord={chord} onPickScale={(id) => onPickScale(id)} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="modes">
        <AccordionTrigger>Relative &amp; parallel modes</AccordionTrigger>
        <AccordionContent>
          <ModeViews
            root={root}
            activeScale={scale}
            onPick={(id, rootName) => onPickScale(id, rootName)}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="harmonizer">
        <AccordionTrigger>Key harmonizer &amp; Roman numerals</AccordionTrigger>
        <AccordionContent>
          <Harmonizer
            root={root}
            scale={scale}
            seventh={seventh}
            onToggleSeventh={onToggleSeventh}
            onPick={(degs) => onPickDegrees(degs)}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="reference">
        <AccordionTrigger>Quick reference — modes &amp; library size</AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Seven major modes in order: {MAJOR_MODE_NAMES.join(", ")}. The library holds{" "}
            {SCALES.length} scales and {CHORDS.length} chord types, all spelled from degree
            formulas so enharmonics stay correct.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
