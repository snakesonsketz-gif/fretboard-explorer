import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { TabActiveContext } from "@/lib/tabActive";
import { DevelopPage } from "@/routes/develop";
import { GrimoirePage } from "@/routes/grimoire";
import { Workstation } from "@/routes/index";
import { ListenPage } from "@/routes/listen";
import { LuthierPage } from "@/routes/luthier";
import { PlayPage } from "@/routes/play";
import { SequencerPage } from "@/routes/sequencer";
import { TunerPage } from "@/routes/tuner";
import { InstallTip } from "./InstallTip";
import { WelcomeNote } from "./WelcomeNote";

/** The main tabs: once opened, each stays mounted (hidden when not on screen) so it keeps its state. */
const TABS: Record<string, ComponentType> = {
  "/": Workstation,
  "/grimoire": GrimoirePage,
  "/tuner": TunerPage,
  "/sequencer": SequencerPage,
  "/listen": ListenPage,
  "/play": PlayPage,
  "/develop": DevelopPage,
  "/luthier": LuthierPage,
};

/**
 * Renders the app's tabs. Switching tabs hides the old one instead of throwing it away, so
 * Explore keeps its chord, Grimoire its wheel, Play its game settings — and each tab comes back at
 * the same scroll position. Other pages (not found) render normally.
 */
export function TabHost() {
  const path = useRouterState({ select: (s) => s.location.pathname.replace(/\/+$/, "") || "/" });
  const [visited, setVisited] = useState<string[]>(() => (TABS[path] ? [path] : []));
  useEffect(() => {
    if (TABS[path]) setVisited((v) => (v.includes(path) ? v : [...v, path]));
  }, [path]);

  // Scroll position per tab.
  const scrolls = useRef<Record<string, number>>({});
  const current = useRef(path);
  useEffect(() => {
    const onScroll = () => (scrolls.current[current.current] = window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useLayoutEffect(() => {
    if (current.current === path) return;
    current.current = path;
    const y = scrolls.current[path] ?? 0;
    window.scrollTo(0, y);
    // Once the tab has laid out (a tab opened for the first time may still be growing).
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [path]);

  // The first render matches the pre-rendered page exactly (the router's own outlet); the tabs
  // take over right after, so hydration never sees a different page.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready)
    return (
      <>
        <InstallTip />
        <WelcomeNote />
        <Outlet />
      </>
    );

  const shown = visited.includes(path) ? visited : TABS[path] ? [...visited, path] : visited;
  return (
    <>
      <InstallTip />
      <WelcomeNote />
      {shown.map((p) => {
        const Page = TABS[p]!;
        const on = p === path;
        return (
          <div key={p} hidden={!on} data-tab={p}>
            <TabActiveContext.Provider value={on}>
              <Page />
            </TabActiveContext.Provider>
          </div>
        );
      })}
      {TABS[path] ? null : <Outlet />}
    </>
  );
}
