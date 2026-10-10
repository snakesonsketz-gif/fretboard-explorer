import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, FileAudio, FolderInput, Mic, Square, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChordPicker } from "@/components/listen/ChordPicker";
import { MIC_HELP } from "@/components/listen/micHelp";
import { GuidedSession } from "@/components/develop/GuidedSession";
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
  encodeWav,
  exportTakes,
  importTakes,
  judgeTake,
  listTakes,
  newTakeId,
  saveTake,
  scorecard,
  strumDetection,
  toFloat,
  toPcm,
  trimSilence,
  type Take,
  type TakeLabel,
  type TakeStrum,
} from "@/lib/listen/takes";
import { changedKeys, loadTuning, sanitize, saveTuning } from "@/lib/listen/tuning";
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
  const [ownOpen, setOwnOpen] = useState(false);
  /** Thresholds that came with an imported zip (offered, never applied without a tap). */
  const [offered, setOffered] = useState<{ values: Thresholds; from: string } | null>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
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

  const add = async (t: Take, strums?: TakeStrum[]) => {
    // A guided step recorded again replaces its earlier take.
    const old = t.step ? takes.filter((x) => x.step === t.step) : [];
    for (const o of old) void deleteTake(o.id);
    if (strums) setMeasured((m) => new Map(m).set(t.id, strums));
    setTakes((ts) => [t, ...ts.filter((x) => !old.includes(x))]);
    const ok = await saveTake(t);
    if (!ok) setMsg("Couldn't save the take on this device (storage blocked or full) — it's here until you leave the page.");
  };

  /** Keep only the sound (each strum until it has rung out); room noise measured first. */
  const trimmed = (audio: Float32Array, sampleRate: number) => {
    const t = trimSilence(audio, sampleRate);
    return t ? { pcm: toPcm(t.audio), sampleRate, ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}), originalSeconds: +(audio.length / sampleRate).toFixed(2) } : null;
  };

  const record = () => {
    setMsg(null);
    rec.start((r) => {
      if (!r) return setMsg("That take was too short to keep.");
      const a = trimmed(r.audio, r.sampleRate);
      if (!a) return setMsg("No strums heard in that take — strum firmly, with the phone close to the guitar.");
      void add({ id: newTakeId(), at: Date.now(), target, label, note: note.trim(), ...a, source: "mic", device: deviceLabel() });
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
        const a = trimmed(mono, buf.sampleRate);
        if (!a) {
          setMsg(`No strums found in "${f.name}".`);
          continue;
        }
        await add({ id: newTakeId(), at: Date.now(), target, label, note: note.trim(), ...a, source: "file", device: deviceLabel(), fileName: f.name });
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

  /** Hand a file to the person: the share sheet on phones (text, email, AirDrop), else a download. */
  const deliver = async (data: Uint8Array, name: string, type: string, share: boolean) => {
    const file = new File([data as BlobPart], name, { type });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      if (share && nav.canShare?.({ files: [file] })) return void (await nav.share({ files: [file], title: "Fretlab takes" }));
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

  const exportAll = async () => {
    const zip = exportTakes([...takes].reverse(), measured, T);
    await deliver(zip, `fretlab-takes-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.zip`, "application/zip", true);
  };

  const downloadWav = (t: Take) => {
    const slug = `${t.step ?? t.label}-${t.target.label}`.replace(/[^a-z0-9#]+/gi, "-");
    void deliver(encodeWav(t.pcm, t.sampleRate), `fretlab-${slug}-${new Date(t.at).toISOString().slice(0, 10)}.wav`, "audio/wav", false);
  };

  /** Load a Fretlab export (.zip) sent from another phone — e.g. Bradley's guided recordings. */
  const importZip = async (files: FileList | null) => {
    const f = files?.[0];
    if (zipInput.current) zipInput.current.value = "";
    if (!f) return;
    setImportMsg(`Reading ${f.name}…`);
    try {
      const r = await importTakes(new Uint8Array(await f.arrayBuffer()), f.name, takes);
      for (const t of r.takes) await saveTake(t);
      setTakes((ts) => [...r.takes, ...ts].sort((a, b) => b.at - a.at));
      const from = r.takes[0]?.device ?? "another device";
      setImportMsg(r.takes.length ? `Imported ${r.takes.length} take${r.takes.length === 1 ? "" : "s"} from ${f.name} (${from})${r.skipped ? ` · ${r.skipped} already here or unreadable` : ""}.` : `Nothing new in ${f.name}${r.skipped ? ` — ${r.skipped} take${r.skipped === 1 ? " is" : "s are"} already here` : ""}.`);
      if (r.thresholds) {
        const t = sanitize(r.thresholds);
        setOffered(changedKeys(t).length ? { values: t, from: f.name } : null);
      }
    } catch (e) {
      setImportMsg(`Couldn't import ${f.name}: ${(e as Error).message}.`);
    }
  };

  const recording = rec.state !== "idle";
  const totalMb = takes.reduce((a, t) => a + t.pcm.length * 2, 0) / 1048576;
  const hint = TAKE_LABELS.find((l) => l.id === label)!.hint;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
        <GuidedSession rec={rec} takes={takes} measured={measured} onSave={(t, st) => void add(t, st)} onExport={() => void exportAll()} />

        <section className="panel space-y-4 p-3 sm:p-4" aria-label="Record your own take">
          <button type="button" onClick={() => setOwnOpen(!ownOpen)} aria-expanded={ownOpen} className="flex w-full items-center gap-2 text-left">
            <ChevronDown className={cn("h-4 w-4 transition-transform", ownOpen && "rotate-180")} />
            <span className="font-display text-sm font-semibold uppercase tracking-widest">Record your own take</span>
            <span className="text-xs text-muted-foreground">— anything not in the guided steps</span>
          </button>
          {ownOpen ? (<>
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
          </>) : null}
          {msg ? <p className="text-sm text-muted-foreground" role="status">{msg}</p> : null}
        </section>

        <Scorecard lines={card} detection={strumDetection(takes, measured)} />

        <section className="panel space-y-3 p-3 sm:p-4" aria-label="Takes">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Takes</h2>
            <span className="text-xs text-muted-foreground">{takes.length} on this device · {totalMb.toFixed(1)} MB</span>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => zipInput.current?.click()} data-testid="import"><FolderInput className="h-3.5 w-3.5" /> Import takes</Button>
              <input ref={zipInput} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" onChange={(e) => void importZip(e.target.files)} data-testid="import-input" />
              <Button size="sm" variant="secondary" className="h-8 gap-1.5" disabled={!takes.length} onClick={() => void exportAll()} data-testid="export"><Download className="h-3.5 w-3.5" /> Export all (.zip)</Button>
              {confirmClear ? (
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => { void clearTakes(); setTakes([]); setMeasured(new Map()); setConfirmClear(false); }}>Delete all?</Button>
              ) : (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" disabled={!takes.length} onClick={() => setConfirmClear(true)} onBlur={() => setConfirmClear(false)} aria-label="Delete all takes"><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Got a .zip from Bradley's phone? Tap <b className="text-foreground">Import takes</b> and pick it — his recordings load here with their labels, ready to play, score and download.</p>
          {importMsg ? <p className="text-sm" role="status" data-testid="import-msg">{importMsg}</p> : null}
          {offered ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-2 text-sm" data-testid="offered-thresholds">
              <span className="min-w-0 flex-1">{offered.from} also has tuned thresholds ({changedKeys(offered.values).length} changed from the defaults).</span>
              <Button size="sm" className="h-8" onClick={() => { changeT(offered.values); setOffered(null); }}>Use them</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setOffered(null)}>No thanks</Button>
            </div>
          ) : null}
          {typeof window !== "undefined" && isNativeApp() ? <p className="text-xs text-muted-foreground">Exporting works best from the browser version of Fretlab.</p> : null}
          {takes.length ? (
            <div className="space-y-2">
              {takes.map((t) => (
                <TakeCard key={t.id} take={t} strums={measured.get(t.id)} reports={reports.get(t.id)} T={T} onPlay={(from) => void play(t, from)} onDelete={() => remove(t)} onRelabel={(l) => relabel(t, l)} onDownload={() => downloadWav(t)} />
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
