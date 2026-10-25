/**
 * Chord finder: tap frets on the neck (one per string, tap a string's name to leave it out) and
 * see every chord the shape could be, most likely first, with the reasons behind each guess.
 */
import { useEffect, useMemo, useState } from "react";
import { Eraser, Volume2 } from "lucide-react";
import { Neck, type NeckDot } from "@/components/Neck";
import { TuningSelect } from "@/components/TuningSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playChord, pluck } from "@/lib/audio";
import { findChords, type ChordReading } from "@/lib/finder";
import { tabTuning } from "@/lib/tabs/model";
import { pretty, spellDegree } from "@/lib/theory";
import { cn } from "@/lib/utils";

const KEY = "fretlab.finder.v1";
const SHARP = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const TRY = ["x32010", "x02010", "xx0211", "x5453x", "3x343x", "x02210", "022xxx", "x20003", "xx5555", "1x2210"];

const parseShape = (txt: string, n: number): (number | null)[] | null => {
  const t = txt.trim().toLowerCase();
  const parts = /[\s,-]/.test(t) ? t.split(/[\s,-]+/).filter(Boolean) : [...t];
  if (parts.length !== n) return null;
  const out = parts.map((p) => (p === "x" || p === "m" ? null : Number(p)));
  return out.every((f) => f === null || (Number.isInteger(f) && f >= 0 && f <= 24)) ? out : null;
};
const shapeText = (shape: (number | null)[]) => {
  const wide = shape.some((f) => f !== null && f > 9);
  return shape.map((f) => (f === null ? "x" : String(f))).join(wide ? "-" : "");
};

