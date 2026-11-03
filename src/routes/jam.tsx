import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Pause, Play, Plus, Trash2, Volume2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Neck, type NeckDot } from "@/components/Neck";
import { TuningSelect } from "@/components/TuningSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pluck, playChord } from "@/lib/audio";
import { engine } from "@/lib/engine";
import {
  chordDef,
  chordPcs,
  DRUM_STYLES,
  emptyJam,
  JAM_PRESETS,
  jamArrangement,
  jamPosition,
  layerDegrees,
  layerName,
  layerPcs,
  makeChord,
  ownArpeggio,
  parseProgression,
  progressionText,
  scaleDef,
  totalBeats,
  type DrumStyle,
  type Jam,
  type JamChord,
  type JamLayer,
} from "@/lib/jam";
import { useTabActive } from "@/lib/tabActive";
import { tabTuning } from "@/lib/tabs/model";
import { ARPEGGIO_VARIANTS, CHORDS, SCALES, chromaticName, degreeToSemitones, pretty, rootByName, spellDegree, type Degree } from "@/lib/theory";
import { beatTicks, newId } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jam")({
  head: () => ({ meta: [{ title: "Jam — Fretlab" }] }),
  component: JamPage,
});

const KEY = "fretlab.jam.v1";
const ROOT_NAMES = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const INTERVAL = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];
const LAYER_COLORS = ["#38bdf8", "#f472b6", "#e5e7eb", "#e5e7eb"];
const LENGTHS: { beats: (bpb: number) => number; label: string }[] = [
  { beats: () => 1, label: "1 beat" },
  { beats: () => 2, label: "2 beats" },
  { beats: () => 3, label: "3 beats" },
  { beats: (b) => b, label: "1 bar" },
  { beats: (b) => b * 2, label: "2 bars" },
  { beats: (b) => b * 4, label: "4 bars" },
];
const SCALE_FAMILIES = [...new Set(SCALES.map((s) => s.family))];
const CHORD_FAMILIES = [...new Set(CHORDS.map((c) => c.family))];
const sel = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function load(): Jam | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Jam;
    return Array.isArray(j.chords) ? { ...emptyJam(), ...j } : null;
  } catch {
    return null;
  }
}

