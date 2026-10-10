import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileAudio, Mic, Square, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChordPicker } from "@/components/listen/ChordPicker";
import { MIC_HELP } from "@/components/listen/micHelp";
import { Scorecard } from "@/components/develop/Scorecard";
import { TakeCard } from "@/components/develop/TakeCard";
import { ThresholdPanel } from "@/components/develop/ThresholdPanel";
import { MAX_SECONDS, QUIET_SECONDS, useRecorder } from "@/components/develop/useRecorder";
import { setDevMode } from "@/lib/devMode";
import { engine } from "@/lib/engine";
import type { TargetChord, Thresholds } from "@/lib/listen/score";
import {
  TAKE_LABELS,
  analyseTake,
  clearTakes,
  deleteTake,
  deviceLabel,
  exportTakes,
  judgeTake,
  listTakes,
  newTakeId,
  saveTake,
  scorecard,
  toFloat,
  toPcm,
  type Take,
  type TakeLabel,
  type TakeStrum,
} from "@/lib/listen/takes";
import { loadTuning, saveTuning } from "@/lib/listen/tuning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/develop")({
  head: () => ({ meta: [{ title: "Develop — Fretlab" }] }),
  component: DevelopPage,
});

const MAX_FILE_SECONDS = 60;
const isNativeApp = () => !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

