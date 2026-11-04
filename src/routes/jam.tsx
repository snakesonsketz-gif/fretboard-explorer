import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mic, Minus, Pause, Play, Plus, Square, Trash2, Volume2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Neck } from "@/components/Neck";
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
import { beatTicks, emptyArrangement, newId } from "@/lib/timeline";
import { beatsToProgression, chordsPerBeat, type BeatChord } from "@/lib/jamListen";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { cn } from "@/lib/utils";
import { jamBoards, jamBoardDots, setLayerVisibility } from "@/lib/jamVisualization";

export const Route = createFileRoute("/jam")({
  head: () => ({ meta: [
    { title: "Jam — Fretlab" },
    { name: "description", content: "Explore your chords with visible scale, arpeggio and shared target tones on Fretlab’s Jam fretboards." },
    { property: "og:title", content: "Jam — Fretlab" },
    { property: "og:description", content: "Layer your selected scales and arpeggios over your own chord progression." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: JamPage,
});

const KEY = "fretlab.jam.v1";
const ROOT_NAMES = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const INTERVAL = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];
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
  const visibleLayers = layers.filter((l) => l.visible !== false);
  const boards = jamBoards(layers, jam.layout ?? "overlapping");
  const chordRoot = shown ? rootByName(shown.rootName) : rootByName("C");
  const chordTones = new Set(shown ? chordPcs(shown) : []);
  const nextTones = new Set(nextChord ? chordPcs(nextChord) : []);
  const previewing = playing && showNext && !!nextChord && beatsLeft <= 1 && pos?.next !== pos?.index;
  const labelFor = (pc: number, boardLayer?: JamLayer) => {
    if (labels === "degree") {
      const own = shown ? chordDef(shown.chordId).degrees.find((d) => (chordRoot.pc + degreeToSemitones(d) + 120) % 12 === pc) : undefined;
      const d = own ?? INTERVAL[(pc - chordRoot.pc + 12) % 12]!;
      return d === "1" ? "R" : pretty(d);
    }
    for (const l of boardLayer ? [boardLayer] : visibleLayers) {
      const d = layerDegrees(l).find((x) => (rootByName(l.rootName).pc + degreeToSemitones(x) + 120) % 12 === pc);
      if (d) return pretty(spellDegree(rootByName(l.rootName), d as Degree));
    }
    return pretty(chromaticName(pc, chordRoot.alter < 0));
  };


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
          <MicRecorder
            bpm={jam.bpm}
            beatsPerBar={jam.beatsPerBar}
            onUse={(cs, mode) => {
              if (playing) stop();
              setChords((old) => (mode === "replace" ? cs : [...old, ...cs]));
              setText(progressionText(mode === "replace" ? cs : [...jam.chords, ...cs], jam.beatsPerBar));
              setPick(mode === "replace" ? 0 : jam.chords.length);
            }}
          />
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
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Jam fretboard layout">
            {(["overlapping", "separate"] as const).map((mode) => (
              <Button key={mode} size="sm" variant={(jam.layout ?? "overlapping") === mode ? "default" : "secondary"} role="radio" aria-checked={(jam.layout ?? "overlapping") === mode} onClick={() => update((j) => ({ ...j, layout: mode }))}>
                {mode === "overlapping" ? "Overlapping" : "Separate"}
              </Button>
            ))}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Visible Jam selections" data-testid="jam-visible-layers">
            {layers.map((l) => (
              <li key={l.id} className="min-w-0 max-w-full">
                <Button size="sm" variant="secondary" className="h-auto min-h-8 max-w-full gap-2 whitespace-normal text-left text-xs" aria-pressed={l.visible !== false} aria-label={`${l.visible === false ? "Show" : "Hide"} ${layerName(l)}`} onClick={() => editLayers(shown?.layers.some((x) => x.id === l.id) ? shownIndex : "all", (ls) => setLayerVisibility(ls, l.id, l.visible === false))}>
                  {l.visible === false ? <EyeOff className="h-3.5 w-3.5 shrink-0" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
                  <span>{pretty(layerName(l))}{jam.everywhere.some((x) => x.id === l.id) ? " · every chord" : ""}</span>
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" data-testid="jam-legend">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-jam-scale" />Scale notes</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-jam-arpeggio" />Arpeggio-only notes</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-jam-note-foreground bg-jam-target ring-1 ring-jam-target" />Target notes · shared scale + arpeggio</span>
            <span className="text-muted-foreground">White ring = the chord's root · {chordTones.size ? `chord tones ${[...chordTones].map((p) => labelFor(p)).join(" ")}` : ""}</span>
            {previewing && nextChord ? <span className="font-semibold text-third">Dashed = next chord ({pretty(nextChord.label)})</span> : null}
          </div>
          <div className="min-w-0 space-y-3" data-testid="jam-boards">
            {boards.map((board) => (
              <div key={board.id} className="min-w-0 space-y-1" data-jam-board={board.id}>
                {board.layer ? <h4 className="break-words text-sm font-semibold">{pretty(layerName(board.layer))}{jam.everywhere.some((l) => l.id === board.id) ? " · every chord" : ""}</h4> : null}
                <Neck
                  midis={tuning.midis}
                  names={tuning.names}
                  from={0}
                  to={toFret}
                  dots={jamBoardDots(tuning.midis, toFret, board.roles, chordRoot.pc, (pc) => labelFor(pc, board.layer), previewing ? nextTones : undefined)}
                  onTap={(s, f) => { const open = tuning.midis[s]; if (open !== undefined) pluck(open + f); }}
                  testId="jam-neck"
                  ariaLabel={board.layer ? `${pretty(layerName(board.layer))} fretboard — tap to hear notes` : "Notes to play over the current chord — tap to hear them"}
                />
              </div>
            ))}
            {!visibleLayers.length ? <p className="text-xs text-muted-foreground">All selections are hidden. Show a selection above to display its notes.</p> : null}
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
        {target === "all" ? "Shown over every chord, on top of each chord's own choices — e.g. one scale for the whole progression." : chord ? `Shown on the neck while ${pretty(chord.label)} plays. Add as many as you like.` : ""}
      </p>
      <ul className="space-y-1.5" data-testid="jam-layer-list">
        {layers.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5">
            <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full", l.kind === "scale" ? "bg-jam-scale" : "bg-jam-arpeggio")} />
            <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" aria-pressed={l.visible !== false} aria-label={`${l.visible === false ? "Show" : "Hide"} ${layerName(l)}`} onClick={() => onChange((ls) => setLayerVisibility(ls, l.id, l.visible === false))}>
              {l.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
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

type RecState = "idle" | "starting" | "recording" | "analysing" | "done" | "error";
const MIC_ERRORS: Record<MicError, string> = {
  denied: "The microphone is blocked. Allow it for Fretlab in your browser or phone settings, then try again.",
  "no-device": "No microphone was found.",
  insecure: "The microphone only works over a secure (https) connection.",
  unsupported: "This browser can't record from the microphone.",
  other: "The microphone couldn't start.",
};
const MAX_BARS = 32;

/**
 * Record a progression by strumming it: a one-bar count-in, then strum along to the click; each
 * beat is named from what the microphone heard and the beats are joined into chords.
 */
function MicRecorder({ bpm, beatsPerBar, onUse }: { bpm: number; beatsPerBar: number; onUse: (chords: JamChord[], mode: "replace" | "append") => void }) {
  const [state, setState] = useState<RecState>("idle");
  const [err, setErr] = useState("");
  const [bars, setBars] = useState(0);
  const [level, setLevel] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<JamChord[]>([]);
  const [unsure, setUnsure] = useState(0);
  const cap = useRef<Capture | null>(null);
  const clicks = useRef<number[]>([]);
  const chunks = useRef<{ frame: number; data: Float32Array }[]>([]);
  const lastFrame = useRef(0);
  const timer = useRef<number | null>(null);
  const tabActive = useTabActive();

  const pull = () => {
    const c = cap.current;
    if (!c) return;
    const end = c.endFrame;
    const from = Math.max(lastFrame.current, c.firstFrame);
    if (end > from) {
      const d = c.read(from, end);
      if (d) chunks.current.push({ frame: from, data: d });
      lastFrame.current = end;
    }
    setLevel(c.level);
    const b = Math.floor(clicks.current.length / beatsPerBar);
    setBars(b);
    if (b >= MAX_BARS) void finish();
  };

  const begin = async () => {
    engine.unlock();
    setErr("");
    setResult([]);
    setState("starting");
    const ctx = await engine.audioContext();
    if (!ctx) {
      setErr(MIC_ERRORS.unsupported);
      setState("error");
      return;
    }
    if (ctx.state === "suspended") await ctx.resume();
    const c = await startCapture(ctx);
    if ("error" in c) {
      setErr(MIC_ERRORS[c.error]);
      setState("error");
      return;
    }
    cap.current = c;
    clicks.current = [];
    chunks.current = [];
    lastFrame.current = c.endFrame;
    engine.setListener({
      onEvent: (e, time) => {
        if (e.kind === "click" && !e.countIn) clicks.current.push(time);
      },
    });
    engine.setClickMuted(false);
    engine.setChordsMuted(false);
    await engine.play({ ...emptyArrangement(), bpm, ts: { beats: beatsPerBar, unit: 4 }, measures: 1, chords: [], metronome: true, loop: true, countIn: 1 });
    setBars(0);
    setState("recording");
    timer.current = window.setInterval(pull, 150);
  };

  const finish = async () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    const c = cap.current;
    if (!c) return;
    pull();
    const ctxNow = (await engine.audioContext())?.currentTime ?? Infinity;
    engine.stop();
    engine.setListener({});
    c.stop();
    cap.current = null;
    setState("analysing");
    setProgress(0);
    const parts = chunks.current;
    if (!parts.length) {
      setState("done");
      return;
    }
    const start = parts[0]!.frame;
    const total = parts.reduce((n, p) => Math.max(n, p.frame + p.data.length - start), 0);
    const samples = new Float32Array(total);
    for (const p of parts) samples.set(p.data, p.frame - start);
    const sr = c.sampleRate;
    const beatFrames = (60 / bpm) * sr;
    // Beats that were fully recorded (the last one may be cut short by the stop).
    const beats = clicks.current.filter((t) => t < ctxNow).map((t) => Math.round(t * sr)).filter((f) => f >= start && f + beatFrames * 0.5 <= start + total);
    const per: BeatChord[] = [];
    for (let i = 0; i < beats.length; i += 6) {
      per.push(...chordsPerBeat(samples, sr, start, beats.slice(i, i + 6), beatFrames));
      setProgress((i + 6) / Math.max(1, beats.length));
      await new Promise((r) => setTimeout(r, 0));
    }
    const prog = beatsToProgression(per);
    setUnsure(per.filter((b) => b.rootPc !== null && b.confidence < 0.45).length);
    setResult(prog);
    setState("done");
  };

  useEffect(() => {
    if (!tabActive && state === "recording") void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActive]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      cap.current?.stop();
    },
    [],
  );

  return (
    <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-2" data-testid="jam-mic">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold">Or strum it:</span>
        {state === "recording" ? (
          <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={() => void finish()} data-testid="jam-rec-stop">
            <Square className="h-4 w-4" /> Stop — work out the chords
          </Button>
        ) : (
          <Button size="sm" className="h-9 gap-1.5" disabled={state === "starting" || state === "analysing"} onClick={() => void begin()} data-testid="jam-rec">
            <Mic className="h-4 w-4" /> {state === "done" ? "Record again" : "Record from the mic"}
          </Button>
        )}
        {state === "recording" ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-third">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-third" />
              {clicks.current.length ? `Bar ${bars + 1}` : "Count-in…"}
            </span>
            <span className="h-2 w-24 overflow-hidden rounded-full bg-secondary" aria-label="Input level">
              <span className="block h-full bg-primary" style={{ width: `${Math.min(100, level * 400)}%` }} />
            </span>
          </>
        ) : null}
        {state === "analysing" ? <span className="text-xs text-muted-foreground">Listening back… {Math.min(100, Math.round(progress * 100))}%</span> : null}
        {state === "starting" ? <span className="text-xs text-muted-foreground">Starting the mic…</span> : null}
      </div>
      {state === "idle" || state === "starting" ? (
        <p className="text-[11px] text-muted-foreground">
          Uses the tempo and beats per bar below. After a one-bar count-in, strum each chord on the beat along with the click, then press Stop. Up to {MAX_BARS} bars. Headphones help, so the mic hears your guitar more than the click.
        </p>
      ) : null}
      {state === "error" ? <p className="text-xs font-semibold text-third">{err}</p> : null}
      {state === "done" ? (
        result.length ? (
          <div className="space-y-1.5" data-testid="jam-rec-result">
            <p className="text-xs">
              Heard: <b className="font-mono">{pretty(progressionText(result, beatsPerBar))}</b>
              {unsure ? <span className="text-muted-foreground"> · {unsure} beat{unsure === 1 ? "" : "s"} sounded unclear — check those chords</span> : null}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-8" onClick={() => onUse(result, "replace")} data-testid="jam-rec-use">
                Use this progression
              </Button>
              <Button size="sm" variant="secondary" className="h-8" onClick={() => onUse(result, "append")}>
                Add to the end
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-third">No chords were heard. Strum a little louder or closer to the phone, and try again.</p>
        )
      ) : null}
    </div>
  );
}
