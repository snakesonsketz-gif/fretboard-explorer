import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Check, Clock, ExternalLink, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIAGRAMS, diagramsFor } from "@/components/luthier/diagrams";
import { APPLIES_NAME, CATEGORIES, DIFFICULTY, segments, swatch, tokensIn, type ColorScheme, type Guide } from "@/lib/luthier/types";
import { cn } from "@/lib/utils";

const DONE_KEY = (id: string) => `fretlab.luthier.done.${id}`;
const BRAND_KEY = "fretlab.luthier.brands.v1";

function loadDone(id: string): number[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(DONE_KEY(id)) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

/** Text with guide references like "[fn-fret-level]" turned into links. */
function Linked({ text, byId, onOpen }: { text: string; byId: Map<string, Guide>; onOpen: (id: string) => void }) {
  const parts: ReactNode[] = [];
  const re = /\[([a-z]{2}-[a-z0-9-]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const g = byId.get(m[1]!);
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      g ? (
        <button key={m.index} type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => onOpen(g.id)}>
          {g.title}
        </button>
      ) : (
        <span key={m.index}>{m[0]}</span>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Wire({ label, colors }: { label: string; colors: string[] }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded border border-border bg-secondary/60 px-1.5 py-px align-baseline text-[0.85em] font-semibold" data-testid="wire-token">
      {colors.length ? (
        <>
          {colors.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">+</span> : null}
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-black/40" style={{ background: swatch(c) }} aria-hidden />
              {c}
            </span>
          ))}
          <span className="font-normal text-muted-foreground">({label})</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel space-y-2 p-3 sm:p-4", className)}>
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest">{title}</h3>
      {children}
    </section>
  );
}

export function Difficulty({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Difficulty: ${DIFFICULTY[level]}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-1.5 w-3 rounded-full", i <= level ? (level >= 4 ? "bg-third" : "bg-primary") : "bg-border")} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{DIFFICULTY[level]}</span>
    </span>
  );
}

/** One guide: what's wrong, why, what you need, and the steps as a checklist. */
export function GuideView({ guide: g, byId, colors, onOpen, onBack }: { guide: Guide; byId: Map<string, Guide>; colors: ColorScheme[]; onOpen: (id: string) => void; onBack: () => void }) {
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => setDone(loadDone(g.id)), [g.id]);
  const toggle = (i: number) =>
    setDone((d) => {
      const next = d.includes(i) ? d.filter((x) => x !== i) : [...d, i];
      try {
        window.localStorage.setItem(DONE_KEY(g.id), JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const tokens = useMemo(() => tokensIn(g), [g]);
  const pictures = useMemo(() => diagramsFor(g.id), [g.id]);
  const hbPicture = pictures.some((k) => k.startsWith("hb-") || ["wire-single-hb", "wire-les-paul", "wire-coil-split"].includes(k));
  const scPicture = pictures.some((k) => ["wire-strat", "wire-tele", "wire-jazz-bass"].includes(k));
  const needHb = hbPicture || ["hot", "ground", "link", "nFinish", "sFinish", "bare"].some((t) => tokens.has(t));
  const needSc = scPicture || tokens.has("scHot") || tokens.has("scGround");
  const hbSchemes = colors.filter((c) => c.kind === "humbucker");
  const scSchemes = colors.filter((c) => c.kind === "single" || c.kind === "p90");
  const [brands, setBrands] = useState<{ hb: number; sc: number }>({ hb: -1, sc: -1 });
  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(BRAND_KEY) ?? "null") as { hb?: number; sc?: number } | null;
      if (v) setBrands({ hb: v.hb ?? -1, sc: v.sc ?? -1 });
    } catch {
      /* none saved */
    }
  }, []);
  const setBrand = (k: "hb" | "sc", v: number) =>
    setBrands((b) => {
      const next = { ...b, [k]: v };
      try {
        window.localStorage.setItem(BRAND_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  const hb = hbSchemes[brands.hb] ?? null;
  const sc = scSchemes[brands.sc] ?? null;
  const schemeLabel = (c: ColorScheme) => c.brand;

  const cat = CATEGORIES.find((c) => c.id === g.category)?.name ?? g.category;
  const progress = g.steps.length ? Math.round((done.length / g.steps.length) * 100) : 0;

  return (
    <article className="space-y-3" data-testid="luthier-guide" data-guide={g.id}>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack} data-testid="luthier-back">
        <ArrowLeft className="h-4 w-4" /> All guides
      </Button>
      <header className="panel space-y-2 p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary">{cat}</p>
        <h2 className="font-display text-2xl font-black leading-tight">{g.title}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Difficulty level={g.difficulty} />
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {g.time}
          </span>
        </div>
        <p className="text-sm">{g.summary}</p>
        <div className="flex flex-wrap gap-1">
          {g.applies.map((a) => (
            <span key={a} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {APPLIES_NAME[a] ?? a}
            </span>
          ))}
        </div>
      </header>

      {g.symptoms?.length ? (
        <Section title="You notice">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {g.symptoms.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {g.causes?.length ? (
        <Section title="Likely causes — check in this order">
          <ol className="space-y-2">
            {g.causes.map((c, i) => (
              <li key={i} className="rounded-lg border border-border p-2.5 text-sm">
                <p className="font-semibold">
                  {i + 1}. {c.cause}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-semibold text-foreground">Check: </span>
                  <Linked text={c.check} byId={byId} onOpen={onOpen} />
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-semibold text-extension">Fix: </span>
                  <Linked text={c.fix} byId={byId} onOpen={onOpen} />
                </p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {g.warnings?.length ? (
        <section className="space-y-1 rounded-xl border border-third/50 bg-third/10 p-3 text-sm">
          {g.warnings.map((w, i) => (
            <p key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-third" /> {w}
            </p>
          ))}
        </section>
      ) : null}

      {g.tools.length || g.parts?.length ? (
        <Section title={g.parts?.length ? "What you need: tools & parts" : "What you need: tools"}>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2" data-testid="luthier-needs">
            {g.tools.length ? (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">Tools</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {g.tools.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {g.parts?.length ? (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">Parts</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {g.parts.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {g.specs?.length ? (
        <Section title="Specs">
          <table className="w-full text-sm">
            <tbody>
              {g.specs.map((s, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-3 align-top text-muted-foreground">{s.label}</td>
                  <td className="py-1.5 font-mono text-[13px]">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {needHb || needSc ? (
        <Section title="Your pickups' wire colours">
          <p className="text-xs text-muted-foreground">Pick your pickup brand and the steps show the colour of each wire. Always double-check against the diagram that came with your pickup.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {needHb ? (
              <Select value={String(brands.hb)} onValueChange={(v) => setBrand("hb", Number(v))}>
                <SelectTrigger aria-label="Humbucker brand" data-testid="luthier-hb-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="-1">Humbucker: wire roles only</SelectItem>
                  {hbSchemes.map((c, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {schemeLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {needSc ? (
              <Select value={String(brands.sc)} onValueChange={(v) => setBrand("sc", Number(v))}>
                <SelectTrigger aria-label="Single-coil brand" data-testid="luthier-sc-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="-1">Single coil: wire roles only</SelectItem>
                  {scSchemes.map((c, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {schemeLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          {[hb, sc].filter((x): x is ColorScheme => !!x).map((c, k) => (
            <div key={k} className="rounded-lg border border-border p-2 text-xs">
              <p className="font-semibold">{c.brand}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {c.wires.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-black/40" style={{ background: swatch(w.color) }} />
                    {w.color} = {ROLE_NAME[w.role] ?? w.role}
                    {w.note ? <span className="text-muted-foreground">({w.note})</span> : null}
                  </span>
                ))}
              </div>
              {c.splitNote ? <p className="mt-1 text-muted-foreground">Coil split: {c.splitNote}</p> : null}
              {c.note ? <p className="mt-1 text-muted-foreground">{c.note}</p> : null}
              <a href={c.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary">
                {c.source.title} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </Section>
      ) : null}

      {pictures.length ? (
        <Section title={`Pictures · ${pictures.length}`}>
          <p className="text-xs text-muted-foreground">Each picture has numbered markers that match the numbered instructions under it. Drawings are schematic — the curves and gaps are exaggerated so you can see them.</p>
          <div className="grid gap-3 lg:grid-cols-2" data-testid="luthier-pictures">
            {pictures.map((k) => (
              <div key={k}>{DIAGRAMS[k]!.render({ hb, sc })}</div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={`Steps · ${done.length}/${g.steps.length}`}>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-extension transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <ol className="space-y-2">
          {g.steps.map((st, i) => {
            const on = done.includes(i);
            return (
              <li key={i} className={cn("flex gap-3 rounded-lg border p-2.5", on ? "border-extension/50 bg-extension/5" : "border-border")}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  aria-label={`Step ${i + 1} done`}
                  className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold", on ? "border-extension bg-extension text-black" : "border-border text-muted-foreground")}
                  data-testid="luthier-step"
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </button>
                <div className="min-w-0 space-y-1 text-sm">
                  <p className={cn("font-semibold", on && "text-muted-foreground line-through")}>{st.title}</p>
                  <p className="leading-relaxed text-muted-foreground">
                    {segments(st.detail, hb, sc).map((s, k) => ("text" in s ? <Linked key={k} text={s.text} byId={byId} onOpen={onOpen} /> : <Wire key={k} label={s.label} colors={s.colors} />))}
                  </p>
                  {st.warn ? (
                    <p className="flex gap-1.5 text-third">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {st.warn}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {g.models?.length ? (
        <Section title="Model by model">
          <dl className="space-y-2 text-sm">
            {g.models.map((m, i) => (
              <div key={i}>
                <dt className="font-semibold">{m.model}</dt>
                <dd className="text-muted-foreground">
                  <Linked text={m.note} byId={byId} onOpen={onOpen} />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {g.pro ? (
        <section className="flex gap-2 rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">Take it to a luthier if: </span>
            {g.pro}
          </p>
        </section>
      ) : null}

      {g.related?.some((id) => byId.has(id)) ? (
        <Section title="Related">
          <div className="flex flex-wrap gap-1.5">
            {g.related
              .filter((id) => byId.has(id))
              .map((id) => (
                <Button key={id} size="sm" variant="secondary" className="h-8 text-xs" onClick={() => onOpen(id)}>
                  {byId.get(id)!.title}
                </Button>
              ))}
          </div>
        </Section>
      ) : null}

      <Section title="Sources">
        <ul className="space-y-1 text-sm">
          {g.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                {s.title} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}

const ROLE_NAME: Record<string, string> = {
  hot: "hot (north start)",
  ground: "ground (south start)",
  nFinish: "north finish (series link)",
  sFinish: "south finish (series link)",
  bare: "bare shield",
  scHot: "hot",
  scGround: "ground",
  "battery+": "battery +",
  output: "output",
  other: "other",
};