function DevelopPage() {
  const [mounted, setMounted] = useState(false);
  const [takes, setTakes] = useState<Take[]>([]);
  const [measured, setMeasured] = useState<Map<string, TakeStrum[]>>(new Map());
  const [T, setT] = useState<Thresholds | null>(null);
  const [useInListen, setUseInListen] = useState(false);
  const [target, setTarget] = useState<TargetChord>({ rootName: "G", degrees: ["1", "3", "5"], label: "G" });
  const [label, setLabel] = useState<TakeLabel>("clean");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const rec = useRecorder();
  const fileInput = useRef<HTMLInputElement>(null);
  const player = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setDevMode(true); // opening /develop shows the tab from now on
    const t = loadTuning();
    setT(t.values);
    setUseInListen(t.useInListen);
    void listTakes().then(setTakes);
    setMounted(true);
  }, []);

  // Measure each take once (thresholds don't change measurements), one at a time.
  useEffect(() => {
    const todo = takes.find((t) => !measured.has(t.id));
    if (!todo) return;
    const id = window.setTimeout(() => setMeasured((m) => new Map(m).set(todo.id, analyseTake(todo))), 30);
    return () => window.clearTimeout(id);
  }, [takes, measured]);

  const reports = useMemo(() => {
    const out = new Map<string, ReturnType<typeof judgeTake>>();
    if (!T) return out;
    for (const t of takes) {
      const s = measured.get(t.id);
      if (s) out.set(t.id, judgeTake(s, t.target, T));
    }
    return out;
  }, [takes, measured, T]);
  const card = useMemo(() => scorecard(takes.filter((t) => reports.has(t.id)).map((t) => ({ label: t.label, reports: reports.get(t.id)! }))), [takes, reports]);

  if (!mounted || !T)
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
          <section className="panel p-6 text-sm text-muted-foreground" aria-busy="true">Loading Develop…</section>
        </main>
      </AppShell>
    );

  const changeT = (t: Thresholds) => {
    setT(t);
    saveTuning(t, useInListen);
  };
  const changeUse = (on: boolean) => {
    setUseInListen(on);
    saveTuning(T, on);
  };

  const add = async (t: Take) => {
    const ok = await saveTake(t);
    setTakes((ts) => [t, ...ts]);
    if (!ok) setMsg("Couldn't save the take on this device (storage blocked or full) — it's here until you leave the page.");
  };

  const record = () => {
    setMsg(null);
    rec.start((r) => {
      if (!r) return setMsg("That take was too short to keep.");
      void add({ id: newTakeId(), at: Date.now(), target, label, note: note.trim(), sampleRate: r.sampleRate, pcm: toPcm(r.audio), source: "mic", device: deviceLabel() });
    });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMsg(null);
    engine.unlock();
    const ctx = await engine.audioContext();
    if (!ctx) return setMsg("This browser can't decode audio files.");
    for (const f of [...files]) {
      try {
        const buf = await ctx.decodeAudioData(await f.arrayBuffer());
        const n = Math.min(buf.length, Math.round(MAX_FILE_SECONDS * buf.sampleRate));
        const mono = new Float32Array(n);
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const ch = buf.getChannelData(c);
          for (let i = 0; i < n; i++) mono[i]! += ch[i]! / buf.numberOfChannels;
        }
        await add({ id: newTakeId(), at: Date.now(), target, label, note: note.trim(), sampleRate: buf.sampleRate, pcm: toPcm(mono), source: "file", device: deviceLabel(), fileName: f.name });
      } catch {
        setMsg(`Couldn't read "${f.name}" — try WAV, M4A or MP3.`);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const play = async (t: Take, from = 0) => {
    engine.unlock();
    const ctx = await engine.audioContext();
    if (!ctx) return;
    try {
      player.current?.stop();
    } catch {
      /* already stopped */
    }
    const f = toFloat(t.pcm);
    const b = ctx.createBuffer(1, f.length, t.sampleRate);
    b.getChannelData(0).set(f);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    if (from > 0) src.start(0, from, 2.5);
    else src.start();
    player.current = src;
  };

  const relabel = (t: Take, l: TakeLabel) => {
    const next = { ...t, label: l };
    setTakes((ts) => ts.map((x) => (x.id === t.id ? next : x)));
    void saveTake(next);
  };
  const remove = (t: Take) => {
    setTakes((ts) => ts.filter((x) => x.id !== t.id));
    void deleteTake(t.id);
  };

  const exportAll = async () => {
    const zip = exportTakes([...takes].reverse(), measured, T);
    const name = `fretlab-takes-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.zip`;
    const file = new File([zip as BlobPart], name, { type: "application/zip" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) return void (await nav.share({ files: [file], title: "Fretlab takes" }));
    } catch {
      /* share cancelled: fall back to a download */
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const recording = rec.state !== "idle";
  const totalMb = takes.reduce((a, t) => a + t.pcm.length * 2, 0) / 1048576;
  const hint = TAKE_LABELS.find((l) => l.id === label)!.hint;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
        <section className="panel space-y-2 p-3 sm:p-4" aria-label="About Develop">
          <h2 className="font-display text-lg font-black">Tune Listen mode</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li><b className="text-foreground">Record takes</b>: pick the chord, say what you'll really play (clean, a wrong note, a muted string, buzz), stay quiet for a second, then strum it 3–5 times, letting each ring.</li>
            <li><b className="text-foreground">Check the scorecard</b>: clean takes should come out clean; mistakes should get caught. Tap any strum to see the numbers behind its verdict.</li>
            <li><b className="text-foreground">Move the thresholds</b> until it agrees with you, then <b className="text-foreground">export the takes</b> and send them over so the defaults can be fixed for everyone.</li>
          </ol>
        </section>

        <section className="panel space-y-4 p-3 sm:p-4" aria-label="Record a take">
          <ChordPicker target={target} onPick={setTarget} disabled={recording} testId="develop-target" />
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">What will you play?</p>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="What will you play">
              {TAKE_LABELS.map((l) => (
                <Button key={l.id} size="sm" role="radio" aria-checked={label === l.id} variant={label === l.id ? "default" : "secondary"} className="h-8" disabled={recording} onClick={() => setLabel(l.id)}>
                  {l.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={recording} placeholder="Note (optional) — e.g. muted the B string" className="h-9 text-base sm:text-sm" aria-label="Note about this take" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {recording ? (
              <Button size="lg" variant="destructive" className="h-12 gap-2 px-6" onClick={rec.stop} data-testid="rec-stop"><Square className="h-4 w-4 fill-current" /> Stop & save</Button>
            ) : (
              <Button size="lg" className="h-12 gap-2 px-6" onClick={record} data-testid="rec-start"><Mic className="h-5 w-5" /> Record a take</Button>
            )}
            <div className="min-w-40 flex-1 space-y-1" aria-live="polite">
              <p className="text-sm font-medium" data-testid="rec-status">
                {rec.state === "starting" ? "Starting the microphone…" : rec.state === "quiet" ? `Stay quiet… ${Math.max(0, QUIET_SECONDS - rec.seconds).toFixed(1)} s` : rec.state === "recording" ? `Strum now — ${rec.seconds.toFixed(0)} s (stops at ${MAX_SECONDS} s)` : `Ready: ${TAKE_LABELS.find((l) => l.id === label)!.name.toLowerCase()} ${target.label}`}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full transition-[width] duration-100", rec.state === "quiet" ? "bg-muted-foreground" : "bg-primary")} style={{ width: `${Math.max(0, Math.min(100, ((rec.level + 70) / 70) * 100))}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5" disabled={recording} onClick={() => fileInput.current?.click()}><FileAudio className="h-3.5 w-3.5" /> Add recordings</Button>
            <span>…made with another app (Voice Memos, a recorder). They get the chord and label above.</span>
            <input ref={fileInput} type="file" accept="audio/*,.wav,.m4a,.mp3,.aac,.ogg,.flac" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
          </div>
          {rec.error ? <p className="text-sm text-destructive-foreground" role="alert">{MIC_HELP[rec.error]}</p> : null}
          {msg ? <p className="text-sm text-muted-foreground" role="status">{msg}</p> : null}
        </section>

        <Scorecard lines={card} />

        <section className="panel space-y-3 p-3 sm:p-4" aria-label="Takes">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Takes</h2>
            <span className="text-xs text-muted-foreground">{takes.length} on this device · {totalMb.toFixed(1)} MB</span>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="secondary" className="h-8 gap-1.5" disabled={!takes.length} onClick={() => void exportAll()} data-testid="export"><Download className="h-3.5 w-3.5" /> Export all (.zip)</Button>
              {confirmClear ? (
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => { void clearTakes(); setTakes([]); setMeasured(new Map()); setConfirmClear(false); }}>Delete all?</Button>
              ) : (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" disabled={!takes.length} onClick={() => setConfirmClear(true)} onBlur={() => setConfirmClear(false)} aria-label="Delete all takes"><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
          {typeof window !== "undefined" && isNativeApp() ? <p className="text-xs text-muted-foreground">Exporting works best from the browser version of Fretlab.</p> : null}
          {takes.length ? (
            <div className="space-y-2">
              {takes.map((t) => (
                <TakeCard key={t.id} take={t} strums={measured.get(t.id)} reports={reports.get(t.id)} T={T} onPlay={(from) => void play(t, from)} onDelete={() => remove(t)} onRelabel={(l) => relabel(t, l)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No takes yet. A good set to start: 3 clean takes of different chords, then one each of a wrong note, a muted string and buzz.</p>
          )}
        </section>

        <ThresholdPanel values={T} onChange={changeT} useInListen={useInListen} onUseInListen={changeUse} />

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Develop is hidden from testers. Tap the Fretlab logo 5 times to show or hide it ·{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => setDevMode(false)}>Hide it now</button>
        </p>
      </main>
    </AppShell>
  );
}
