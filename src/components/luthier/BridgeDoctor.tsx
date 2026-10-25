/**
 * The "Bridge doctor": pick the bridge on your guitar and get its setup, intonation and repair
 * guides together; or start from what's wrong with it. Links show only for guides that exist.
 */
import { useEffect, useState } from "react";
import { ChevronDown, Wrench } from "lucide-react";
import type { Guide } from "@/lib/luthier/types";
import { cn } from "@/lib/utils";

const KEY = "fretlab.luthier.bridgedoctor.v1";

type Link = { id: string; label: string; kind: "setup" | "intonate" | "fix" };
const BRIDGES: { id: string; name: string; examples: string; links: Link[] }[] = [
  {
    id: "strat",
    name: "Strat tremolo",
    examples: "vintage 6-screw, 2-point",
    links: [
      { id: "bt-strat-vintage-trem", label: "Set up a vintage trem", kind: "setup" },
      { id: "bt-strat-2point-trem", label: "Set up a 2-point trem", kind: "setup" },
      { id: "br-intonate-strat-hardtail", label: "Intonate Strat saddles", kind: "intonate" },
      { id: "bt-trem-springs-claw", label: "Springs & claw", kind: "fix" },
      { id: "br-worn-knife-edges-posts", label: "Worn pivots / won't return", kind: "fix" },
    ],
  },
  {
    id: "hardtail",
    name: "Hardtail / string-through",
    examples: "Fender hardtail, Hipshot, Gotoh",
    links: [{ id: "br-intonate-strat-hardtail", label: "Intonate a hardtail", kind: "intonate" }],
  },
  {
    id: "tele",
    name: "Telecaster",
    examples: "3 brass barrels, 6-saddle",
    links: [
      { id: "bt-tele-bridge", label: "Set up / upgrade", kind: "setup" },
      { id: "br-intonate-tele", label: "Intonate 3 or 6 saddles", kind: "intonate" },
    ],
  },
  {
    id: "tom",
    name: "Tune-o-matic + stopbar",
    examples: "Les Paul, SG, 335 (ABR-1, Nashville)",
    links: [
      { id: "bt-tom-setup", label: "Set up a Tune-o-matic", kind: "setup" },
      { id: "bt-stopbar-height-topwrap", label: "Stopbar height & top-wrap", kind: "setup" },
      { id: "br-intonate-tom-wraparound", label: "Intonate (flip saddles)", kind: "intonate" },
      { id: "br-tom-collapse-fix", label: "Sagging bridge / leaning posts", kind: "fix" },
      { id: "bt-tom-notch-saddles", label: "Notch saddles", kind: "fix" },
    ],
  },
  {
    id: "wrap",
    name: "Wraparound",
    examples: "Les Paul Junior, PRS stoptail",
    links: [
      { id: "bt-wraparound-bridge", label: "Set up a wraparound", kind: "setup" },
      { id: "br-intonate-tom-wraparound", label: "Intonate a wraparound", kind: "intonate" },
    ],
  },
  {
    id: "floyd",
    name: "Floyd Rose / Edge",
    examples: "double-locking",
    links: [
      { id: "bt-floyd-balance-setup", label: "Balance & set up", kind: "setup" },
      { id: "bt-ibanez-edge-zr", label: "Ibanez Edge / ZR", kind: "setup" },
      { id: "bt-floyd-intonation", label: "Intonate a Floyd", kind: "intonate" },
      { id: "bt-floyd-knife-edges-studs", label: "Worn knife edges & studs", kind: "fix" },
    ],
  },
  {
    id: "prs",
    name: "PRS tremolo",
    examples: "Gen III, 2D/2-post",
    links: [
      { id: "bt-prs-trem", label: "Set up a PRS trem", kind: "setup" },
      { id: "br-intonate-strat-hardtail", label: "Intonate the saddles", kind: "intonate" },
    ],
  },
  {
    id: "offset",
    name: "Jazzmaster, Jaguar, Mustang",
    examples: "rocking bridges, Mastery",
    links: [
      { id: "bt-jazzmaster-jaguar-mustang", label: "Set up the vibrato", kind: "setup" },
      { id: "br-intonate-floating-vintage", label: "Intonate a rocking bridge", kind: "intonate" },
    ],
  },
  {
    id: "bigsby",
    name: "Bigsby",
    examples: "B3, B5, B7, B16",
    links: [
      { id: "bt-bigsby-stringing-setup", label: "String & set up", kind: "setup" },
      { id: "br-intonate-floating-vintage", label: "Intonate with a Bigsby", kind: "intonate" },
    ],
  },
  {
    id: "archtop",
    name: "Archtop floating bridge",
    examples: "Gretsch, jazz boxes",
    links: [
      { id: "bt-archtop-floating-bridge", label: "Place & fit the bridge", kind: "setup" },
      { id: "ac-archtop-bridge", label: "Height & fitting", kind: "setup" },
      { id: "br-intonate-floating-vintage", label: "Intonate by placement", kind: "intonate" },
    ],
  },
  {
    id: "acoustic",
    name: "Acoustic (steel-string)",
    examples: "pin bridge + saddle",
    links: [
      { id: "ac-saddle-height", label: "Raise / lower the saddle", kind: "setup" },
      { id: "ac-bone-saddle", label: "Make a bone saddle", kind: "setup" },
      { id: "br-intonate-acoustic-classical", label: "Intonate (compensate the saddle)", kind: "intonate" },
      { id: "ac-bridge-lifting", label: "Bridge lifting", kind: "fix" },
      { id: "ac-bridge-pins", label: "Bridge pins", kind: "fix" },
      { id: "ac-bridge-plate", label: "Worn bridge plate", kind: "fix" },
    ],
  },
  {
    id: "classical",
    name: "Classical / nylon",
    examples: "tie-block bridge",
    links: [
      { id: "ac-classical-setup", label: "Classical setup", kind: "setup" },
      { id: "br-intonate-acoustic-classical", label: "Intonate a nylon guitar", kind: "intonate" },
    ],
  },
  {
    id: "bass",
    name: "Bass",
    examples: "Fender, BadAss, Hipshot, 5-string",
    links: [
      { id: "bs-fender-bass-setup", label: "Set up a bass", kind: "setup" },
      { id: "br-intonate-bass", label: "Intonate a bass", kind: "intonate" },
      { id: "bs-low-string-intonation", label: "Low B won't intonate", kind: "fix" },
    ],
  },
  {
    id: "ric",
    name: "Rickenbacker",
    examples: "330, 360, 4003",
    links: [
      { id: "bt-rickenbacker-bridge", label: "Bridge adjustment", kind: "setup" },
      { id: "br-intonate-bass", label: "4003 bass intonation", kind: "intonate" },
    ],
  },
  {
    id: "headless",
    name: "Headless, fanned, Kahler, EverTune",
    examples: "Strandberg, Steinberger, multiscale",
    links: [
      { id: "bt-kahler-headless-evertune", label: "Basics & setup", kind: "setup" },
      { id: "br-intonate-multiscale-headless", label: "Intonate fanned / headless", kind: "intonate" },
    ],
  },
];

