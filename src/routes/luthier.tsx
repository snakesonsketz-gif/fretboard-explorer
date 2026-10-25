import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Image as ImageIcon, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { diagramsFor } from "@/components/luthier/diagrams";
import { LuthierPaints } from "@/components/luthier/diagrams/kit";
import { BridgeDoctor } from "@/components/luthier/BridgeDoctor";
import { FretDoctor } from "@/components/luthier/FretDoctor";
import { Difficulty, GuideView } from "@/components/luthier/GuideView";
import { HowToUse } from "@/components/luthier/HowToUse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDevMode, useDevMode } from "@/lib/devMode";
import { APPLIES, appliesTo, CATEGORIES, search, type ColorScheme, type Guide } from "@/lib/luthier/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/luthier")({
  head: () => ({ meta: [{ title: "Luthier guide — Fretlab" }] }),
  component: LuthierPage,
});

interface Data {
  guides: Guide[];
  colors: ColorScheme[];
}

/** Dev mode: the luthier guide — diagnose, set up, repair, modify and wire any guitar. */
export function LuthierPage() {
  const dev = useDevMode();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picturesOnly, setPicturesOnly] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // The guides are big, so they load only when the tab is opened in Dev mode.
  useEffect(() => {
    if (!dev || data) return;
    let live = true;
    Promise.all([import("@/lib/luthier/guides.json"), import("@/lib/luthier/colors.json")])
      .then(([g, c]) => live && setData({ guides: g.default as unknown as Guide[], colors: c.default as unknown as ColorScheme[] }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [dev, data]);

  const byId = useMemo(() => new Map((data?.guides ?? []).map((g) => [g.id, g])), [data]);
  const filtered = useMemo(() => {
    if (!data) return [];
    const list = data.guides.filter((g) => (!cat || g.category === cat) && appliesTo(g, type) && (!picturesOnly || diagramsFor(g.id).length > 0));
    return search(list, query);
  }, [data, cat, type, query, picturesOnly]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of data?.guides ?? []) if (appliesTo(g, type)) m.set(g.category, (m.get(g.category) ?? 0) + 1);
    return m;
  }, [data, type]);

  const open = (id: string | null) => {
    setOpenId(id);
    top.current?.scrollIntoView({ block: "start" });
  };
  const guide = openId ? byId.get(openId) : undefined;

  if (!dev)
    return (
      <AppShell>
        <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
          <section className="panel space-y-3 p-6">
            <h2 className="font-display text-2xl font-black">Luthier guide</h2>
            <p className="text-sm text-muted-foreground">The luthier guide is part of Dev mode.</p>
            <Button onClick={() => setDevMode(true)}>Turn on Dev mode</Button>
          </section>
        </main>
      </AppShell>
    );

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4" data-testid="luthier">
        <LuthierPaints />
        <div ref={top} className="scroll-mt-4" />
        {guide ? (
          <GuideView guide={guide} byId={byId} colors={data?.colors ?? []} onOpen={open} onBack={() => open(null)} />
        ) : (
          <>
            <section className="panel space-y-3 p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-black">Luthier guide</h2>
                <span className="text-xs text-muted-foreground">{data ? `${data.guides.length} guides · researched from makers' specs and professional luthiers` : failed ? "" : "Loading…"}</span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What's wrong, or what do you want to do? e.g. buzz, coil split, Floyd, crack"
                  className="h-11 pl-9"
                  aria-label="Search the guides"
                  data-testid="luthier-search"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={type ?? "any"} onValueChange={(v) => setType(v === "any" ? null : v)}>
                  <SelectTrigger className="h-9 w-56" aria-label="Guitar type" data-testid="luthier-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="any">Every kind of guitar</SelectItem>
                    {APPLIES.filter(([id]) => id !== "all").map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cat || type || query || picturesOnly ? (
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => {
                      setCat(null);
                      setType(null);
                      setQuery("");
                      setPicturesOnly(false);
                    }}>
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={cat === c.id}
                    onClick={() => setCat(cat === c.id ? null : c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                    )}
                    data-testid={`luthier-cat-${c.id}`}
                  >
                    {c.name} <span className="opacity-60">{counts.get(c.id) ?? 0}</span>
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={picturesOnly}
                  onClick={() => setPicturesOnly((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    picturesOnly ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-primary/60 text-primary hover:border-primary",
                  )}
                  data-testid="luthier-pictures-only"
                >
                  <ImageIcon className="h-3 w-3" /> With pictures
                </button>
              </div>
            </section>

            {data && !query && (!cat || cat === "frets") ? (
              <FretDoctor byId={byId} onOpen={open} count={counts.get("frets") ?? 0} onSeeAll={() => {
                  setCat("frets");
                  setTimeout(() => document.querySelector('[data-testid="luthier-list"]')?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
                }} />
            ) : null}
            {data && !query && (!cat || cat === "bridges-trem") ? <BridgeDoctor byId={byId} onOpen={open} /> : null}

            <HowToUse onOpen={open} />

            {failed ? <p className="panel p-4 text-sm text-third">Couldn't load the guides. Check your connection and reopen the tab.</p> : null}
            {data && !filtered.length ? <p className="panel p-4 text-sm text-muted-foreground">No guide matches that. Try fewer or different words.</p> : null}

            <ul className="grid gap-2 sm:grid-cols-2" data-testid="luthier-list">
              {filtered.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={() => open(g.id)} className="panel flex h-full w-full flex-col gap-1.5 p-3 text-left transition-colors hover:border-primary/60" data-testid="luthier-card">
                    <span className="text-[10px] uppercase tracking-widest text-primary">{CATEGORIES.find((c) => c.id === g.category)?.name}</span>
                    <span className="font-display text-base font-bold leading-tight">{g.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{g.summary}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                      <Difficulty level={g.difficulty} />
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" /> {g.time}
                      </span>
                      {diagramsFor(g.id).length ? (
                        <span className="inline-flex items-center gap-1 text-primary" title="Has pictures">
                          <ImageIcon className="h-3 w-3" /> {diagramsFor(g.id).length}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
