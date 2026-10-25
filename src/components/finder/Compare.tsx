/**
 * Compare two chords, scales or arpeggios on the neck — flip between them, see them one above the
 * other, or overlap them on one neck — with the main differences spelled out.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Layers, Pause, Play, Rows3, Volume2 } from "lucide-react";
import { Neck, NECK_COLORS, type NeckDot } from "@/components/Neck";
import { TuningSelect } from "@/components/TuningSelect";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playChord, playSequence } from "@/lib/audio";
import { compare, COMPARE_PRESETS, resolve, ROOT_CHOICES, type CompareItem, type CompareKind, type Resolved } from "@/lib/compare";
import { chordShape } from "@/lib/tabs/chords";
import { tabTuning, type TabTuning } from "@/lib/tabs/model";
import { CHORD_FAMILIES, CHORDS, pretty, SCALE_FAMILIES, SCALES, spellDegree } from "@/lib/theory";
import { cn } from "@/lib/utils";

type View = "flip" | "stack" | "overlap";
const WINDOWS: { id: string; label: string; from: number; to: number }[] = [
  { id: "all", label: "Whole neck (0–15)", from: 0, to: 15 },
  { id: "p0", label: "Open (0–4)", from: 0, to: 4 },
  { id: "p3", label: "Frets 3–7", from: 3, to: 7 },
  { id: "p5", label: "Frets 5–9", from: 5, to: 9 },
  { id: "p7", label: "Frets 7–11", from: 7, to: 11 },
  { id: "p9", label: "Frets 9–13", from: 9, to: 13 },
  { id: "p12", label: "Frets 12–16", from: 12, to: 16 },
];
const KEY = "fretlab.compare.v1";
const pc12 = (n: number) => ((n % 12) + 12) % 12;

interface Placed {
  dots: { s: number; fret: number; pc: number; deg: string; root: boolean }[];
  /** For chords: the shape used. */
  shape: (number | null)[] | null;
}

/** Where an item's notes sit on the neck within a window: a chord shape, or every tone. */
function place(r: Resolved, tuning: TabTuning, win: { from: number; to: number }, chordAsShape: boolean, nearFret?: number): Placed {
  const dots: Placed["dots"] = [];
  if (r.item.kind === "chord" && chordAsShape) {
    const near = nearFret ?? (win.from === 0 && win.to >= 15 ? undefined : Math.max(0, win.from));
    const shape = chordShape({ root: r.root, def: r.def as (typeof CHORDS)[number], bassPc: null, label: r.name }, tuning, near);
    shape?.forEach((f, s) => {
      if (f === null) return;
      const pc = pc12(tuning.midis[s]! + f);
      dots.push({ s, fret: f, pc, deg: r.byPc.get(pc) ?? "?", root: pc === r.item.rootPc });
    });
    return { dots, shape };
  }
  tuning.midis.forEach((open, s) => {
    for (let f = win.from; f <= win.to; f++) {
      const pc = pc12(open + f);
      const deg = r.byPc.get(pc);
      if (deg) dots.push({ s, fret: f, pc, deg, root: pc === r.item.rootPc });
    }
  });
  return { dots, shape: null };
}

function midisOf(r: Resolved, tuning: TabTuning, p: Placed): number[] {
  if (p.shape) return p.shape.map((f, s) => (f === null ? null : tuning.midis[s]! + f)).filter((x): x is number => x !== null);
  // One octave up from the lowest root in view (plus the top root).
  const all = [...new Set(p.dots.map((d) => tuning.midis[d.s]! + d.fret))].sort((a, b) => a - b);
  const start = all.find((m) => pc12(m) === r.item.rootPc) ?? all[0] ?? 48;
  return all.filter((m) => m >= start && m <= start + 12);
}

