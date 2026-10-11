import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Ear, FlaskConical, Gamepad2, Music2, Search, SlidersHorizontal } from "lucide-react";
import { setDevMode, useDevMode } from "@/lib/devMode";
import { engine } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { InstallTip } from "./InstallTip";
import { WelcomeNote } from "./WelcomeNote";

const TABS = [
  { to: "/", label: "Explore", icon: Search },
  { to: "/sequencer", label: "Sequencer", icon: SlidersHorizontal },
  { to: "/listen", label: "Listen", icon: Ear },
  { to: "/play", label: "Play", icon: Gamepad2 },
] as const;
const DEV_TAB = { to: "/develop", label: "Develop", icon: FlaskConical } as const;

/** Dark app frame shared by every page: logo, the Explore / Sequencer / Listen tabs, and the page body. */
export function AppShell({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
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
  const tabs = dev ? [...TABS, DEV_TAB] : TABS;
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <InstallTip />
      <WelcomeNote />
      <header className="border-b border-border/70 bg-card/40">
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
          <nav aria-label="Sections" className="flex w-full gap-1 rounded-lg bg-secondary/60 p-1 sm:w-auto">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex-none sm:px-3",
                  dev ? "px-1.5" : "px-3",
                )}
                activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground", "aria-current": "page" }}
              >
                {/* Four tabs on a phone: drop the icons so the labels fit. */}
                <Icon className={cn("h-4 w-4 shrink-0", dev && "hidden sm:block")} aria-hidden />
                {label}
              </Link>
            ))}
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
