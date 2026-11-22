import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Minus, Pause, Play, Plus, Trash2, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playChord } from "@/lib/audio";
import { engine } from "@/lib/engine";
import { ALTER_ROWS, degreeAt, withDegree } from "@/lib/chordAlter";
import { emptyJam, jamArrangement, jamPosition, makeChord } from "@/lib/jam";
import { openInExplore } from "@/lib/exploreLink";
import {
  analyzeChord, analyze, borrowSources, chordById, chordLabel, diatonicChords, emptyProgression, FN_LABEL, FN_MEANING, FN_SHORT, functionPath, KEY_MODES,
  makeProgChord, modeDef, shiftChord, progressionToText, totalBeats, type ChordOption, type Fn, type ProgChord, type Progression,
} from "@/lib/progression";
import {
  arrangementToProg, jamToProg, loadBuilderDraft, readJam, readSequencer, readSongDraft, roundedInSong, saveBuilderDraft, sendToSequencer, sendToSong, sequencerHasChords,
  songDraftHasChords, songToProg, takeIncoming, textToChords, writeJam, progToJam,
} from "@/lib/progressionLink";
import { useTabActive } from "@/lib/tabActive";
import { CHORDS, ROOTS, pretty, rootByName, spellDegree } from "@/lib/theory";
import { chordMidis, beatTicks, newId } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progression")({
  head: () => ({ meta: [
    { title: "Progression — Fretlab" },
    { name: "description", content: "Build a chord progression: diatonic chords for any key and mode with their function, borrowed chords, any chord, beats per chord — and send it to Jam, Explore or the Sequencer." },
  ] }),
  component: ProgressionPage,
});

