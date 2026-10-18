import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AudioLines, Check, ClipboardCopy, Download, FilePlus2, FolderOpen, MessageSquareText, Mic, Play, Redo2, Save, Square, Trash2, Type, Undo2, Wand2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TabGrid, type GridOps, type Sel } from "@/components/tabs/TabGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { engine } from "@/lib/engine";
import { useTabActive } from "@/lib/tabActive";
import { describe, DESCRIBE_EXAMPLES, type DescribeLine } from "@/lib/tabs/describe";
import { barCol, cloneCols, colId, DEFAULT_BEATS, emptyCells, emptyDoc, refit, restCol, tabTuning, type Column, type TabDoc } from "@/lib/tabs/model";
import { playEvents, totalSeconds } from "@/lib/tabs/play";
import { renderAscii } from "@/lib/tabs/render";
import { deleteTab, loadDraft, loadTabs, saveDraft, upsertTab } from "@/lib/tabs/store";
import { importText } from "@/lib/tabs/text";
import { INSTRUMENTS, TUNINGS } from "@/lib/tuner/tunings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tabs")({
  head: () => ({ meta: [{ title: "Tab Maker — Fretlab" }] }),
  component: TabsPage,
});

type InputMode = "describe" | "text" | "audio";
const HISTORY = 100;

