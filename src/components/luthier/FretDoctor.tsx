/**
 * The "Fret doctor": every fret problem in one place. Pick what the frets are doing and it opens
 * the guide that fixes it; below that, every fret job from a polish to a full refret. A small
 * pickup-height row sits underneath, since "how do I raise my pickups" is asked just as often.
 */
import { useEffect, useState } from "react";
import { ChevronDown, Magnet, Stethoscope } from "lucide-react";
import type { Guide } from "@/lib/luthier/types";
import { cn } from "@/lib/utils";

const KEY = "fretlab.luthier.fretdoctor.v1";

/** What the player notices → the guide that sorts it out. */
const SYMPTOMS: { id: string; label: string; hint: string }[] = [
  { id: "fr-problem-finder", label: "Not sure what's wrong", hint: "start here: find the fret problem" },
  { id: "fr-buzz-one-place", label: "Buzzes in one spot", hint: "one fret or one area only" },
  { id: "dx-fret-buzz", label: "Buzzes all over", hint: "relief, action, nut, then frets" },
  { id: "dx-choke-on-bends", label: "Notes die on bends", hint: "choking higher up the neck" },
  { id: "fr-find-high-fret", label: "A fret is high or loose", hint: "find it with a fret rocker" },
  { id: "fr-lifted-fret-ends", label: "Fret ends lifting", hint: "a gap under the end" },
  { id: "fn-fret-ends-sprout", label: "Sharp fret ends", hint: "they catch your hand" },
  { id: "fr-worn-frets-dress-or-refret", label: "Dents / worn frets", hint: "dress them or replace them?" },
  { id: "fr-intonation-from-frets", label: "Out of tune up the neck", hint: "when frets are the cause" },
  { id: "fr-rough-pitted-frets", label: "Rough, scratchy, dull", hint: "pitted or tarnished frets" },
  { id: "dx-string-off-edge", label: "Strings slip off the edge", hint: "high E or low E falls off" },
];

/** The jobs themselves, roughly smallest to biggest. */
const JOBS: { id: string; label: string }[] = [
  { id: "fn-fret-polish", label: "Polish" },
  { id: "fr-spot-level", label: "Spot level one fret" },
  { id: "fn-fret-reseat-replace", label: "Reseat / replace one fret" },
  { id: "fr-dress-fret-ends", label: "Dress fret ends" },
  { id: "fn-fret-level-crown-polish", label: "Level, crown & polish" },
  { id: "fr-fret-slot-repair", label: "Fix fret slots" },
  { id: "fr-remove-frets", label: "Pull frets" },
  { id: "fr-install-frets", label: "Install frets" },
  { id: "fr-partial-refret", label: "Partial refret" },
  { id: "fn-refret-rosewood-ebony", label: "Refret rosewood / ebony" },
  { id: "fn-refret-maple", label: "Refret maple" },
  { id: "fn-refret-bound", label: "Refret bound board" },
  { id: "fr-stainless-frets", label: "Stainless frets" },
  { id: "fr-compound-radius-multiscale", label: "Compound radius / fanned" },
  { id: "fr-acoustic-fretboard-extension", label: "Acoustic: frets over the top" },
  { id: "fn-fret-wire-choice", label: "Choose fret wire" },
  { id: "fr-plek-and-pro-fretwork", label: "PLEK / when to go pro" },
];

const PICKUPS: { id: string; label: string }[] = [
  { id: "pu-raise-lower-pickups", label: "Raise or lower pickups" },
  { id: "pu-pickup-wont-adjust", label: "Pickup won't go up / won't stay" },
  { id: "dx-pickup-height", label: "Height specs by brand" },
];

export function FretDoctor({ byId, onOpen, onSeeAll, count }: { byId: Map<string, Guide>; onOpen: (id: string) => void; onSeeAll: () => void; count: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "closed") setOpen(false);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        window.localStorage.setItem(KEY, o ? "closed" : "open");
      } catch {
        /* storage unavailable */
      }
      return !o;
    });
  const symptoms = SYMPTOMS.filter((s) => byId.has(s.id));
  const jobs = JOBS.filter((j) => byId.has(j.id));
  const pickups = PICKUPS.filter((p) => byId.has(p.id));
  if (!symptoms.length && !jobs.length) return null;

  return (
    <section className="panel overflow-hidden" data-testid="fret-doctor">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-left sm:p-4">
        <Stethoscope className="h-4 w-4 text-primary" />
        <span className="flex-1">
          <span className="block font-display text-sm font-semibold uppercase tracking-widest">Fret doctor</span>
          <span className="block text-xs text-muted-foreground">Every fret problem and fret job, in one place</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border p-3 sm:p-4">
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">What are your frets doing?</h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {symptoms.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className={cn(
                    "flex flex-col rounded-lg border p-2 text-left transition-colors hover:border-primary",
                    s.id === "fr-problem-finder" ? "border-primary/60 bg-primary/10" : "border-border bg-card/40",
                  )}
                  data-testid="fret-symptom"
                >
                  <span className="text-[13px] font-semibold leading-tight">{s.label}</span>
                  <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {jobs.length ? (
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fret jobs, small to big</h3>
              <div className="flex flex-wrap gap-1.5">
                {jobs.map((j) => (
                  <button key={j.id} type="button" onClick={() => onOpen(j.id)} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium hover:border-primary" data-testid="fret-job">
                    {j.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-primary underline-offset-2 hover:underline" data-testid="fret-see-all">
            See all {count} fret guides →
          </button>
          {pickups.length ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border p-2" data-testid="pickup-quick">
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <Magnet className="h-3.5 w-3.5 text-primary" /> Pickups:
              </span>
              {pickups.map((p) => (
                <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium hover:border-primary" data-testid="pickup-link">
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
