import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, Ear, FileMusic, FlaskConical, Gamepad2, Gauge, Hammer, Music2, ScanSearch, Search, SlidersHorizontal } from "lucide-react";
import { setDevMode, useDevMode } from "@/lib/devMode";
import { engine } from "@/lib/engine";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Explore", icon: Search },
  { to: "/grimoire", label: "Grimoire", icon: BookOpen },
  { to: "/tuner", label: "Tuner", icon: Gauge },
  { to: "/tabs", label: "Tabs", icon: FileMusic },
  { to: "/finder", label: "Finder", icon: ScanSearch },
  { to: "/sequencer", label: "Sequencer", icon: SlidersHorizontal },
  { to: "/listen", label: "Listen", icon: Ear },
  { to: "/play", label: "Play", icon: Gamepad2 },
] as const;
const DEV_TABS = [
  { to: "/develop", label: "Develop", icon: FlaskConical },
  { to: "/luthier", label: "Luthier", icon: Hammer },
] as const;

/** The Grimoire tab's own look: gothic red lettering on black, glowing when you're in the room. */
const GRIMOIRE_RED = "#ff3842";

/** Dark app frame shared by every page: logo, the section tabs, and the page body. `room` dresses the frame for a special room. */
export function AppShell({ children, headerRight, room }: { children: ReactNode; headerRight?: ReactNode; room?: "grimoire" }) {
  const dev = useDevMode();
  // Load the sound library while the page is idle, so the first tap plays straight away.
  useEffect(() => {
    const id = window.setTimeout(() => engine.preload(), 1500);
    return () => window.clearTimeout(id);
  }, []);
  const taps = useRef<number[]>([]);
  const [devNote, setDevNote] = useState<string | null>(null);
  // Five quick taps on the logo switch developer mode (the Develop tab) on or off.
  const onLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length < 5) return;
    taps.current = [];
    setDevMode(!dev);
    setDevNote(dev ? "Develop tab hidden" : "Develop tab on");
    window.setTimeout(() => setDevNote(null), 2500);
  };
  const navigate = useNavigate();
  const path = useRouterState({ select: (st) => st.location.pathname });
  /** The Dev mode button: on = show the Develop tab and go there; off = hide it (leave it if open). */
  const toggleDev = () => {
    const on = !dev;
    setDevMode(on);
    if (on) void navigate({ to: "/develop" });
    else if (path === "/develop") void navigate({ to: "/" });
  };
  const tabs = dev ? [...TABS, ...DEV_TABS] : TABS;
  return (
    <div className={cn("dark min-h-screen text-foreground", room === "grimoire" ? "bg-[#070404]" : "bg-background")}>
      <header className={cn("border-b", room === "grimoire" ? "border-[#5a1219] bg-[#0b0707]" : "border-border/70 bg-card/40")}
        style={room === "grimoire" ? { boxShadow: "0 1px 18px rgba(255,48,58,0.25)" } : undefined}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 touch-manipulation select-none place-items-center rounded-xl bg-primary text-primary-foreground" onClick={onLogoTap} data-testid="logo">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black tracking-tight sm:text-xl">Fretlab</h1>
              <p className="truncate text-xs text-muted-foreground" aria-live="polite">{devNote ?? "You create · it analyses · you decide"}</p>
            </div>
            <button
              type="button"
              onClick={toggleDev}
              aria-pressed={dev}
              data-testid="dev-mode"
              title={dev ? "Developer mode is on — tap to hide the Develop tab" : "Developer mode: show the Develop tab (Listen tuning lab)"}
              className={cn(
                "ml-auto flex shrink-0 touch-manipulation items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                dev ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Dev mode{dev ? " on" : ""}
            </button>
          </div>
          {headerRight ? <div className="shrink-0 sm:order-last">{headerRight}</div> : null}
          {/* Phones and small tablets: the tabs sit in two even rows so every label fits; one row from md up. */}
          <nav
            aria-label="Sections"
            className="grid w-full gap-0.5 rounded-lg bg-secondary/60 p-1 md:flex md:w-auto md:gap-1 md:overflow-x-auto"
            style={{ gridTemplateColumns: `repeat(${Math.ceil(tabs.length / 2)}, minmax(0, 1fr))` }}
          >
            {tabs.map(({ to, label, icon: Icon }) =>
              to === "/grimoire" ? (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: true }}
                  data-testid="tab-grimoire"
                  className="font-grimoire flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[17px] leading-none tracking-wide transition-colors sm:flex-none sm:px-3 sm:text-lg"
                  style={{ color: GRIMOIRE_RED, textShadow: "0 0 8px rgba(255,48,58,0.55)", background: "#0b0707" }}
                  activeProps={{ "aria-current": "page", style: { color: "#ffd9d6", background: "linear-gradient(160deg, #3a0a10, #120b0b)", borderColor: "#d42532", boxShadow: "0 0 12px rgba(255,48,58,0.55), inset 0 0 10px rgba(255,48,58,0.25)", textShadow: "0 0 10px #ff3842, 0 0 22px #ff3842" } }}
                >
                  <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
                  {label}
                </Link>
              ) : (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: true }}
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex-none sm:px-3 sm:text-sm"
                  activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground", "aria-current": "page" }}
                >
                  {/* On a phone: no icons, so the labels fit. */}
                  <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
                  {label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

/** Honest placeholder for a section that is still being built. */
export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="panel space-y-3 p-6">
        <p className="text-xs uppercase tracking-widest text-primary">Being built</p>
        <h2 className="font-display text-2xl font-black">{title}</h2>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </section>
    </main>
  );
}
