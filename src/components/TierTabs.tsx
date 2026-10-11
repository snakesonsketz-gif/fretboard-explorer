import { cn } from "@/lib/utils";
import { TIERS, TIER_COLOR, isTier, loadTier, saveTier, type Tier } from "@/lib/levels";

/** A difficulty tier, or every level at once. */
export type TierPick = Tier | "all";

const SHORT: Record<TierPick, string> = {
  beginner: "Begin",
  intermediate: "Inter",
  advanced: "Adv",
  expert: "Expert",
  all: "All",
};

// loadTier/saveTier only hold real tiers, so "All" is remembered under its own key.
const ALL_KEY = "fretlab.tier.all.v1";
function readAll(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(ALL_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function loadTierPick(scope: string): TierPick {
  if (readAll()[scope]) return "all";
  return loadTier(scope, "beginner");
}

export function saveTierPick(scope: string, pick: TierPick) {
  try {
    const all = readAll();
    all[scope] = pick === "all";
    window.localStorage.setItem(ALL_KEY, JSON.stringify(all));
  } catch {
    /* not remembered */
  }
  if (isTier(pick)) saveTier(scope, pick);
}

/** Does an item at tier `t` show under the pick? */
export const inPick = (t: Tier, pick: TierPick) => pick === "all" || t === pick;

/** Is tier `t` at or below the pick (cumulative)? */
export const atOrBelow = (t: Tier, pick: TierPick) =>
  pick === "all" || TIERS.findIndex((x) => x.id === t) <= TIERS.findIndex((x) => x.id === pick);

type Props = {
  value: TierPick;
  onChange: (v: TierPick) => void;
  counts: Record<TierPick, number>;
  /** Plural noun for the summary line, e.g. "chords". */
  noun: string;
  searching?: boolean;
};

/** Beginner | Intermediate | Advanced | Expert | All — a sub-tab row under the library tabs. */
export function TierTabs({ value, onChange, counts, noun, searching }: Props) {
  const opts: TierPick[] = [...TIERS.map((t) => t.id), "all"];
  const info = TIERS.find((t) => t.id === value);
  return (
    <div className="space-y-1.5">
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          role="tablist"
          aria-label={`${noun} by level`}
          className="flex h-9 min-w-max items-center gap-0.5 rounded-lg bg-muted p-1 text-muted-foreground sm:min-w-0"
        >
          {opts.map((o) => {
            const active = o === value && !searching;
            const name = o === "all" ? "All" : TIERS.find((t) => t.id === o)!.name;
            return (
              <button
                key={o}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(o)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:text-sm",
                  active ? "bg-background text-foreground shadow" : "hover:text-foreground",
                )}
              >
                {o !== "all" ? (
                  <span
                    aria-hidden
                    className="mr-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TIER_COLOR[o], opacity: active ? 1 : 0.55 }}
                  />
                ) : null}
                <span className="sm:hidden">{SHORT[o]}</span>
                <span className="hidden sm:inline">{name}</span>
                <span className="text-[9px] tabular-nums opacity-60 sm:text-[10px]">{counts[o]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {searching
          ? "Searching all levels"
          : info
            ? `${info.name} · ${info.blurb} · ${counts[value]} ${noun}`
            : `All levels · ${counts.all} ${noun}`}
      </p>
    </div>
  );
}