/** Tab Maker: write tablature by describing what you play, by tapping it in, or by typing tab text. */
export function TabsPage() {
  const [hist, setHist] = useState<{ doc: TabDoc; past: Column[][]; future: Column[][] }>(() => ({ doc: emptyDoc(), past: [], future: [] }));
  const { doc, past, future } = hist;
  /** Changes that aren't undoable steps (title, tempo, tuning, opening a tab). */
  const setDoc = useCallback((fn: TabDoc | ((d: TabDoc) => TabDoc), resetHistory = false) => {
    setHist((h) => {
      const d = typeof fn === "function" ? fn(h.doc) : fn;
      return resetHistory ? { doc: d, past: [], future: [] } : { ...h, doc: d };
    });
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [mode, setMode] = useState<InputMode>("describe");
  const [saved, setSaved] = useState<TabDoc[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const active = useTabActive();

  useEffect(() => {
    const d = loadDraft();
    if (d) setDoc(d, true);
    setSaved(loadTabs());
    setLoaded(true);
  }, [setDoc]);
  useEffect(() => {
    if (loaded) saveDraft(doc);
  }, [doc, loaded]);

  const note = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2200);
  };

  /** Every change to the columns goes through here, so it can be undone. */
  const commit = useCallback((fn: (cols: Column[]) => Column[]) => {
    setHist((h) => {
      const cols = fn(h.doc.cols);
      if (cols === h.doc.cols) return h;
      return { doc: { ...h.doc, cols, updated: Date.now() }, past: [...h.past.slice(-HISTORY + 1), h.doc.cols], future: [] };
    });
  }, []);
  const undo = () => {
    setSel(null);
    setHist((h) => (h.past.length ? { doc: { ...h.doc, cols: h.past[h.past.length - 1]! }, past: h.past.slice(0, -1), future: [h.doc.cols, ...h.future].slice(0, HISTORY) } : h));
  };
  const redo = () => {
    setSel(null);
    setHist((h) => (h.future.length ? { doc: { ...h.doc, cols: h.future[0]! }, past: [...h.past, h.doc.cols].slice(-HISTORY), future: h.future.slice(1) } : h));
  };

  const n = doc.tuning.midis.length;
  const ops: GridOps = useMemo(
    () => ({
      setCell: (col, s, fn) =>
        commit((cols) => {
          const c = cols[col];
          if (!c) return cols;
          const cells = [...c.cells];
          cells[s] = fn(cells[s] ?? null);
          return cols.map((x, i) => (i === col ? { ...x, kind: x.kind === "rest" && cells[s] ? "notes" : x.kind, cells } : x));
        }),
      setCol: (col, fn) => commit((cols) => cols.map((x, i) => (i === col ? fn(x) : x))),
      insertCol: (at, kind) =>
        commit((cols) => {
          const beats = [...cols.slice(0, at)].reverse().find((c) => c.kind !== "bar")?.beats ?? DEFAULT_BEATS;
          const c: Column = kind === "bar" ? barCol(n) : kind === "rest" ? restCol(n, beats) : { id: colId(), kind: "notes", cells: emptyCells(n), beats };
          return [...cols.slice(0, at), c, ...cols.slice(at)];
        }),
      duplicateCol: (col) => commit((cols) => (cols[col] ? [...cols.slice(0, col + 1), ...cloneCols([cols[col]!]), ...cols.slice(col + 1)] : cols)),
      deleteCol: (col) => commit((cols) => cols.filter((_, i) => i !== col)),
    }),
    [commit, n],
  );

  /* ------------------------------------------------------------ playback */
  const [playing, setPlaying] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPlaying(null);
  }, []);
  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);
  useEffect(() => stop, [stop]);
  const play = () => {
    if (playing !== null) return stop();
    const from = sel && sel.col < doc.cols.length ? sel.col : 0;
    const evs = playEvents(doc, from);
    if (!evs.length) return note("Nothing to play yet.");
    engine.unlock();
    const sound = (e: (typeof evs)[number]) => {
      setPlaying(e.col);
      if (e.midis.length) void engine.previewNotes(e.strum < 0 ? [...e.midis].reverse() : e.midis, e.midis.length > 2 ? 0.018 : 0, { velocity: 0.75 });
    };
    evs.forEach((e) => {
      if (e.at === 0) sound(e);
      else timers.current.push(window.setTimeout(() => sound(e), e.at * 1000));
      e.extras.forEach((x) => timers.current.push(window.setTimeout(() => void engine.previewNotes([x.midi], 0, { velocity: x.vel }), x.at * 1000)));
    });
    const end = evs[evs.length - 1]!;
    timers.current.push(window.setTimeout(stop, (end.at + Math.max(0.4, end.dur)) * 1000));
  };

  /* ------------------------------------------------------------ describe */
  const [text, setText] = useState("");
  const [lines, setLines] = useState<DescribeLine[]>([]);
  const runDescribe = (replace: boolean) => {
    if (!text.trim()) return;
    const r = describe(text, doc.tuning, replace ? [] : doc.cols);
    setLines(r.lines);
    if (r.added > 0 || r.cols.length !== doc.cols.length || replace) {
      commit(() => r.cols);
      if (r.bpm) setDoc((d) => ({ ...d, bpm: r.bpm! }));
      setSel(null);
    }
    const bad = r.lines.filter((l) => !l.ok).length;
    note(bad ? `${r.lines.length - bad} of ${r.lines.length} phrases added — check the ones marked ✗` : `Added ${r.added} column${r.added === 1 ? "" : "s"}`);
  };

  /* ------------------------------------------------------------ text */
  const ascii = useMemo(() => renderAscii(doc, { header: false, width: 64 }), [doc]);
  const [draftText, setDraftText] = useState<string | null>(null);
  const applyText = () => {
    if (draftText === null) return;
    const r = importText(draftText, doc.tuning);
    if (!r.cols.length) return note("I couldn't find any tab lines in that text.");
    commit(() => r.cols);
    setDraftText(null);
    note(`Read ${r.systems} system${r.systems === 1 ? "" : "s"}, ${r.cols.filter((c) => c.kind === "notes").length} columns${r.strings !== n ? ` (it has ${r.strings} lines; this tuning has ${n} strings)` : ""}`);
  };

  /* ------------------------------------------------------------ file actions */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(renderAscii(doc));
      note("Tab copied");
    } catch {
      note("Couldn't copy — select the text in Type it instead");
    }
  };
  const download = () => {
    const blob = new Blob([renderAscii(doc)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.title.replace(/[^\w\- ]+/g, "").trim() || "tab"}.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const save = () => {
    setSaved(upsertTab(doc));
    note("Saved on this device");
  };
  const newTab = () => {
    stop();
    setDoc(emptyDoc(doc.tuning.id === "custom" ? "standard" : doc.tuning.id), true);
    setSel(null);
    setLines([]);
  };
  const open = (d: TabDoc) => {
    stop();
    setDoc(d, true);
    setSel(null);
    setShowSaved(false);
  };
  const setTuning = (id: string) => {
    const t = tabTuning(id);
    stop();
    setSel(null);
    setDoc((d) => ({ ...d, tuning: t, cols: refit(d.cols, d.tuning.midis.length, t.midis.length) }));
  };

  const seconds = totalSeconds(doc);
  const groups = INSTRUMENTS.filter((i) => i.id !== "other").map((i) => ({ i, list: TUNINGS.filter((t) => t.instrument === i.id) }));

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 sm:px-4" data-testid="tabs-page">
        {/* title, tuning, tempo, actions */}
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={doc.title} onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value.slice(0, 80) }))} className="h-10 min-w-0 flex-1 font-display text-lg font-bold" aria-label="Tab title" data-testid="tab-title" />
            <Button onClick={play} className="h-10 gap-1.5" data-testid="tab-play">
              {playing !== null ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing !== null ? "Stop" : sel ? "Play from here" : "Play"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={doc.tuning.id} onValueChange={setTuning}>
              <SelectTrigger className="h-9 w-[15.5rem]" aria-label="Tuning" data-testid="tab-tuning">
                <SelectValue placeholder={doc.tuning.name} />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {groups.map(({ i, list }) => (
                  <SelectGroup key={i.id}>
                    <SelectLabel>{i.name}</SelectLabel>
                    {list.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-muted-foreground">· {t.notes.replace(/\d/g, "").replace(/#/g, "♯").replace(/(?<=[A-G])b/g, "♭")}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Tempo
              <Input
                type="number"
                inputMode="numeric"
                min={30}
                max={300}
                value={doc.bpm}
                onChange={(e) => setDoc((d) => ({ ...d, bpm: Math.max(30, Math.min(300, Number(e.target.value) || 100)) }))}
                className="h-9 w-[4.5rem]"
                aria-label="Tempo in beats per minute"
              />
              bpm
            </label>
            <span className="text-xs text-muted-foreground">
              {doc.cols.filter((c) => c.kind === "notes").length} columns · {seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}` : `${seconds.toFixed(1)} s`}
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              <IconBtn onClick={undo} disabled={!past.length} label="Undo"><Undo2 className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={redo} disabled={!future.length} label="Redo"><Redo2 className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={save} label="Save" testId="tab-save"><Save className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={() => setShowSaved((v) => !v)} label={`Saved tabs (${saved.length})`} on={showSaved} testId="tab-open"><FolderOpen className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={() => void copy()} label="Copy as text"><ClipboardCopy className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={download} label="Download .txt"><Download className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={newTab} label="New tab"><FilePlus2 className="h-4 w-4" /></IconBtn>
            </div>
          </div>
          {showSaved ? (
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-2" data-testid="tab-saved">
              {saved.length ? (
                saved.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(d)}>
                      <span className="block truncate text-sm font-semibold">{d.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {d.tuning.name} · {d.cols.filter((c) => c.kind === "notes").length} columns · {new Date(d.updated).toLocaleDateString()}
                      </span>
                    </button>
                    <IconBtn onClick={() => setSaved(deleteTab(d.id))} label={`Delete ${d.title}`}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                ))
              ) : (
                <p className="p-2 text-xs text-muted-foreground">No saved tabs yet. Tap Save to keep this one.</p>
              )}
            </div>
          ) : null}
          {flash ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary" aria-live="polite">
              <Check className="h-3.5 w-3.5" /> {flash}
            </p>
          ) : null}
        </section>

        {/* ways in */}
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/60 p-1" role="tablist" aria-label="How to write">
            <ModeBtn on={mode === "describe"} onClick={() => setMode("describe")} icon={<MessageSquareText className="h-4 w-4" />} testId="tab-mode-describe">Describe</ModeBtn>
            <ModeBtn on={mode === "text"} onClick={() => setMode("text")} icon={<Type className="h-4 w-4" />} testId="tab-mode-text">Type tab</ModeBtn>
            <ModeBtn on={mode === "audio"} onClick={() => setMode("audio")} icon={<AudioLines className="h-4 w-4" />} testId="tab-mode-audio">Audio</ModeBtn>
          </div>

          {mode === "describe" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Say what you play, in your own words — strings, frets, chords, techniques, rhythm. It's read right here on your device and added to the end of the tab.
              </p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="e.g. Low E open three times palm muted, then 3rd fret on the A string, hammer on to the 5th, then strum a G chord twice"
                className="text-[15px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runDescribe(false);
                }}
                data-testid="tab-describe"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => runDescribe(false)} disabled={!text.trim()} className="gap-1.5" data-testid="tab-describe-add">
                  <Wand2 className="h-4 w-4" /> Add to tab
                </Button>
                <Button variant="outline" onClick={() => runDescribe(true)} disabled={!text.trim()}>
                  Replace tab
                </Button>
                {text ? (
                  <Button variant="ghost" size="sm" onClick={() => setText("")}>
                    <X className="h-4 w-4" /> Clear
                  </Button>
                ) : null}
              </div>
              {lines.length ? (
                <ul className="space-y-1 rounded-lg border border-border bg-background/50 p-2 text-[13px]" data-testid="tab-understood" aria-label="What I understood">
                  {lines.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold", l.ok ? "bg-extension/80 text-background" : "bg-third/80 text-background")}>{l.ok ? "✓" : "✗"}</span>
                      <span className="min-w-0">
                        <span className="text-muted-foreground">“{l.text}”</span> <span className="text-muted-foreground">→</span> <b className={cn("font-semibold", l.ok ? "text-foreground" : "text-third")}>{l.said}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <details className="group rounded-lg border border-border/70 bg-background/40 p-2 text-xs">
                <summary className="cursor-pointer font-semibold text-muted-foreground">Examples and words it understands</summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DESCRIBE_EXAMPLES.map((ex) => (
                    <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-left text-[12px] hover:border-primary">
                      {ex}
                    </button>
                  ))}
                </div>
                <ul className="mt-2 grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-2">
                  <li><b className="text-foreground">Strings:</b> low E, A string, high e, 3rd string, string 2, thickest</li>
                  <li><b className="text-foreground">Frets:</b> 5th fret, fret 5, open, "5 7 8", tab shorthand 5h7p5</li>
                  <li><b className="text-foreground">Techniques:</b> hammer on, pull off, slide up/down, bend (quarter / half / whole / 1½ / 2 steps), release, vibrato, harmonic, ghost note, tap, dead note</li>
                  <li><b className="text-foreground">Soloing:</b> pre-bend, unison bend, trill 5 and 7, tremolo pick, pinch / tapped harmonic, slide into 9, slide off, hammer on from nowhere, wide vibrato, whammy dip / dive / flutter / scoop / bar vibrato, rake, volume swell, sweep pick, legato, alternate picking, downstrokes, double stops ("… together"), accented, staccato</li>
                  <li><b className="text-foreground">Feel:</b> palm muted, let ring, strum down / up</li>
                  <li><b className="text-foreground">Chords:</b> G, Am7, E minor, F#m at the 9th fret, G/B, power chord on the A at fret 5, arpeggiate Am</li>
                  <li><b className="text-foreground">Scales:</b> A minor pentatonic at the 5th fret, E blues, G major scale up and down</li>
                  <li><b className="text-foreground">Note names:</b> the notes C D E on the B string</li>
                  <li><b className="text-foreground">Structure:</b> twice, 4 times, repeat that, repeat the last bar, new bar, rest for a beat</li>
                  <li><b className="text-foreground">Rhythm:</b> quarter notes, eighth notes, sixteenths, triplets, slowly, at 90 bpm</li>
                  <li><b className="text-foreground">Changes:</b> "bend it a whole step", "add vibrato", "palm mute that" change the last notes</li>
                </ul>
              </details>
            </div>
          ) : mode === "text" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Type or paste tab text — from a website, a message, anywhere. Thinnest string on top. Shorthand: 5h7 5p3 5/7 7\5 7b9 7b9r7 &lt;12&gt; (5) x t12 5~ and | for bars. Chord names on the line above are kept.
              </p>
              <Textarea
                value={draftText ?? ascii}
                onChange={(e) => setDraftText(e.target.value)}
                rows={Math.min(22, Math.max(8, (draftText ?? ascii).split("\n").length + 1))}
                spellCheck={false}
                className="whitespace-pre font-mono text-[13px] leading-snug"
                style={{ overflowWrap: "normal" }}
                data-testid="tab-text"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={applyText} disabled={draftText === null} data-testid="tab-text-apply">
                  Use this text
                </Button>
                {draftText !== null ? (
                  <Button variant="ghost" onClick={() => setDraftText(null)}>
                    Undo text changes
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 rounded-lg border border-dashed border-border p-3 text-sm" data-testid="tab-audio-soon">
              <Mic className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold">Tab from a recording — coming next</p>
                <p className="text-xs text-muted-foreground">
                  Play into the mic (or open a recording) and Fretlab will listen for each note and write the tab for you, using the same note-placing brain the Describe box uses to pick strings and frets. Until then, describe it or tap it in.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* the tab */}
        <section className="panel space-y-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">The tab</h2>
            <span className="text-xs text-muted-foreground">
              {doc.tuning.name} · {doc.tuning.names.join(" ")}
            </span>
          </div>
          {doc.cols.length ? null : (
            <div className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">
              Empty so far. Describe something above, or tap <b className="text-foreground">+</b> at the end of the strings to start writing by hand.
            </div>
          )}
          <TabGrid cols={doc.cols} tuning={doc.tuning} sel={sel} onSel={setSel} ops={ops} playing={playing} />
          {doc.cols.length ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  commit(() => []);
                  setSel(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear the tab
              </Button>
            </div>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}

function IconBtn({ children, onClick, label, disabled, on, testId }: { children: ReactNode; onClick: () => void; label: string; disabled?: boolean; on?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={on}
      data-testid={testId}
      className={cn("grid h-9 w-9 place-items-center rounded-md border transition-colors disabled:opacity-35", on ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/60")}
    >
      {children}
    </button>
  );
}

function ModeBtn({ children, on, onClick, icon, testId }: { children: ReactNode; on: boolean; onClick: () => void; icon: ReactNode; testId: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      data-testid={testId}
      className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {icon}
      {children}
    </button>
  );
}