const PROBLEMS: { id: string; label: string }[] = [
  { id: "br-bridge-doctor", label: "Not sure? Find the fix" },
  { id: "br-intonate-any-bridge", label: "Out of tune up the neck" },
  { id: "dx-intonation", label: "Saddle runs out of travel" },
  { id: "br-bridge-rattle-buzz", label: "Bridge rattles or buzzes" },
  { id: "br-strings-break-at-bridge", label: "Strings keep breaking" },
  { id: "br-seized-stripped-bridge-screws", label: "Seized / stripped screws" },
  { id: "br-tom-collapse-fix", label: "Bridge sagging or leaning" },
  { id: "br-replace-upgrade-bridge", label: "Replace / upgrade a bridge" },
];

const KIND: Record<Link["kind"], { name: string; cls: string }> = {
  setup: { name: "Set up", cls: "border-border" },
  intonate: { name: "Intonate", cls: "border-primary/60 bg-primary/10" },
  fix: { name: "Fix", cls: "border-third/50" },
};

export function BridgeDoctor({ byId, onOpen }: { byId: Map<string, Guide>; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "closed") setOpen(false);
      else if (v && v.startsWith("pick:")) setPick(v.slice(5));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const save = (v: string) => {
    try {
      window.localStorage.setItem(KEY, v);
    } catch {
      /* storage unavailable */
    }
  };
  const bridges = BRIDGES.map((b) => ({ ...b, links: b.links.filter((l) => byId.has(l.id)) })).filter((b) => b.links.length);
  const problems = PROBLEMS.filter((p) => byId.has(p.id));
  const cur = bridges.find((b) => b.id === pick);
  if (!bridges.length) return null;

  return (
    <section className="panel overflow-hidden" data-testid="bridge-doctor">
      <button
        type="button"
        onClick={() =>
          setOpen((o) => {
            save(o ? "closed" : "open");
            return !o;
          })
        }
        aria-expanded={open}
        className="flex w-full items-center gap-2 p-3 text-left sm:p-4"
      >
        <Wrench className="h-4 w-4 text-primary" />
        <span className="flex-1">
          <span className="block font-display text-sm font-semibold uppercase tracking-widest">Bridge doctor</span>
          <span className="block text-xs text-muted-foreground">Set up, intonate and fix every kind of bridge</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border p-3 sm:p-4">
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Which bridge is on your guitar?</h3>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Bridge type">
              {bridges.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={pick === b.id}
                  onClick={() => {
                    const next = pick === b.id ? null : b.id;
                    setPick(next);
                    save(next ? `pick:${next}` : "open");
                  }}
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", pick === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60")}
                  data-testid="bridge-type"
                >
                  {b.name}
                </button>
              ))}
            </div>
            {cur ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-2.5" data-testid="bridge-links">
                <p className="text-xs text-muted-foreground">
                  <b className="text-foreground">{cur.name}</b> · {cur.examples}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {cur.links.map((l) => (
                    <button key={l.id + l.label} type="button" onClick={() => onOpen(l.id)} className={cn("flex items-baseline gap-2 rounded-lg border p-2 text-left text-[13px] font-semibold transition-colors hover:border-primary", KIND[l.kind].cls)} data-testid="bridge-link">
                      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{KIND[l.kind].name}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Pick one to see how to set it up, intonate it and fix it.</p>
            )}
          </div>
          {problems.length ? (
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Or start from the problem</h3>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {problems.map((p) => (
                  <button key={p.id} type="button" onClick={() => onOpen(p.id)} className={cn("rounded-lg border p-2 text-left text-[13px] font-semibold leading-tight hover:border-primary", p.id === "br-bridge-doctor" ? "border-primary/60 bg-primary/10" : "border-border bg-card/40")} data-testid="bridge-problem">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