export function ChordFinder() {
  const [tuningId, setTuningId] = useState("standard");
  const tuning = useMemo(() => tabTuning(tuningId), [tuningId]);
  const n = tuning.midis.length;
  const [shape, setShape] = useState<(number | null)[]>(() => new Array(6).fill(null));
  const [toFret, setToFret] = useState(15);
  const [label, setLabel] = useState<"degree" | "note">("degree");
  const [pick, setPick] = useState(0);
  const [all, setAll] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { tuningId?: string; shape?: (number | null)[] } | null;
      if (v?.tuningId) setTuningId(v.tuningId);
      if (v?.shape) setShape(v.shape);
    } catch {
      /* nothing saved */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ tuningId, shape }));
    } catch {
      /* storage unavailable */
    }
  }, [tuningId, shape]);
  // Keep one entry per string when the tuning changes size.
  useEffect(() => {
    setShape((sh) => (sh.length === n ? sh : Array.from({ length: n }, (_, i) => sh[i - (n - sh.length)] ?? null)));
  }, [n]);

  const notes = useMemo(() => shape.map((f, s) => (f === null || f === undefined ? null : { s, fret: f, midi: tuning.midis[s]! + f })).filter((x): x is { s: number; fret: number; midi: number } => !!x), [shape, tuning]);
  const readings = useMemo(() => findChords(notes, 80), [notes]);
  const cur: ChordReading | undefined = readings[pick] ?? readings[0];
  useEffect(() => setPick(0), [notes.length, shape]);

  const tap = (s: number, f: number) => {
    setShape((sh) => {
      const next = [...sh];
      next[s] = sh[s] === f ? null : f;
      return next;
    });
    pluck(tuning.midis[s]! + f);
  };
  const dots: NeckDot[] = notes.map((nt, i) => {
    const deg = cur?.degrees[i];
    const text = label === "degree" && deg ? (deg === "1" ? "R" : pretty(deg)) : cur && deg ? pretty(spellDegree(cur.root, deg)) : SHARP[nt.midi % 12]!;
    return { s: nt.s, fret: nt.fret, tone: "pick", label: text, ring: deg === "1" };
  });
  const muted = shape.map((f, s) => (f === null ? s : -1)).filter((s) => s >= 0);
  const play = () => playChord([...notes].sort((a, b) => a.midi - b.midi).map((x) => x.midi));
  const list = all ? readings : readings.slice(0, 8);

  return (
    <div className="space-y-3" data-testid="chord-finder">
      <div className="flex flex-wrap items-center gap-2">
        <TuningSelect value={tuningId} onChange={setTuningId} />
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Dot labels">
          {(["degree", "note"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={label === m} onClick={() => setLabel(m)} className={cn("rounded px-2.5 py-1.5 font-semibold", label === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {m === "degree" ? "Degrees" : "Notes"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setToFret((v) => (v === 15 ? 24 : 15))}>
          Frets 0–{toFret === 15 ? "24" : "15"}
        </Button>
        <Button size="sm" variant="secondary" onClick={play} disabled={!notes.length} className="gap-1.5">
          <Volume2 className="h-4 w-4" /> Hear it
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShape(new Array(n).fill(null))} disabled={!notes.length} className="gap-1.5">
          <Eraser className="h-4 w-4" /> Clear
        </Button>
      </div>

      <Neck midis={tuning.midis} names={tuning.names} from={0} to={toFret} dots={dots} muted={muted} onTap={tap} onName={(s) => setShape((sh) => sh.map((f, i) => (i === s ? null : f)))} testId="finder-neck" ariaLabel="Tap frets to build a chord" />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-sm font-bold text-foreground" data-testid="finder-shape">
          {shapeText(shape)}
        </span>
        <span className="text-muted-foreground">
          {notes.length ? [...notes].sort((a, b) => a.midi - b.midi).map((x) => SHARP[x.midi % 12]).join(" · ") : "Tap a fret on each string you play. Tap a string's name to leave it out."}
        </span>
        <form
          className="ml-auto flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const sh = parseShape(typed, n);
            if (sh) {
              setShape(sh);
              setTyped("");
            }
          }}
        >
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={n === 6 ? "or type x32010" : "type frets, x = muted"} className="h-8 w-36 font-mono text-xs" aria-label="Type a chord shape" data-testid="finder-type" />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Go
          </Button>
        </form>
      </div>
      {n === 6 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Try:</span>
          {TRY.map((t) => (
            <button key={t} type="button" onClick={() => setShape(parseShape(t, 6)!)} className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono hover:border-primary">
              {t}
            </button>
          ))}
        </div>
      ) : null}

      {notes.length < 2 ? (
        <p className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">Put at least two notes on the neck and every chord they could be shows up here — most likely first.</p>
      ) : !readings.length ? (
        <p className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">These notes don't spell a named chord. Try moving one note, or leave a string out.</p>
      ) : (
        <div className="space-y-2" data-testid="finder-results">
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Most likely</p>
            <p className="font-display text-3xl font-black leading-tight" data-testid="finder-top">
              {pretty(readings[0]!.name)}
            </p>
            <p className="text-xs text-muted-foreground">
              {readings[0]!.def.name} · {readings[0]!.position} · {Math.round(readings[0]!.likelihood * 100)}% likely
            </p>
          </div>
          <ol className="space-y-1">
            {list.map((r, i) => (
              <li key={r.name}>
                <button type="button" onClick={() => setPick(i)} className={cn("w-full rounded-lg border p-2 text-left transition-colors", (cur?.name ?? "") === r.name ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/50")} data-testid="finder-row">
                  <div className="flex items-baseline gap-2">
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-display text-base font-bold">{pretty(r.name)}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.likelihood >= 0.005 ? `${Math.round(r.likelihood * 100)}%` : "<1%"}</span>
                  </div>
                  <div className="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1.5, r.likelihood * 100)}%` }} />
                  </div>
                  <p className="ml-7 mt-1 text-[11px] text-muted-foreground">
                    {r.def.name} · {r.position}
                    {r.why.length ? ` · ${r.why.join(" · ")}` : ""}
                  </p>
                  <p className="ml-7 font-mono text-[11px] text-foreground/80">
                    {notes.map((_, k) => `${pretty(spellDegree(r.root, r.degrees[k]!))}=${r.degrees[k] === "1" ? "R" : pretty(r.degrees[k]!)}`).join("  ")}
                  </p>
                </button>
              </li>
            ))}
          </ol>
          {readings.length > 8 ? (
            <Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)} className="text-xs">
              {all ? "Show the top 8" : `Show all ${readings.length} possibilities`}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
