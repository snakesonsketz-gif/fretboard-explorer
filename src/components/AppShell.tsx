import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Ear, Music2, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstallTip } from "./InstallTip";

const TABS = [
  { to: "/", label: "Explore", icon: Search },
  { to: "/sequencer", label: "Sequencer", icon: SlidersHorizontal },
  { to: "/listen", label: "Listen", icon: Ear },
] as const;

/** Dark app frame shared by every page: logo, the Explore / Sequencer / Listen tabs, and the page body. */
export function AppShell({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <InstallTip />
      <header className="border-b border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black tracking-tight sm:text-xl">Fretlab</h1>
              <p className="truncate text-xs text-muted-foreground">You create · it analyses · you decide</p>
            </div>
          </div>
          {headerRight ? <div className="shrink-0 sm:order-last">{headerRight}</div> : null}
          <nav aria-label="Sections" className="flex w-full gap-1 rounded-lg bg-secondary/60 p-1 sm:w-auto">
            {TABS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex-none",
                )}
                activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground", "aria-current": "page" }}
              >
                <Icon className="h-4 w-4" aria-hidden />
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