function ItemPicker({ item, onChange, side }: { item: CompareItem; onChange: (i: CompareItem) => void; side: "a" | "b" }) {
  const kinds: CompareKind[] = ["chord", "arpeggio", "scale"];
  const isScale = item.kind === "scale";
  return (
    <div className="space-y-2 rounded-xl border p-2.5" style={{ borderColor: `${NECK_COLORS[side]}80`, background: `${NECK_COLORS[side]}10` }} data-testid={`compare-${side}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-black text-[#0b0f14]" style={{ background: NECK_COLORS[side] }}>
          {side.toUpperCase()}
        </span>
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-[11px]" role="radiogroup" aria-label={`${side.toUpperCase()} type`}>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={item.kind === k}
              onClick={() => onChange({ ...item, kind: k, id: k === "scale" ? (isScale ? item.id : "ionian") : isScale ? "maj" : item.id })}
              className={cn("rounded px-2 py-1 font-semibold capitalize", item.kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Select value={String(item.rootPc)} onValueChange={(v) => onChange({ ...item, rootPc: Number(v) })}>
          <SelectTrigger className="h-9 w-20" aria-label={`${side.toUpperCase()} root`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROOT_CHOICES.map((r) => (
              <SelectItem key={r.name} value={String(r.pc)}>
                {pretty(r.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={item.id} onValueChange={(v) => onChange({ ...item, id: v })}>
          <SelectTrigger className="h-9 min-w-0 flex-1" aria-label={`${side.toUpperCase()} ${item.kind}`} data-testid={`compare-${side}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {isScale
              ? SCALE_FAMILIES.map((fam) => (
                  <SelectGroup key={fam}>
                    <SelectLabel>{fam}</SelectLabel>
                    {SCALES.filter((s) => s.family === fam).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))
              : CHORD_FAMILIES.filter((f) => f !== "Upper structures & slash").map((fam) => (
                  <SelectGroup key={fam}>
                    <SelectLabel>{fam}</SelectLabel>
                    {CHORDS.filter((c) => c.family === fam).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.suffix ? pretty(c.suffix) : "maj"} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function Compare() {
  const [a, setA] = useState<CompareItem>(COMPARE_PRESETS[0]!.a);
  const [b, setB] = useState<CompareItem>(COMPARE_PRESETS[0]!.b);
  const [view, setView] = useState<View>("flip");
  const [showing, setShowing] = useState<"a" | "b">("a");
  const [auto, setAuto] = useState(false);
  const [winId, setWinId] = useState("all");
  const [labels, setLabels] = useState<"degree" | "note">("note");
  const [shapes, setShapes] = useState(true);
  const [tuningId, setTuningId] = useState("standard");
  const tuning = useMemo(() => tabTuning(tuningId), [tuningId]);

  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { a?: CompareItem; b?: CompareItem; view?: View } | null;
      if (v?.a && resolve(v.a)) setA(v.a);
      if (v?.b && resolve(v.b)) setB(v.b);
      if (v?.view) setView(v.view);
    } catch {
      /* nothing saved */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ a, b, view }));
    } catch {
      /* storage unavailable */
    }
  }, [a, b, view]);

  // Auto-flip: switch every 1.6 s so the change jumps out.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!auto || view !== "flip") return;
    timer.current = window.setInterval(() => setShowing((s) => (s === "a" ? "b" : "a")), 1600);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [auto, view]);

  const ra = useMemo(() => resolve(a), [a]);
  const rb = useMemo(() => resolve(b), [b]);
  const win = WINDOWS.find((w) => w.id === winId) ?? WINDOWS[0]!;
  const pa = useMemo(() => (ra ? place(ra, tuning, win, shapes) : null), [ra, tuning, win, shapes]);
  // B's chord shape is looked for where A's sits, so the two can be compared under one hand.
  const nearB = useMemo(() => {
    const fr = pa?.shape?.filter((f): f is number => f !== null && f > 0) ?? [];
    return fr.length ? Math.max(0, Math.min(...fr) - 1) : undefined;
  }, [pa]);
  const pb = useMemo(() => (rb ? place(rb, tuning, win, shapes, nearB) : null), [rb, tuning, win, shapes, nearB]);
  const cmp = useMemo(() => (ra && rb ? compare(ra, rb) : null), [ra, rb]);
  if (!ra || !rb || !pa || !pb || !cmp) return null;

  const text = (r: Resolved, d: { pc: number; deg: string }) => (labels === "degree" ? (d.deg === "1" ? "R" : pretty(d.deg)) : pretty(spellDegree(r.root, d.deg)));
  const single = (r: Resolved, p: Placed, tone: "a" | "b"): NeckDot[] => p.dots.map((d) => ({ s: d.s, fret: d.fret, tone, label: text(r, d), ring: d.root }));
  const overlap: NeckDot[] = (() => {
    const key = (d: { s: number; fret: number }) => `${d.s}-${d.fret}`;
    const mb = new Map(pb.dots.map((d) => [key(d), d]));
    const out: NeckDot[] = [];
    for (const d of pa.dots) {
      const other = mb.get(key(d));
      out.push({ s: d.s, fret: d.fret, tone: other ? "both" : "a", label: labels === "degree" ? (other ? `${d.deg === "1" ? "R" : pretty(d.deg)}` : text(ra, d)) : pretty(spellDegree(ra.root, d.deg)), ring: d.root || !!other?.root });
      mb.delete(key(d));
    }
    for (const d of mb.values()) out.push({ s: d.s, fret: d.fret, tone: "b", label: text(rb, d), ring: d.root });
    return out;
  })();
  const range = { from: win.from, to: Math.max(win.to, win.from + 4) };
  const hear = (r: Resolved, p: Placed) => (p.shape ? playChord(midisOf(r, tuning, p)) : playSequence(midisOf(r, tuning, p), r.item.kind === "arpeggio" ? 0.22 : 0.2));
  const cur = showing === "a" ? { r: ra, p: pa } : { r: rb, p: pb };
  const chordish = a.kind === "chord" || b.kind === "chord";

  return (
    <div className="space-y-3" data-testid="compare">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <ItemPicker item={a} onChange={setA} side="a" />
        <Button
          variant="secondary"
          size="sm"
          className="mx-auto gap-1.5"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="Swap A and B"
        >
          <ArrowLeftRight className="h-4 w-4" /> Swap
        </Button>
        <ItemPicker item={b} onChange={setB} side="b" />
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="self-center text-muted-foreground">Try:</span>
        {COMPARE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setA(p.a);
              setB(p.b);
            }}
            className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 hover:border-primary"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="How to show them">
          {(
            [
              ["flip", "Switch", ArrowLeftRight],
              ["stack", "Side by side", Rows3],
              ["overlap", "Overlap", Layers],
            ] as const
          ).map(([v, l, Icon]) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cn("inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-semibold", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")} data-testid={`compare-view-${v}`}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>
        <Select value={winId} onValueChange={setWinId}>
          <SelectTrigger className="h-9 w-44" aria-label="Where on the neck">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Dot labels">
          {(["note", "degree"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={labels === m} onClick={() => setLabels(m)} className={cn("rounded px-2.5 py-1.5 font-semibold", labels === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {m === "note" ? "Notes" : "Degrees"}
            </button>
          ))}
        </div>
        {chordish ? (
          <Button size="sm" variant="secondary" onClick={() => setShapes((v) => !v)} aria-pressed={shapes}>
            Chords as {shapes ? "a shape" : "all chord tones"}
          </Button>
        ) : null}
        <TuningSelect value={tuningId} onChange={setTuningId} className="w-48" />
      </div>

      {view === "flip" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowing((s) => (s === "a" ? "b" : "a"))} className="gap-2" data-testid="compare-flip" style={{ background: NECK_COLORS[showing], color: "#0b0f14" }}>
              <ArrowLeftRight className="h-4 w-4" />
              Showing {showing.toUpperCase()}: {pretty(cur.r.name)} — tap to switch
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAuto((v) => !v)} className="gap-1.5" aria-pressed={auto}>
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {auto ? "Stop switching" : "Keep switching"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => hear(cur.r, cur.p)} className="gap-1.5">
              <Volume2 className="h-4 w-4" /> Hear {showing.toUpperCase()}
            </Button>
          </div>
          <Neck key={showing} midis={tuning.midis} names={tuning.names} from={range.from} to={range.to} dots={single(cur.r, cur.p, showing)} testId="compare-neck" className="lw-swap" />
        </div>
      ) : view === "stack" ? (
        <div className="space-y-2">
          {([["a", ra, pa], ["b", rb, pb]] as const).map(([side, r, p]) => (
            <div key={side} className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-[#0b0f14]" style={{ background: NECK_COLORS[side] }}>
                  {side.toUpperCase()}
                </span>
                {pretty(r.name)}
                <span className="font-mono text-xs font-normal text-muted-foreground">{r.notes.map(pretty).join(" ")}</span>
                <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-xs" onClick={() => hear(r, p)}>
                  <Volume2 className="h-3.5 w-3.5" /> Hear
                </Button>
              </div>
              <Neck midis={tuning.midis} names={tuning.names} from={range.from} to={range.to} dots={single(r, p, side)} testId={`compare-neck-${side}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Legend color={NECK_COLORS.a} text={`only ${pretty(ra.name)}`} />
            <Legend both text="in both" />
            <Legend color={NECK_COLORS.b} text={`only ${pretty(rb.name)}`} />
          </div>
          <Neck midis={tuning.midis} names={tuning.names} from={range.from} to={range.to} dots={overlap} testId="compare-neck" />
        </div>
      )}

      {/* the differences */}
      <section className="space-y-3 rounded-xl border border-border bg-card/40 p-3" data-testid="compare-diff">
        <h3 className="font-display text-lg font-bold">The main differences</h3>
        <ul className="space-y-1 text-sm">
          {cmp.summary.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{pretty(s)}</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-3">
          <NoteBox title={`Only in A`} color={NECK_COLORS.a} items={cmp.onlyA.map((x) => ({ name: x.name, sub: x.deg }))} />
          <NoteBox title="In both" color={NECK_COLORS.both} items={cmp.shared.map((x) => ({ name: x.a, sub: `${x.degA} / ${x.degB}` }))} />
          <NoteBox title={`Only in B`} color={NECK_COLORS.b} items={cmp.onlyB.map((x) => ({ name: x.name, sub: x.deg }))} />
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          {([["A", ra], ["B", rb]] as const).map(([k, r]) => (
            <div key={k} className="rounded-lg bg-secondary/40 p-2">
              <p className="font-semibold text-foreground">
                {k}: {pretty(r.name)} <span className="font-mono font-normal text-muted-foreground">({r.degrees.map((d) => (d === "1" ? "R" : pretty(d))).join(" ")})</span>
              </p>
              <p className="text-muted-foreground">{"characteristic" in r.def && r.def.characteristic ? `${r.def.characteristic} ` : ""}{r.def.theory}</p>
            </div>
          ))}
        </div>
        {a.rootPc !== b.rootPc ? (
          <p className="text-xs text-muted-foreground">
            B over A's root ({pretty(ra.root.name)}): <span className="font-mono text-foreground">{cmp.bOverA.map((d) => (d === "1" ? "R" : pretty(d))).join(" ")}</span>
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Legend({ color, both, text }: { color?: string; both?: boolean; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full" style={both ? { background: `linear-gradient(90deg, ${NECK_COLORS.a} 50%, ${NECK_COLORS.b} 50%)` } : { background: color }} />
      {text}
    </span>
  );
}

function NoteBox({ title, color, items }: { title: string; color: string; items: { name: string; sub: string }[] }) {
  return (
    <div className="rounded-lg border p-2" style={{ borderColor: `${color}66` }}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
        {title} · {items.length}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.length ? (
          items.map((x) => (
            <span key={x.name + x.sub} className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-sm font-bold">
              {pretty(x.name)} <span className="font-mono text-[10px] font-normal text-muted-foreground">{pretty(x.sub)}</span>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">none</span>
        )}
      </div>
    </div>
  );
}