const sel = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";
const FN_STYLE: Record<Fn, { bar: string; chip: string }> = {
  tonic: { bar: "bg-emerald-400", chip: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" },
  subdominant: { bar: "bg-sky-400", chip: "border-sky-400/50 bg-sky-400/10 text-sky-300" },
  dominant: { bar: "bg-rose-400", chip: "border-rose-400/50 bg-rose-400/10 text-rose-300" },
};
const BEAT_PRESETS = [1, 2, 3, 4, 6, 8];
const MODE_FAMILIES = [...new Set(KEY_MODES.map((m) => m.family))];
const CHORD_FAMILIES = [...new Set(CHORDS.map((c) => c.family))];

const hear = (rootName: string, chordId: string) => playChord(chordMidis({ rootName, degrees: [...chordById(chordId).degrees] }));

function FnChip({ fn, className }: { fn: Fn; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", FN_STYLE[fn].chip, className)}>{FN_LABEL[fn]}</span>;
}

function ChordTile({ opt, onAdd, dim, tag }: { opt: ChordOption; onAdd: () => void; dim?: boolean | undefined; tag?: string | undefined }) {
  return (
    <li className={cn("relative flex overflow-hidden rounded-xl border border-border bg-card/40", dim && "opacity-60")} data-testid="prog-tile">
      <span className={cn("w-1.5 shrink-0", FN_STYLE[opt.fn].bar)} />
      <button type="button" className="min-w-0 flex-1 px-2 py-2 text-left" onClick={() => hear(opt.rootName, opt.chordId)} aria-label={`Hear ${opt.label}`}>
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-black">{pretty(opt.roman)}</span>
          <span className="truncate text-sm font-semibold">{pretty(opt.label)}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <FnChip fn={opt.fn} />
          {tag ? <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">{tag}</span> : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{opt.detail} · {opt.notes.map(pretty).join(" ")}</span>
      </button>
      <Button size="sm" variant="secondary" className="m-1.5 h-auto w-9 shrink-0 self-stretch p-0" aria-label={`Add ${opt.label}`} onClick={onAdd} data-testid="prog-add">
        <Plus className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function ProgressionPage() {
  const navigate = useNavigate();
  const [prog, setProg] = useState<Progression>(() => ({ ...emptyProgression(), chords: [] }));
  const [seventh, setSeventh] = useState(false);
  const [borrowRoot, setBorrowRoot] = useState("C");
  const [borrowScaleId, setBorrowScaleId] = useState("aeolian");
  const [ready, setReady] = useState(false);
  const [selRaw, setSel] = useState(0);
  const [text, setText] = useState("");
  const [bad, setBad] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [anyRoot, setAnyRoot] = useState("C");
  const [anyChord, setAnyChord] = useState("maj");
  const [anyBass, setAnyBass] = useState("");

  const flash = (t: string) => {
    setMsg(t);
    window.setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    const incoming = takeIncoming();
    const d = loadBuilderDraft();
    if (incoming) {
      setProg(incoming);
      setBorrowRoot(incoming.keyRoot);
      if (d) setSeventh(d.seventh);
    } else if (d) {
      setProg(d.prog);
      setSeventh(d.seventh);
      setBorrowRoot(d.borrowRoot);
      setBorrowScaleId(d.borrowScaleId);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveBuilderDraft({ prog, seventh, borrowRoot, borrowScaleId });
  }, [prog, seventh, borrowRoot, borrowScaleId, ready]);
  const textOf = progressionToText(prog);
  useEffect(() => {
    setText(textOf);
    setBad([]);
  }, [textOf]);

  const cur = Math.min(selRaw, Math.max(0, prog.chords.length - 1));
  const picked: ProgChord | undefined = prog.chords[cur];
  const update = (fn: (p: Progression) => Progression) => setProg((p) => fn(p));
  const setChords = (fn: (cs: ProgChord[]) => ProgChord[]) => update((p) => ({ ...p, chords: fn(p.chords) }));

  const home = { keyRoot: prog.keyRoot, scaleId: prog.scaleId };
  const scale = modeDef(prog.scaleId);
  const scaleNotes = scale.degrees.map((d) => spellDegree(rootByName(prog.keyRoot), d));
  const diatonic = useMemo(() => diatonicChords(prog.keyRoot, prog.scaleId, seventh), [prog.keyRoot, prog.scaleId, seventh]);
  const borrowed = useMemo(() => diatonicChords(borrowRoot, borrowScaleId, seventh, { keyRoot: prog.keyRoot, scaleId: prog.scaleId }), [borrowRoot, borrowScaleId, seventh, prog.keyRoot, prog.scaleId]);
  const sources = useMemo(() => borrowSources(prog.keyRoot, prog.scaleId), [prog.keyRoot, prog.scaleId]);
  const anyA = analyze(prog.keyRoot, prog.scaleId, anyRoot, anyChord);

  const add = (rootName: string, chordId: string, opts: { bassName?: string | undefined; from?: string | undefined } = {}) => {
    const c = makeProgChord(rootName, chordId, prog.beatsPerBar, opts);
    setChords((cs) => [...cs, c]);
    setSel(prog.chords.length);
    flash(`Added ${chordLabel(rootName, chordId, opts.bassName)}.`);
  };
  const setBeats = (beats: number) => picked && setChords((cs) => cs.map((c, i) => (i === cur ? { ...c, beats: Math.max(0.5, Math.min(64, beats)) } : c)));
  const move = (to: number) => {
    setChords((cs) => {
      if (to < 0 || to >= cs.length) return cs;
      const next = [...cs];
      [next[cur], next[to]] = [next[to]!, next[cur]!];
      return next;
    });
    setSel(to);
  };

  // ---- playback (a click track over the chords)
  const jamForPlay = useMemo(
    () => ({ ...emptyJam(), chords: prog.chords.map((c) => makeChord(c.rootName, c.chordId, c.beats, c.bassName)), bpm: prog.bpm, beatsPerBar: prog.beatsPerBar, drums: "none" as const, metronome: true, chordsOn: true }),
    [prog],
  );
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const tabActive = useTabActive();
  const play = async () => {
    if (!prog.chords.length) return;
    engine.setListener({ onEnded: () => setPlaying(false) });
    await engine.play(jamArrangement(jamForPlay));
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
  useEffect(() => {
    if (playing && prog.chords.length) void engine.load(jamArrangement(jamForPlay));
  }, [jamForPlay, playing, prog.chords.length]);
  useEffect(() => {
    if (!playing) return;
    const bt = beatTicks({ beats: prog.beatsPerBar, unit: 4 });
    let raf = 0;
    const tick = () => {
      setBeat(engine.positionTicks() / bt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, prog.beatsPerBar]);
  useEffect(() => () => engine.stop(), []);
  const nowIndex = playing && beat >= 0 ? (jamPosition(jamForPlay, beat)?.index ?? -1) : -1;

  // ---- moving between pages
  const applyText = () => {
    const r = textToChords(text, prog.beatsPerBar);
    setBad(r.bad);
    if (r.chords.length) {
      setChords(() => r.chords);
      setSel(0);
    } else if (!r.bad.length) setChords(() => []);
  };
  const replaceFrom = (next: Progression, what: string, skipped = 0) => {
    if (prog.chords.length && !window.confirm(`Replace the chords here with the ${what}?`)) return;
    stop();
    setProg(next);
    setBorrowRoot(next.keyRoot);
    setSel(0);
    flash(`Loaded ${next.chords.length} chord${next.chords.length === 1 ? "" : "s"} from ${what}.${skipped ? ` ${skipped} couldn't be read.` : ""}`);
  };
  const fromJam = () => {
    const j = readJam();
    if (!j?.chords.length) return flash("Jam has no chords yet.");
    replaceFrom(jamToProg(j, prog), "Jam");
  };
  const fromSong = () => {
    const d = readSongDraft();
    if (!d || !d.sections.some((s) => s.slots.length)) return flash("The Explore song has no chords yet.");
    const r = songToProg(d);
    replaceFrom(r.prog, "Explore song", r.skipped);
  };
  const fromSequencer = () => {
    const a = readSequencer();
    if (!a?.chords.length) return flash("The Sequencer has no chords yet.");
    const r = arrangementToProg(a, prog);
    replaceFrom(r.prog, "Sequencer", r.skipped);
  };
  const toJam = () => {
    if (!prog.chords.length) return flash("Add some chords first.");
    const cur = readJam();
    if (cur?.chords.length && !window.confirm("Replace the chords in Jam with this progression? (Your Jam selections over every chord stay.)")) return;
    stop();
    writeJam(progToJam(prog, cur ?? emptyJam()));
    void navigate({ to: "/jam" });
  };
  const toSong = () => {
    if (!prog.chords.length) return flash("Add some chords first.");
    const rounded = roundedInSong(prog);
    const lines = [];
    if (songDraftHasChords()) lines.push("The Explore song you have open will be saved to My songs first.");
    if (rounded.length) lines.push(`Songs count whole bars, so ${rounded.map((c) => chordLabel(c.rootName, c.chordId)).join(", ")} will round to the nearest bar.`);
    if (lines.length && !window.confirm(`${lines.join(" ")} Continue?`)) return;
    stop();
    sendToSong(prog);
    void navigate({ to: "/" });
  };
  const toSequencer = () => {
    if (!prog.chords.length) return flash("Add some chords first.");
    if (sequencerHasChords() && !window.confirm("Replace the chords in the Sequencer with this progression? (Its drum pattern stays when the bar length matches.)")) return;
    stop();
    sendToSequencer(prog);
    void navigate({ to: "/sequencer" });
  };
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(textOf);
      flash("Copied — paste it into Jam's chord box or anywhere.");
    } catch {
      flash("Couldn't copy — select the text box and copy it.");
    }
  };

  const total = totalBeats(prog);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 sm:px-4" data-testid="prog-page">
        {/* ------------------------------------------------ the progression */}
        <section className="panel space-y-3 p-3 sm:p-4" data-testid="prog-main">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-black">Progression</h2>
            <span className="text-xs text-muted-foreground">Build it from the chords below, then send it anywhere.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {playing ? (
              <Button size="sm" className="gap-1" onClick={stop}><Pause className="h-4 w-4" /> Stop</Button>
            ) : (
              <Button size="sm" className="gap-1" onClick={() => void play()} disabled={!prog.chords.length} data-testid="prog-play"><Play className="h-4 w-4" /> Play</Button>
            )}
            <label className="flex items-center gap-2 text-xs">
              Tempo
              <input type="range" min={50} max={200} value={prog.bpm} onChange={(e) => update((p) => ({ ...p, bpm: Number(e.target.value) }))} aria-label="Tempo" />
              <span className="w-14 font-mono">{prog.bpm} bpm</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              Beats per bar
              <select className={sel} value={prog.beatsPerBar} onChange={(e) => update((p) => ({ ...p, beatsPerBar: Number(e.target.value) }))} aria-label="Beats per bar" data-testid="prog-bpb">
                {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <span className="text-xs text-muted-foreground" data-testid="prog-total">{total} beats · {Math.round((total / prog.beatsPerBar) * 100) / 100} bars</span>
          </div>

          <ul className="flex gap-1 overflow-x-auto pb-1" data-testid="prog-strip" aria-label="Progression">
            {prog.chords.map((c, i) => {
              const a = analyzeChord(prog, c);
              const isNow = nowIndex === i;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => { setSel(i); hear(c.rootName, c.chordId); }}
                    className={cn("relative block overflow-hidden rounded-lg border px-2 pb-1.5 pt-2.5 text-left", isNow ? "border-primary bg-primary/15" : i === cur ? "border-foreground/60 bg-secondary" : "border-border bg-card/40")}
                    style={{ minWidth: `${Math.max(4, c.beats * 1.6)}rem` }}
                    data-testid="prog-chord"
                    aria-label={`${chordLabel(c.rootName, c.chordId, c.bassName)}, ${a.roman}, ${FN_LABEL[a.fn]}, ${c.beats} beats`}
                  >
                    <span className={cn("absolute inset-x-0 top-0 h-1.5", FN_STYLE[a.fn].bar)} />
                    <span className="block font-display text-base font-bold">{pretty(chordLabel(c.rootName, c.chordId, c.bassName))}</span>
                    <span className="block text-xs font-semibold">{pretty(a.roman)} <span className="text-muted-foreground">· {FN_SHORT[a.fn]}</span></span>
                    <span className="block text-[10px] text-muted-foreground">{c.beats} beat{c.beats === 1 ? "" : "s"}{!a.inKey ? " · borrowed" : ""}</span>
                  </button>
                </li>
              );
            })}
            {!prog.chords.length ? <li className="text-sm text-muted-foreground">No chords yet — tap + on a chord below, or type some.</li> : null}
          </ul>
          {prog.chords.length ? <p className="text-xs text-muted-foreground" data-testid="prog-path">{functionPath(prog)}</p> : null}

          {picked ? (
            <div className="space-y-2 rounded-xl border border-border bg-card/40 p-2" data-testid="prog-chord-tools">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold">{pretty(chordLabel(picked.rootName, picked.chordId, picked.bassName))}</span>
                <FnChip fn={analyzeChord(prog, picked).fn} />
                <span className="text-muted-foreground">{analyzeChord(prog, picked).detail}{picked.from ? ` · from ${picked.from}` : ""}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Lasts</span>
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Fewer beats" onClick={() => setBeats(picked.beats - 1)}><Minus className="h-3.5 w-3.5" /></Button>
                <span className="w-16 text-center font-mono text-sm" data-testid="prog-beats">{picked.beats} beat{picked.beats === 1 ? "" : "s"}</span>
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="More beats" onClick={() => setBeats(picked.beats + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                {BEAT_PRESETS.map((n) => (
                  <Button key={n} size="sm" variant={picked.beats === n ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => setBeats(n)}>
                    {n === prog.beatsPerBar ? "1 bar" : n === prog.beatsPerBar * 2 ? "2 bars" : n}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Move left" disabled={cur === 0} onClick={() => move(cur - 1)}><ArrowLeft className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Move right" disabled={cur >= prog.chords.length - 1} onClick={() => move(cur + 1)}><ArrowRight className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Flatten chord (down a semitone)" onClick={() => { const n = shiftChord(picked, -1); setChords((cs) => cs.map((c, i) => (i === cur ? n : c))); hear(n.rootName, n.chordId); }} data-testid="prog-flat">♭</Button>
                <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Sharpen chord (up a semitone)" onClick={() => { const n = shiftChord(picked, 1); setChords((cs) => cs.map((c, i) => (i === cur ? n : c))); hear(n.rootName, n.chordId); }} data-testid="prog-sharp">♯</Button>
                <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => hear(picked.rootName, picked.chordId)}><Volume2 className="h-3.5 w-3.5" /> Hear</Button>
                <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => { setChords((cs) => [...cs.slice(0, cur + 1), { ...picked, id: newId() }, ...cs.slice(cur + 1)]); setSel(cur + 1); }}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => { const d = chordById(picked.chordId); openInExplore({ rootName: picked.rootName, degrees: [...d.degrees], tuningId: "standard" }); void navigate({ to: "/" }); }}>
                  Open in Explore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-third" onClick={() => { setChords((cs) => cs.filter((_, i) => i !== cur)); setSel(Math.max(0, cur - 1)); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ) : null}

          {picked ? (
            <details className="rounded-xl border border-border bg-card/40 p-2" data-testid="prog-alter">
              <summary className="cursor-pointer text-xs font-semibold">Change notes in {pretty(chordLabel(picked.rootName, picked.chordId, picked.bassName))} (♭5, ♯9, leave out the 3rd…)</summary>
              <div className="mt-2 space-y-1.5">
                {ALTER_ROWS.map((row) => {
                  const have = degreeAt(picked.chordId, row.n);
                  return (
                    <div key={row.n} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="w-9 text-muted-foreground">{row.label}</span>
                      {row.options.map((o) => (
                        <Button
                          key={o ?? "off"}
                          size="sm"
                          variant={have === o ? "default" : "secondary"}
                          className="h-7 min-w-9 px-2 text-xs"
                          aria-pressed={have === o}
                          data-testid={`prog-alter-${row.n}-${o ?? "off"}`}
                          onClick={() => {
                            const id = withDegree(picked.chordId, row.n, o);
                            if (!id) return flash("A chord needs at least two notes.");
                            setChords((cs) => cs.map((c, i) => (i === cur ? { ...c, chordId: id, from: undefined } : c)));
                            hear(picked.rootName, id);
                          }}
                        >
                          {o === null ? "off" : o.replace(/b/g, "♭").replace(/#/g, "♯")}
                        </Button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); applyText(); }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type: G D Em C*2 Am:3" aria-label="Progression as text" className="h-9 min-w-0 flex-1 basis-48 font-mono" data-testid="prog-text" />
            <Button type="submit" size="sm" variant="secondary">Use text</Button>
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => void copyText()}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          </form>
          {bad.length ? <p className="text-xs text-third">Couldn't read: {bad.join(", ")}</p> : null}

          <div className="grid gap-2 sm:grid-cols-2" data-testid="prog-transfer">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold">Send to</span>
              <Button size="sm" onClick={toJam} data-testid="prog-to-jam">Jam</Button>
              <Button size="sm" variant="secondary" onClick={toSong} data-testid="prog-to-song">Explore song</Button>
              <Button size="sm" variant="secondary" onClick={toSequencer} data-testid="prog-to-seq">Sequencer</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold">Bring in from</span>
              <Button size="sm" variant="secondary" onClick={fromJam} data-testid="prog-from-jam">Jam</Button>
              <Button size="sm" variant="secondary" onClick={fromSong} data-testid="prog-from-song">Explore song</Button>
              <Button size="sm" variant="secondary" onClick={fromSequencer} data-testid="prog-from-seq">Sequencer</Button>
            </div>
          </div>
          <p className="min-h-4 text-[11px] text-muted-foreground" aria-live="polite" data-testid="prog-msg">{msg}</p>
        </section>

        {/* ------------------------------------------------ the key */}
        <section className="panel space-y-3 p-3 sm:p-4" data-testid="prog-key">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold">Key &amp; mode</h3>
            <select className={sel} value={prog.keyRoot} onChange={(e) => update((p) => ({ ...p, keyRoot: e.target.value }))} aria-label="Key" data-testid="prog-key-root">
              {ROOTS.map((r) => <option key={r.name} value={r.name}>{pretty(r.name)}</option>)}
            </select>
            <select className={cn(sel, "min-w-0 max-w-full")} value={prog.scaleId} onChange={(e) => update((p) => ({ ...p, scaleId: e.target.value }))} aria-label="Mode" data-testid="prog-key-mode">
              {MODE_FAMILIES.map((f) => (
                <optgroup key={f} label={f}>
                  {KEY_MODES.filter((m) => m.family === f).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
            <div className="inline-flex rounded-md bg-secondary/60 p-0.5 text-xs" role="radiogroup" aria-label="Chord size">
              {([false, true] as const).map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={seventh === v} onClick={() => setSeventh(v)} className={cn("rounded px-2.5 py-1.5 font-semibold", seventh === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {v ? "Sevenths" : "Triads"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {pretty(prog.keyRoot)} {scale.name}: <span className="font-mono">{scaleNotes.map(pretty).join(" ")}</span>
            {scale.characteristic ? ` · ${scale.characteristic}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" data-testid="prog-fn-key">
            {(Object.keys(FN_LABEL) as Fn[]).map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5"><FnChip fn={f} />{FN_MEANING[f]}</span>
            ))}
          </div>
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4" data-testid="prog-diatonic" aria-label="Chords in this key">
            {diatonic.map((o) => (
              <ChordTile key={o.label} opt={o} onAdd={() => add(o.rootName, o.chordId)} />
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------ borrowing */}
        <section className="panel space-y-3 p-3 sm:p-4" data-testid="prog-borrow">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold">Borrow chords</h3>
            <span className="text-xs text-muted-foreground">From another mode or key. Numerals and jobs are read against {pretty(prog.keyRoot)} {scale.name}.</span>
          </div>
          <div className="flex flex-wrap gap-1.5" data-testid="prog-borrow-chips">
            {sources.map((s) => (
              <button key={s.label} type="button" onClick={() => { setBorrowRoot(s.root); setBorrowScaleId(s.scaleId); }} className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", s.root === borrowRoot && s.scaleId === borrowScaleId ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                {pretty(s.label)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Or any key:</span>
            <select className={sel} value={borrowRoot} onChange={(e) => setBorrowRoot(e.target.value)} aria-label="Borrow from key" data-testid="prog-borrow-root">
              {ROOTS.map((r) => <option key={r.name} value={r.name}>{pretty(r.name)}</option>)}
            </select>
            <select className={cn(sel, "min-w-0 max-w-full")} value={borrowScaleId} onChange={(e) => setBorrowScaleId(e.target.value)} aria-label="Borrow from mode" data-testid="prog-borrow-mode">
              {MODE_FAMILIES.map((f) => (
                <optgroup key={f} label={f}>
                  {KEY_MODES.filter((m) => m.family === f).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4" data-testid="prog-borrowed" aria-label="Borrowed chords">
            {borrowed.map((o) => (
              <ChordTile key={o.label} opt={o} dim={o.inKey} tag={o.inKey ? undefined : "borrowed"} onAdd={() => add(o.rootName, o.chordId, o.inKey ? {} : { from: o.from })} />
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">Dimmed chords are already in {pretty(prog.keyRoot)} {scale.name}.</p>
        </section>

        {/* ------------------------------------------------ any chord */}
        <section className="panel space-y-3 p-3 sm:p-4" data-testid="prog-any">
          <h3 className="font-display text-lg font-bold">Any chord</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={anyRoot} onChange={(e) => setAnyRoot(e.target.value)} aria-label="Chord root" data-testid="prog-any-root">
              {ROOTS.map((r) => <option key={r.name} value={r.name}>{pretty(r.name)}</option>)}
            </select>
            <select className={cn(sel, "min-w-0 max-w-full")} value={anyChord} onChange={(e) => setAnyChord(e.target.value)} aria-label="Chord type" data-testid="prog-any-type">
              {CHORD_FAMILIES.map((f) => (
                <optgroup key={f} label={f}>
                  {CHORDS.filter((c) => c.family === f).map((c) => <option key={c.id} value={c.id}>{c.name}{c.suffix ? ` (${c.suffix})` : ""}</option>)}
                </optgroup>
              ))}
            </select>
            <select className={sel} value={anyBass} onChange={(e) => setAnyBass(e.target.value)} aria-label="Bass note">
              <option value="">Bass: root</option>
              {ROOTS.map((r) => <option key={r.name} value={r.name}>/{pretty(r.name)}</option>)}
            </select>
            <Button size="sm" className="gap-1" onClick={() => add(anyRoot, anyChord, anyBass && anyBass !== anyRoot ? { bassName: anyBass } : {})} data-testid="prog-any-add"><Plus className="h-4 w-4" /> Add</Button>
            <Button size="sm" variant="secondary" className="gap-1" onClick={() => hear(anyRoot, anyChord)}><Volume2 className="h-4 w-4" /> Hear</Button>
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="prog-any-info">
            <span className="font-display text-base font-black">{pretty(anyA.roman)}</span>
            <FnChip fn={anyA.fn} />
            <span className="text-muted-foreground">{anyA.detail}{anyA.inKey ? "" : " · outside the key (borrowed)"}</span>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