/** Jam: type or pick a progression, loop it with drums, and solo over it with the scales and arpeggios you choose. */
export function JamPage() {
  const [jam, setJam] = useState<Jam>(() => ({ ...emptyJam(), chords: parseProgression("G D Em C", 4).chords }));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const j = load();
    if (j) setJam(j);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(jam));
    } catch {
      /* storage unavailable */
    }
  }, [jam, ready]);

  const [text, setText] = useState("");
  const [bad, setBad] = useState<string[]>([]);
  useEffect(() => {
    if (ready) setText(progressionText(jam.chords, jam.beatsPerBar));
    // Only when the page loads; after that the box is the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const [pick, setPick] = useState<number | "all">(0);
  const [tuningId, setTuningId] = useState("standard");
  const tuning = useMemo(() => tabTuning(tuningId), [tuningId]);
  const [toFret, setToFret] = useState(15);
  const [labels, setLabels] = useState<"degree" | "note">("degree");
  const [showNext, setShowNext] = useState(true);

  // ---- playback
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const tabActive = useTabActive();
  const play = async () => {
    if (!jam.chords.length) return;
    engine.setListener({ onEnded: () => setPlaying(false) });
    await engine.play(jamArrangement(jam));
    setPlaying(true);
  };
  const stop = () => {
    engine.stop();
    setPlaying(false);
    setBeat(-1);
  };
  useEffect(() => {
    if (!tabActive && playing) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActive]);
  // Edits while playing are heard on the next pass.
  useEffect(() => {
    if (playing && jam.chords.length) void engine.load(jamArrangement(jam));
  }, [jam, playing]);
  useEffect(() => {
    if (!playing) return;
    const bt = beatTicks({ beats: jam.beatsPerBar, unit: 4 });
    let raf = 0;
    const tick = () => {
      setBeat(engine.positionTicks() / bt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, jam.beatsPerBar]);
  useEffect(() => () => engine.stop(), []);

  const pos = playing && beat >= 0 ? jamPosition(jam, beat) : null;
  const countIn = playing && beat < 0 ? Math.ceil(-beat) : 0;
  const shownIndex = pos ? pos.index : typeof pick === "number" ? Math.min(pick, jam.chords.length - 1) : 0;
  const shown: JamChord | undefined = jam.chords[shownIndex];
  const nextChord: JamChord | undefined = pos ? jam.chords[pos.next] : undefined;
  const beatsLeft = pos ? Math.ceil(pos.beatsLeft - 1e-6) : 0;

  // ---- editing
  const update = (fn: (j: Jam) => Jam) => setJam((j) => fn(j));
  const setChords = (fn: (cs: JamChord[]) => JamChord[]) => update((j) => ({ ...j, chords: fn(j.chords) }));
  const applyText = (t = text) => {
    const r = parseProgression(t, jam.beatsPerBar);
    setBad(r.bad);
    if (r.chords.length) {
      setChords(() => r.chords);
      setPick(0);
    }
  };
  const editLayers = (target: number | "all", fn: (ls: JamLayer[]) => JamLayer[]) =>
    update((j) => (target === "all" ? { ...j, everywhere: fn(j.everywhere) } : { ...j, chords: j.chords.map((c, i) => (i === target ? { ...c, layers: fn(c.layers) } : c)) }));

  // ---- the neck
  const layers = shown ? [...shown.layers, ...jam.everywhere] : jam.everywhere;
  const layerSets = layers.map((l) => new Set(layerPcs(l)));
  const chordRoot = shown ? rootByName(shown.rootName) : rootByName("C");
  const chordTones = new Set(shown ? chordPcs(shown) : []);
  const nextTones = new Set(nextChord ? chordPcs(nextChord) : []);
  const previewing = playing && showNext && !!nextChord && beatsLeft <= 1 && pos?.next !== pos?.index;
  const labelFor = (pc: number) => {
    if (labels === "degree") {
      const own = shown ? chordDef(shown.chordId).degrees.find((d) => (chordRoot.pc + degreeToSemitones(d) + 120) % 12 === pc) : undefined;
      const d = own ?? INTERVAL[(pc - chordRoot.pc + 12) % 12]!;
      return d === "1" ? "R" : pretty(d);
    }
    for (const l of layers) {
      const d = layerDegrees(l).find((x) => (rootByName(l.rootName).pc + degreeToSemitones(x) + 120) % 12 === pc);
      if (d) return pretty(spellDegree(rootByName(l.rootName), d as Degree));
    }
    return pretty(chromaticName(pc, chordRoot.alter < 0));
  };
  const dots: NeckDot[] = [];
  tuning.midis.forEach((open, s) => {
    for (let f = 0; f <= toFret; f++) {
      const pc = (open + f) % 12;
      const inL = layerSets.map((set) => set.has(pc));
      const a = inL[0] ?? false;
      const b = inL[1] ?? false;
      const any = inL.some(Boolean);
      if (any) dots.push({ s, fret: f, tone: a && b ? "both" : a ? "a" : b ? "b" : "tone", label: labelFor(pc), ring: pc === chordRoot.pc });
      else if (previewing && nextTones.has(pc)) dots.push({ s, fret: f, tone: "next" });
    }
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 sm:px-4" data-testid="jam-page">
        {/* ------------------------------------------------ progression */}
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-black">Jam</h2>
            <span className="text-xs text-muted-foreground">Type or pick your chords, press play, and solo with the scales and arpeggios you choose.</span>
          </div>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyText();
            }}
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Am7 D7 Gmaj7*2 Cmaj7:2" className="h-10 min-w-0 flex-1 font-mono" aria-label="Type the chords" data-testid="jam-text" />
            <Button type="submit" className="h-10" data-testid="jam-text-go">
              Use these chords
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground">
            Each chord lasts a bar. Add <b className="font-mono">:2</b> for 2 beats or <b className="font-mono">*2</b> for 2 bars. Slash chords work too (G/B).
            {bad.length ? <span className="ml-1 font-semibold text-third" data-testid="jam-bad">Not chord names: {bad.join(", ")}</span> : null}
          </p>
          <ChordPicker bpb={jam.beatsPerBar} onAdd={(c) => {
              setChords((cs) => [...cs, c]);
              setPick(jam.chords.length);
              playChord(chordMidisOf(c));
            }} />
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Start from:</span>
            {JAM_PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => { setText(p.text); applyText(p.text); }} className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 hover:border-primary">
                {pretty(p.name)}
              </button>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ transport + live view */}
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={playing ? stop : () => void play()} disabled={!jam.chords.length} className="h-11 gap-2 px-5 text-base" data-testid="jam-play">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {playing ? "Stop" : "Play"}
            </Button>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Tempo</span>
              <input type="range" min={40} max={220} value={jam.bpm} onChange={(e) => update((j) => ({ ...j, bpm: Number(e.target.value) }))} className="w-28 accent-[var(--color-primary)]" aria-label="Tempo" />
              <span className="w-14 font-mono">{jam.bpm} bpm</span>
            </label>
            <select className={sel} value={jam.beatsPerBar} onChange={(e) => update((j) => ({ ...j, beatsPerBar: Number(e.target.value) }))} aria-label="Beats per bar">
              {[2, 3, 4, 5, 6, 7].map((b) => (
                <option key={b} value={b}>
                  {b}/4
                </option>
              ))}
            </select>
            <select className={sel} value={jam.drums} onChange={(e) => update((j) => ({ ...j, drums: e.target.value as DrumStyle }))} aria-label="Drums" data-testid="jam-drums">
              {DRUM_STYLES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Toggle on={jam.chordsOn} onClick={() => update((j) => ({ ...j, chordsOn: !j.chordsOn }))} label="Chords" />
            <Toggle on={jam.metronome} onClick={() => update((j) => ({ ...j, metronome: !j.metronome }))} label="Click" />
          </div>

          {/* Now / next */}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" data-testid="jam-live">
            <div className={cn("rounded-xl border p-3 transition-colors", previewing ? "border-third bg-third/10" : "border-primary/40 bg-primary/10")}>
              {countIn ? (
                <p className="font-display text-3xl font-black" data-testid="jam-countin">Count-in… {countIn}</p>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{playing ? "Now playing" : "Showing"}</p>
                  <p className="font-display text-4xl font-black leading-tight" data-testid="jam-now">
                    {shown ? pretty(shown.label) : "—"}
                  </p>
                  {pos && nextChord ? (
                    <p className={cn("text-sm font-semibold", previewing ? "text-third" : "text-muted-foreground")} data-testid="jam-next">
                      {pos.next === pos.index ? "Same chord again" : previewing ? `Change → ${pretty(nextChord.label)} on the next beat` : `Next: ${pretty(nextChord.label)} in ${beatsLeft} beat${beatsLeft === 1 ? "" : "s"}`}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Press play — the chord changes are called out here.</p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border p-3" aria-label="Beat">
              {Array.from({ length: jam.beatsPerBar }, (_, b) => {
                const cur = playing && beat >= 0 && Math.floor(beat) % jam.beatsPerBar === b;
                return <span key={b} className={cn("h-4 w-4 rounded-full border", cur ? (b === 0 ? "border-primary bg-primary" : "border-foreground bg-foreground") : "border-border")} />;
              })}
            </div>
          </div>

          {/* The progression strip: tap a chord to show it and edit what's played over it */}
          <div className="flex gap-1 overflow-x-auto pb-1" data-testid="jam-strip">
            {jam.chords.map((c, i) => {
              const isNow = pos?.index === i;
              const isPick = !playing && pick === i;
              const progress = isNow && pos ? Math.min(1, (c.beats - pos.beatsLeft) / c.beats) : 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setPick(i);
                    if (!playing) playChord(chordMidisOf(c));
                  }}
                  className={cn("relative shrink-0 overflow-hidden rounded-lg border px-2 py-1.5 text-left", isNow ? "border-primary bg-primary/15" : isPick ? "border-foreground/60 bg-secondary" : "border-border bg-card/40")}
                  style={{ minWidth: `${Math.max(3.2, c.beats * 1.6)}rem` }}
                  data-testid="jam-chord"
                >
                  {isNow ? <span className="absolute inset-y-0 left-0 bg-primary/25" style={{ width: `${progress * 100}%` }} /> : null}
                  <span className="relative block font-display text-base font-bold">{pretty(c.label)}</span>
                  <span className="relative block text-[10px] text-muted-foreground">
                    {c.beats} beat{c.beats === 1 ? "" : "s"} · {c.layers.length} over it
                  </span>
                </button>
              );
            })}
            {!jam.chords.length ? <p className="text-sm text-muted-foreground">No chords yet — type some above or pick them.</p> : null}
          </div>
          {typeof pick === "number" && jam.chords[pick] && !playing ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="jam-chord-tools">
              <span className="font-semibold">{pretty(jam.chords[pick].label)}:</span>
              <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Shorter" onClick={() => setChords((cs) => cs.map((c, i) => (i === pick ? { ...c, beats: Math.max(1, c.beats - 1) } : c)))}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono">{jam.chords[pick].beats} beats</span>
              <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Longer" onClick={() => setChords((cs) => cs.map((c, i) => (i === pick ? { ...c, beats: Math.min(64, c.beats + 1) } : c)))}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Move left" disabled={pick === 0} onClick={() => { setChords((cs) => swap(cs, pick, pick - 1)); setPick(pick - 1); }}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Move right" disabled={pick >= jam.chords.length - 1} onClick={() => { setChords((cs) => swap(cs, pick, pick + 1)); setPick(pick + 1); }}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => playChord(chordMidisOf(jam.chords[pick]!))}>
                <Volume2 className="h-3.5 w-3.5" /> Hear
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-third" onClick={() => { setChords((cs) => cs.filter((_, i) => i !== pick)); setPick(Math.max(0, pick - 1)); }}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
              <span className="text-muted-foreground">· {totalBeats(jam)} beats in all</span>
            </div>
          ) : null}

          {/* The neck */}
          <div className="flex flex-wrap items-center gap-2">
            <TuningSelect value={tuningId} onChange={setTuningId} />
            <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Dot labels">
              {(["degree", "note"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={labels === m} onClick={() => setLabels(m)} className={cn("rounded px-2.5 py-1.5 font-semibold", labels === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {m === "degree" ? "Degrees over the chord" : "Notes"}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setToFret((v) => (v === 15 ? 24 : 15))}>
              Frets 0–{toFret === 15 ? "24" : "15"}
            </Button>
            <Toggle on={showNext} onClick={() => setShowNext((v) => !v)} label="Show next chord" />
          </div>
          <Neck
            midis={tuning.midis}
            names={tuning.names}
            from={0}
            to={toFret}
            dots={dots}
            onTap={(s, f) => pluck(tuning.midis[s]! + f)}
            testId="jam-neck"
            ariaLabel="Notes to play over the current chord — tap to hear them"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" data-testid="jam-legend">
            {layers.map((l, i) => (
              <span key={l.id} className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-full" style={{ background: LAYER_COLORS[Math.min(i, 3)] }} />
                {pretty(layerName(l))}
                {i >= (shown?.layers.length ?? 0) ? <span className="text-muted-foreground">(every chord)</span> : null}
              </span>
            ))}
            {layers.length > 1 ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(90deg, #38bdf8 50%, #f472b6 50%)" }} /> in the first two
              </span>
            ) : null}
            <span className="text-muted-foreground">White ring = the chord's root · {chordTones.size ? `chord tones ${[...chordTones].map((p) => labelFor(p)).join(" ")}` : ""}</span>
            {previewing ? <span className="font-semibold text-third">Dashed = next chord ({pretty(nextChord!.label)})</span> : null}
          </div>
        </section>

        {/* ------------------------------------------------ what to play over each chord */}
        <section className="panel space-y-3 p-3 sm:p-4" data-testid="jam-layers">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="mr-1 font-display text-lg font-bold">Play over</h3>
            {jam.chords.map((c, i) => (
              <button key={c.id} type="button" onClick={() => setPick(i)} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", pick === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60")} data-testid="jam-target">
                {pretty(c.label)}
              </button>
            ))}
            <button type="button" onClick={() => setPick("all")} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", pick === "all" ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-primary/60 text-primary")} data-testid="jam-target-all">
              Every chord
            </button>
          </div>
          <LayerEditor
            key={String(pick)}
            target={pick}
            chord={typeof pick === "number" ? jam.chords[pick] : undefined}
            layers={pick === "all" ? jam.everywhere : (jam.chords[pick]?.layers ?? [])}
            onChange={(fn) => editLayers(pick, fn)}
            onAllChords={(l) => update((j) => ({ ...j, chords: j.chords.map((c) => ({ ...c, layers: [...c.layers.filter((x) => layerName(x) !== layerName(l)), { ...l, id: newId() }] })) }))}
          />
        </section>
      </main>
    </AppShell>
  );
}

const swap = <T,>(a: T[], i: number, j: number) => {
  const b = [...a];
  [b[i], b[j]] = [b[j]!, b[i]!];
  return b;
};

function chordMidisOf(c: JamChord): number[] {
  const root = 48 + rootByName(c.rootName).pc;
  const ms = chordDef(c.chordId).degrees.map((d) => root + degreeToSemitones(d));
  if (c.bassName) ms.unshift(36 + rootByName(c.bassName).pc);
  return ms;
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("h-9 rounded-md border px-2.5 text-xs font-semibold", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
      {label} {on ? "on" : "off"}
    </button>
  );
}

/** Pick a chord: root, quality and length. */
function ChordPicker({ bpb, onAdd }: { bpb: number; onAdd: (c: JamChord) => void }) {
  const [root, setRoot] = useState("A");
  const [chordId, setChordId] = useState("min");
  const [len, setLen] = useState(3);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/20 p-2" data-testid="jam-picker">
      <span className="text-xs font-semibold">Or pick:</span>
      <select className={sel} value={root} onChange={(e) => setRoot(e.target.value)} aria-label="Root">
        {ROOT_NAMES.map((r) => (
          <option key={r} value={r}>
            {pretty(r)}
          </option>
        ))}
      </select>
      <select className={cn(sel, "max-w-[14rem]")} value={chordId} onChange={(e) => setChordId(e.target.value)} aria-label="Chord type">
        {CHORD_FAMILIES.map((f) => (
          <optgroup key={f} label={f}>
            {CHORDS.filter((c) => c.family === f).map((c) => (
              <option key={c.id} value={c.id}>
                {pretty(`${root}${c.suffix}`)} — {c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select className={sel} value={len} onChange={(e) => setLen(Number(e.target.value))} aria-label="Length">
        {LENGTHS.map((l, i) => (
          <option key={l.label} value={i}>
            {l.label}
          </option>
        ))}
      </select>
      <Button size="sm" className="h-9 gap-1" onClick={() => onAdd(makeChord(root, chordId, LENGTHS[len]!.beats(bpb)))} data-testid="jam-add">
        <Plus className="h-4 w-4" /> Add chord
      </Button>
    </div>
  );
}

/** The scales and arpeggios shown over one chord (or every chord). */
function LayerEditor({
  target,
  chord,
  layers,
  onChange,
  onAllChords,
}: {
  target: number | "all";
  chord: JamChord | undefined;
  layers: JamLayer[];
  onChange: (fn: (ls: JamLayer[]) => JamLayer[]) => void;
  onAllChords: (l: JamLayer) => void;
}) {
  const [kind, setKind] = useState<"scale" | "arpeggio">("scale");
  const [root, setRoot] = useState(chord?.rootName ?? "A");
  const [scaleId, setScaleId] = useState("minor-pentatonic");
  const [chordId, setChordId] = useState(chord?.chordId ?? "maj");
  const [variantId, setVariantId] = useState("full");
  const suggestions = useMemo(() => {
    if (!chord) return [] as JamLayer[];
    const out: JamLayer[] = [];
    if (!layers.some((l) => l.kind === "arpeggio" && l.chordId === chord.chordId && l.rootName === chord.rootName && (l.variantId ?? "full") === "full")) out.push(ownArpeggio(chord));
    for (const id of chordDef(chord.chordId).scales ?? []) if (SCALES.some((s) => s.id === id)) out.push({ id: newId(), kind: "scale", rootName: chord.rootName, scaleId: id });
    return out.filter((s) => !layers.some((l) => layerName(l) === layerName(s))).slice(0, 6);
  }, [chord, layers]);
  const add = (l: JamLayer) => onChange((ls) => [...ls, l]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {target === "all" ? "Shown over every chord, on top of each chord's own choices — e.g. one scale for the whole progression." : chord ? `Shown on the neck while ${pretty(chord.label)} plays. Add as many as you like — the first two get their own colours.` : ""}
      </p>
      <ul className="space-y-1.5" data-testid="jam-layer-list">
        {layers.map((l, i) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5">
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: LAYER_COLORS[Math.min(i, 3)] }} />
            <span className="min-w-0 flex-1 text-sm font-semibold">{pretty(layerName(l))}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{layerDegrees(l).map(pretty).join(" ")}</span>
            {target !== "all" ? (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onAllChords(l)} title="Put this over every chord's own list">
                Copy to all chords
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Remove ${layerName(l)}`} onClick={() => onChange((ls) => ls.filter((x) => x.id !== l.id))}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {!layers.length ? <li className="text-sm text-muted-foreground">Nothing yet{target === "all" ? "" : " — the neck shows just what's set for every chord"}.</li> : null}
      </ul>
      {suggestions.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Suggested:</span>
          {suggestions.map((s) => (
            <button key={layerName(s)} type="button" onClick={() => add(s)} className="rounded-full border border-primary/50 px-2 py-0.5 font-semibold text-primary hover:bg-primary/10" data-testid="jam-suggest">
              + {pretty(layerName(s))}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2" data-testid="jam-add-layer">
        <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Scale or arpeggio">
          {(["scale", "arpeggio"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("rounded px-2.5 py-1.5 font-semibold capitalize", kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {k}
            </button>
          ))}
        </div>
        <select className={sel} value={root} onChange={(e) => setRoot(e.target.value)} aria-label="Root of the scale or arpeggio">
          {ROOT_NAMES.map((r) => (
            <option key={r} value={r}>
              {pretty(r)}
            </option>
          ))}
        </select>
        {kind === "scale" ? (
          <select className={cn(sel, "max-w-[15rem]")} value={scaleId} onChange={(e) => setScaleId(e.target.value)} aria-label="Scale">
            {SCALE_FAMILIES.map((f) => (
              <optgroup key={f} label={f}>
                {SCALES.filter((s) => s.family === f).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <>
            <select className={cn(sel, "max-w-[13rem]")} value={chordId} onChange={(e) => setChordId(e.target.value)} aria-label="Arpeggio of which chord">
              {CHORD_FAMILIES.map((f) => (
                <optgroup key={f} label={f}>
                  {CHORDS.filter((c) => c.family === f).map((c) => (
                    <option key={c.id} value={c.id}>
                      {pretty(`${root}${c.suffix}`)} — {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select className={cn(sel, "max-w-[12rem]")} value={variantId} onChange={(e) => setVariantId(e.target.value)} aria-label="Arpeggio type">
              {ARPEGGIO_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </>
        )}
        <Button
          size="sm"
          className="h-9 gap-1"
          data-testid="jam-add-layer-go"
          onClick={() => add(kind === "scale" ? { id: newId(), kind, rootName: root, scaleId } : { id: newId(), kind, rootName: root, chordId, variantId })}
        >
          <Plus className="h-4 w-4" /> Add {kind === "scale" ? pretty(`${root} ${scaleDef(scaleId).name}`) : "arpeggio"}
        </Button>
      </div>
    </div>
  );
}
