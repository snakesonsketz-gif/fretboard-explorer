import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { loadFavorites, type Favorite } from "@/lib/favorites";
import { TIERS, TIER_COLOR, loadTier, saveTier, type Tier } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { neonCard, neonText } from "./neon";

/** A game's difficulty, remembered per game. */
export function useTier(scope: string): [Tier, (t: Tier) => void] {
  const [tier, setTier] = useState<Tier>("beginner");
  useEffect(() => setTier(loadTier(scope)), [scope]);
  return [tier, (t) => (setTier(t), saveTier(scope, t))];
}

/** An on/off setting remembered on this device. */
export function useRemembered(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(initial);
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(key);
      if (s !== null) setV(s === "1");
    } catch {
      /* default */
    }
  }, [key]);
  return [v, (x) => {
    setV(x);
    try {
      window.localStorage.setItem(key, x ? "1" : "0");
    } catch {
      /* not remembered */
    }
  }];
}

/** The chords saved on the Explore tab (read when the game opens). */
export function useSavedChords(): Favorite[] {
  const [favs, setFavs] = useState<Favorite[]>([]);
  useEffect(() => setFavs(loadFavorites().filter((f) => f.mode === "chord")), []);
  return favs;
}

/** Pick the difficulty before a game starts: four neon cards. */
export function TierPicker({ value, onChange, bests, label = "Difficulty", note }: { value: Tier; onChange: (t: Tier) => void; bests?: Partial<Record<Tier, number | string>>; label?: string; note?: (t: Tier) => string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={label}>
        {TIERS.map((t) => {
          const on = t.id === value, c = TIER_COLOR[t.id];
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(t.id)} data-testid={`tier-${t.id}`}
              className={cn("rounded-lg border-2 px-2.5 py-2 text-left transition-transform active:scale-95", !on && "opacity-70")}
              style={on ? neonCard(c) : { borderColor: `${c}55`, background: "#0b0b16" }}>
              <span className="flex items-baseline justify-between gap-1">
                <span className="font-display text-sm font-black" style={on ? neonText(c) : { color: c }}>{t.name}</span>
                {bests?.[t.id] ? <span className="font-mono text-[10px] text-muted-foreground">best {bests[t.id]}</span> : null}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">{note ? note(t.id) : t.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Include my saved chords" — with how many of them fit the chosen difficulty. */
export function MineToggle({ checked, onChange, count, tier, what = "chords" }: { checked: boolean; onChange: (v: boolean) => void; count: number; tier: Tier; what?: string }) {
  const name = TIERS.find((t) => t.id === tier)!.name;
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={`Include my saved ${what}`} data-testid="mine-toggle" />
      <Star className="h-3.5 w-3.5" style={{ color: "#ffe600" }} />
      Include my saved {what}
      <span className="font-mono" style={{ color: count ? "#ffe600" : undefined }}>
        {count ? `${count} at ${name}` : `none saved at ${name} yet — save some on Explore`}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------- picking which chords play

const OFF_KEY = "fretlab.games.off.v1";
/** The chords switched off for one game and level (remembered on this device). */
export function useSwitchedOff(scope: string): [Set<string>, (name: string, all: readonly string[]) => void, () => void] {
  const [off, setOff] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const all = JSON.parse(window.localStorage.getItem(OFF_KEY) ?? "{}") as Record<string, string[]>;
      setOff(new Set(all[scope] ?? []));
    } catch {
      setOff(new Set());
    }
  }, [scope]);
  const store = (next: Set<string>) => {
    setOff(next);
    try {
      const all = JSON.parse(window.localStorage.getItem(OFF_KEY) ?? "{}") as Record<string, string[]>;
      if (next.size) all[scope] = [...next];
      else delete all[scope];
      window.localStorage.setItem(OFF_KEY, JSON.stringify(all));
    } catch {
      /* not remembered */
    }
  };
  /** Switch one on or off; at least two always stay on. */
  const toggle = (name: string, all: readonly string[]) => {
    const next = new Set(off);
    if (next.has(name)) next.delete(name);
    else if (all.filter((n) => !next.has(n)).length > 2) next.add(name);
    else return;
    store(next);
  };
  return [off, toggle, () => store(new Set())];
}

/** Tap a chord to switch it on or off for this game. On = lit in its colour; off = dark and crossed out. */
export function ChordToggles({ names, off, onToggle, onAll, label, colorOf, title = "Chords in this game", testId = "chord-toggle" }: {
  names: readonly string[]; off: Set<string>; onToggle: (n: string) => void; onAll: () => void; label: (n: string) => string; colorOf: (n: string) => string; title?: string; testId?: string;
}) {
  const on = names.filter((n) => !off.has(n)).length;
  return (
    <div className="space-y-1.5 rounded-md border p-2" style={{ borderColor: "#2a1f4d", background: "#0b0b16" }}>
      <p className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {title} <span className="font-mono normal-case tracking-normal" style={{ color: "#ffe600" }}>{on} of {names.length} on</span>
        <span className="normal-case tracking-normal">· tap to switch on/off</span>
        {off.size ? <button type="button" className="ml-auto normal-case tracking-normal underline" onClick={onAll}>All on</button> : null}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => {
          const isOn = !off.has(n), c = colorOf(n);
          return (
            <button key={n} type="button" aria-pressed={isOn} onClick={() => onToggle(n)} data-testid={testId} data-id={n}
              className={cn("rounded-md border-2 px-2 py-0.5 font-display text-xs font-black transition-all active:scale-95", !isOn && "line-through")}
              style={isOn ? { borderColor: c, color: c, background: `${c}1a`, textShadow: `0 0 6px ${c}` } : { borderColor: "#2a1f4d", color: "#55556e" }}>
              {n.startsWith("my:") ? "★ " : ""}{label(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
