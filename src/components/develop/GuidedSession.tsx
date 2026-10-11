import { useEffect, useState } from "react";
import { Check, ChevronDown, CircleAlert, Download, Mic, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MIC_HELP } from "@/components/listen/micHelp";
import { ROUNDS, SETUP_TIPS, type PlanStep } from "@/lib/listen/collectPlan";
import { deviceLabel, encodeWav, newTakeId, safeAnalyse, toPcm, trimSilence, type Take, type TakeStrum } from "@/lib/listen/takes";
import { pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";
import { ChordBox } from "./ChordBox";
import type { Player } from "./usePlayer";
import { MAX_SECONDS, QUIET_SECONDS, type useRecorder } from "./useRecorder";
import { Waveform } from "./Waveform";

const SETUP_KEY = "fretlab.dev.setupok.v1";

const KIND: Record<PlanStep["label"], { name: string; cls: string }> = {
  clean: { name: "Play it clean", cls: "bg-extension/20 text-foreground ring-1 ring-extension/50" },
  "wrong-note": { name: "Wrong note — on purpose", cls: "bg-destructive/20 text-foreground ring-1 ring-destructive/50" },
  muted: { name: "Muted string — on purpose", cls: "bg-root/20 text-foreground ring-1 ring-root/50" },
  buzz: { name: "Buzz — on purpose", cls: "bg-accent/20 text-foreground ring-1 ring-accent/50" },
  other: { name: "Other", cls: "bg-secondary" },
};

/** What happened to the latest recording: saving, saved (read back and checked), or not. */
type SaveState = { stepId: string; saved?: boolean; error?: string; problem?: string };

/**
 * Guided recording: walks through the plan one step at a time — what to play and how — records
 * until "Done", trims only silence, saves (and reads the save back), then asks the player to
 * listen and confirm they played exactly what was asked. That confirmation, not Fretlab's own
 * strum count, is what the data records as the truth.
 */
export function GuidedSession({ rec, player, takes, measured, onSave, onConfirm, onExport }: {
  rec: ReturnType<typeof useRecorder>;
  player: Player;
  takes: Take[];
  measured: Map<string, TakeStrum[]>;
  /** Resolves true once the take is stored on this device (and read back identical). */
  onSave: (take: Take, strums: TakeStrum[]) => Promise<boolean>;
  /** The player confirmed the take: store the true strum count. Resolves true once stored. */
  onConfirm: (take: Take, strums: number) => Promise<boolean>;
  onExport: () => void;
}) {
  const [ready, setReady] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const [roundPick, setRoundPick] = useState<number | null>(null);
  const [save, setSave] = useState<SaveState | null>(null);
  const [listOpen, setListOpen] = useState(false);
  /** The last recording exactly as captured (nothing trimmed), so it can always be sent to Vix. */
  const [lastRaw, setLastRaw] = useState<{ stepId: string; wav: Uint8Array; name: string } | null>(null);
  useEffect(() => {
    try {
      setReady(window.localStorage.getItem(SETUP_KEY) === "1");
    } catch {
      setReady(false);
    }
  }, []);

  // Only takes recorded on this device count here (imported ones are someone else's).
  const takeFor = (id: string) => takes.find((t) => t.step === id && !t.imported);
  const confirmed = (id: string) => takeFor(id)?.confirmedStrums !== undefined;
  // Rounds: open on the first one that isn't finished (or the one picked).
  const roundDone = (i: number) => ROUNDS[i]!.steps.every((s) => confirmed(s.id));
  const firstOpenRound = ROUNDS.findIndex((_, i) => !roundDone(i));
  const roundIdx = roundPick ?? (firstOpenRound < 0 ? ROUNDS.length - 1 : firstOpenRound);
  const ROUND = ROUNDS[roundIdx]!;
  const PLAN = ROUND.steps;
  const nextRound = ROUNDS.findIndex((_, i) => i !== roundIdx && !roundDone(i));
  const goRound = (i: number) => {
    setRoundPick(i);
    setPick(null);
    setSave(null);
    setListOpen(false);
  };
  const done = PLAN.filter((s) => confirmed(s.id)).length;
  const toCheck = PLAN.filter((s) => takeFor(s.id) && !confirmed(s.id)).length;
  // Next: the first step not yet recorded AND confirmed (old recordings get checked too).
  const firstOpen = PLAN.findIndex((s) => !confirmed(s.id));
  const idx = pick ?? (firstOpen < 0 ? null : firstOpen);
  const step = idx === null ? null : PLAN[idx]!;
  const take = step ? takeFor(step.id) : undefined;
  const recording = rec.state !== "idle";
  const playingRec = rec.state === "recording";

  const begin = (s: PlanStep) => {
    setSave(null);
    player.stop();
    rec.start((r) => {
      if (!r) return setSave({ stepId: s.id, error: "That was too short to keep — tap Start and try again." });
      const sr = r.sampleRate;
      setLastRaw({ stepId: s.id, wav: encodeWav(toPcm(r.audio), sr), name: `fretlab-raw-${s.id}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.wav` });
      // Trimming cuts only silence (by volume) — every sound stays.
      let audio: Float32Array = r.audio, roomHf: number | undefined, problem: string | undefined;
      try {
        const t = trimSilence(r.audio, sr);
        if (t) {
          audio = t.audio;
          roomHf = t.roomHf;
        } else problem = "Only silence was recorded — saved anyway; redo it if you did play.";
      } catch (e) {
        problem = `Couldn't trim the silence (${e instanceof Error ? e.message : e}) — saved untrimmed.`;
      }
      const t: Take = {
        id: newTakeId(),
        at: Date.now(),
        target: s.target,
        label: s.label,
        note: s.title,
        sampleRate: sr,
        pcm: toPcm(audio),
        ...(roomHf !== undefined ? { roomHf } : {}),
        originalSeconds: +(r.audio.length / sr).toFixed(2),
        source: "mic",
        device: deviceLabel(),
        step: s.id,
        tab: s.tab,
        expected: s.strums,
      };
      const a = safeAnalyse(t);
      if (a.error) problem = `The analysis failed (${a.error}) — the recording is saved; please download it and send it to Vix.`;
      setSave({ stepId: s.id, ...(problem ? { problem } : {}) });
      setPick(PLAN.findIndex((p) => p.id === s.id)); // stay on this step until it's checked
      void onSave(t, a.strums).then((saved) => setSave((cur) => (cur && cur.stepId === s.id ? { ...cur, saved } : cur)));
    }, { step: s.id });
  };

  const confirm = (s: PlanStep, t: Take) => {
    player.stop();
    void onConfirm(t, s.strums).then((ok) => {
      if (ok) {
        setSave(null);
        setPick(null); // on to the next step not yet recorded and checked
      } else setSave({ stepId: s.id, saved: false });
    });
  };

  const downloadRaw = () => {
    if (!lastRaw) return;
    const url = URL.createObjectURL(new Blob([lastRaw.wav as BlobPart], { type: "audio/wav" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = lastRaw.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const marks = take ? (measured.get(take.id) ?? []).map((m) => m.time) : [];
  const found = take ? measured.get(take.id)?.length : undefined;
  const saveFor = step && save?.stepId === step.id ? save : null;

  return (
    <section className="panel space-y-4 p-3 sm:p-4" aria-label="Guided recording">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-black">Guided recording</h2>
          <span className="text-sm text-muted-foreground" data-testid="guided-progress">
            {ROUND.title}: {done} of {PLAN.length} steps recorded and checked{toCheck ? ` · ${toCheck} to check` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Recording rounds">
          {ROUNDS.map((rd, i) => {
            const n = rd.steps.filter((st) => confirmed(st.id)).length;
            return (
              <button key={rd.round} type="button" role="tab" aria-selected={i === roundIdx} disabled={recording} onClick={() => goRound(i)} data-testid="guided-round"
                className={cn("rounded-md px-2.5 py-1 text-xs font-semibold ring-1 transition-colors", i === roundIdx ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-muted-foreground ring-border hover:text-foreground")}>
                {rd.title} · {n === rd.steps.length ? "done ✓" : `${n}/${rd.steps.length}`}
              </button>
            );
          })}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(100 * done) / PLAN.length}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          Fretlab tells you what to play and how. Record each step, tap <b className="text-foreground">Done</b>, then <b className="text-foreground">listen back and confirm</b> you played exactly what was asked. At the end, send the recordings to Vix.
        </p>
      </div>

      {!ready ? (
        <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-3" data-testid="guided-setup">
          <p className="font-semibold">Before you start</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {SETUP_TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <Button onClick={() => { try { window.localStorage.setItem(SETUP_KEY, "1"); } catch { /* fine */ } setReady(true); }}>I'm set up — show step 1</Button>
        </div>
      ) : null}

      {ready && step ? (
        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3" data-testid="guided-step" data-step={step.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Step {idx! + 1} of {PLAN.length}</span>
            <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", KIND[step.label].cls)}>{KIND[step.label].name}</span>
            {take?.confirmedStrums !== undefined ? <span className="text-xs text-extension">✓ recorded and checked</span> : null}
          </div>
          <div className="flex gap-3">
            <ChordBox tab={step.tab} wrong={step.wrong} muted={step.muted} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-display text-xl font-black leading-tight">{step.title}</p>
              <p className="font-mono text-xs text-muted-foreground" title="Low E string first">Tab {[...step.tab].join(" ")} · {pretty(step.target.label)}</p>
              <p className="text-sm leading-snug">{step.how}</p>
              <p className="text-sm font-semibold">Strum {step.strums} times.</p>
              {step.wrong?.length ? <p className="text-xs text-muted-foreground"><span className="font-semibold text-destructive-foreground">Red dot</span> = the wrong note.</p> : null}
              {step.muted?.length ? <p className="text-xs text-muted-foreground"><span className="font-bold text-root">~</span> = touch this string so it's muted.</p> : null}
            </div>
          </div>

          {recording ? (
            <div className="space-y-2" aria-live="polite">
              <p className={cn("text-base font-bold", playingRec ? "text-primary" : "")} data-testid="guided-status">
                {rec.state === "starting" ? "Starting the microphone…" : rec.state === "quiet" ? `Stay quiet… ${Math.max(0, QUIET_SECONDS - rec.seconds).toFixed(1)} s` : `Play now — strums heard: ${rec.heard} of ${step.strums}`}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full transition-[width] duration-100", playingRec ? "bg-primary" : "bg-muted-foreground")} style={{ width: `${Math.max(0, Math.min(100, ((rec.level + 70) / 70) * 100))}%` }} />
              </div>
              <Button size="lg" variant="destructive" className="h-14 w-full gap-2 text-base" onClick={rec.stop} disabled={!playingRec} data-testid="guided-done">
                <Square className="h-4 w-4 fill-current" /> Done — I played it
              </Button>
              <p className="text-xs text-muted-foreground">Tap Done after the last strum has rung out. Stops by itself after {MAX_SECONDS} s.</p>
            </div>
          ) : take ? (
            // ---------------- listen back and check
            <div className="space-y-2.5" data-testid="guided-check">
              {saveFor ? (
                <p role="status" data-testid="guided-result" data-saved={String(saveFor.saved)} className={cn("flex items-start gap-1.5 text-sm", saveFor.saved === false || saveFor.error ? "text-destructive-foreground" : "")}>
                  {saveFor.saved === false ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>
                    {saveFor.error
                      ? saveFor.error
                      : saveFor.saved === false
                        ? "Couldn't be saved on this phone (storage full or blocked) — tap Download recording and send the file to Vix."
                        : saveFor.saved
                          ? "Saved on this phone (read back and checked)."
                          : "Saving…"}
                    {saveFor.problem ? <span className="block text-xs">{saveFor.problem}</span> : null}
                  </span>
                </p>
              ) : null}
              <Waveform take={take} marks={marks} position={() => player.position(take.id)} onSeek={(sec) => player.play(take, sec)} />
              <div className="flex flex-wrap items-center gap-2">
                {player.playingId === take.id ? (
                  <Button size="sm" variant="secondary" className="h-9 gap-1.5" onClick={player.stop} data-testid="guided-stop"><Square className="h-3.5 w-3.5 fill-current" /> Stop</Button>
                ) : (
                  <Button size="sm" variant="secondary" className="h-9 gap-1.5" onClick={() => player.play(take)} data-testid="guided-play"><Play className="h-3.5 w-3.5" /> Play it back</Button>
                )}
                <span className="text-xs text-muted-foreground" data-testid="guided-found">
                  Fretlab counted {found ?? "…"} strum{found === 1 ? "" : "s"} (the numbered marks){found !== undefined && found !== step.strums ? ` — you were asked for ${step.strums}` : ""}.
                </span>
              </div>
              {take.confirmedStrums !== undefined ? (
                <p className="text-sm">You confirmed you played exactly {take.confirmedStrums} strums, as asked. <button type="button" className="text-primary hover:underline" onClick={() => begin(step)} disabled={recording}>Record it again</button></p>
              ) : (
                <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-2.5">
                  <p className="text-sm font-semibold">Listen back. Did you play exactly {step.strums} strums, the way this step asks?</p>
                  {found !== undefined && found !== step.strums ? (
                    <p className="text-xs text-muted-foreground">Fretlab counted {found}. If you really played {step.strums}, say yes — Fretlab's mistake gets recorded so it can be fixed. If you didn't, redo it.</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button className="h-11 flex-1 gap-1.5" onClick={() => confirm(step, take)} disabled={saveFor?.saved === false} data-testid="guided-confirm">
                      <Check className="h-4 w-4" /> Yes — exactly {step.strums}
                    </Button>
                    <Button variant="secondary" className="h-11 flex-1 gap-1.5" onClick={() => begin(step)} data-testid="guided-redo">
                      <RotateCcw className="h-4 w-4" /> No — redo it
                    </Button>
                  </div>
                </div>
              )}
              {lastRaw && lastRaw.stepId === step.id ? (
                <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={downloadRaw} data-testid="guided-download-raw">
                  <Download className="h-3.5 w-3.5" /> Download recording (as captured)
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {saveFor?.error ? <p role="status" data-testid="guided-result" className="text-sm text-destructive-foreground">{saveFor.error}</p> : null}
              <Button size="lg" className="h-14 w-full gap-2 text-base" onClick={() => begin(step)} data-testid="guided-start">
                <Mic className="h-5 w-5" /> Start step {idx! + 1}
              </Button>
            </>
          )}
          {rec.error ? <p className="text-sm text-destructive-foreground" role="alert">{MIC_HELP[rec.error]}</p> : null}
        </div>
      ) : null}

      {ready && !step ? (
        <div className="space-y-2 rounded-lg border border-extension/50 bg-extension/10 p-3" data-testid="guided-finished">
          <p className="font-display text-lg font-black">{ROUND.title}: all {PLAN.length} steps recorded and checked — thank you!</p>
          <p className="text-sm">Tap <b>Export & send</b>, then send the .zip file to Vix (text, email, AirDrop or Google Drive). On the PC he opens Develop → <b>Import takes</b>.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-12 gap-2" onClick={onExport}><Download className="h-4 w-4" /> Export & send</Button>
            {nextRound >= 0 ? (
              <Button size="lg" variant="secondary" className="h-12 gap-2" onClick={() => goRound(nextRound)} data-testid="guided-next-round">
                <Mic className="h-4 w-4" /> Start {ROUNDS[nextRound]!.title}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {ready ? (
        <div>
          <button type="button" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen} className="flex w-full items-center gap-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-4 w-4 transition-transform", listOpen && "rotate-180")} /> All steps
          </button>
          {listOpen ? (
            <ol className="mt-2 space-y-1" data-testid="guided-list">
              {PLAN.map((s, i) => {
                const t = takeFor(s.id);
                const n = t ? measured.get(t.id)?.length : undefined;
                const ok = t?.confirmedStrums !== undefined;
                return (
                  <li key={s.id} className={cn("flex items-center gap-1 rounded-md", i === idx && "bg-secondary/60")}>
                    <button type="button" disabled={recording} onClick={() => { setPick(i); setSave(null); setListOpen(false); }}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary/60">
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", ok ? "bg-extension/80 text-background" : t ? "bg-root text-root-foreground" : "bg-secondary text-muted-foreground")} title={ok ? "Recorded and checked" : t ? "Recorded — needs checking" : "Not recorded yet"}>
                        {ok ? "✓" : t ? "?" : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{t ? (ok ? `${t.confirmedStrums} strums ✓` : `check (${n ?? "…"} heard)`) : KIND[s.label].name.replace(" — on purpose", "")}</span>
                    </button>
                    {t ? (
                      player.playingId === t.id ? (
                        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={player.stop} aria-label={`Stop ${s.title}`}><Square className="h-3.5 w-3.5 fill-current" /></Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={() => player.play(t)} aria-label={`Play ${s.title}`} data-testid="guided-list-play"><Play className="h-3.5 w-3.5" /></Button>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
