import { useEffect, useState } from "react";
import { Check, ChevronDown, CircleAlert, Download, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MIC_HELP } from "@/components/listen/micHelp";
import { PLAN, SETUP_TIPS, type PlanStep } from "@/lib/listen/collectPlan";
import { analyseTake, deviceLabel, newTakeId, toPcm, trimSilence, type Take, type TakeStrum } from "@/lib/listen/takes";
import { pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";
import { ChordBox } from "./ChordBox";
import { MAX_SECONDS, QUIET_SECONDS, type useRecorder } from "./useRecorder";

const SETUP_KEY = "fretlab.dev.setupok.v1";

const KIND: Record<PlanStep["label"], { name: string; cls: string }> = {
  clean: { name: "Play it clean", cls: "bg-extension/20 text-foreground ring-1 ring-extension/50" },
  "wrong-note": { name: "Wrong note — on purpose", cls: "bg-destructive/20 text-foreground ring-1 ring-destructive/50" },
  muted: { name: "Muted string — on purpose", cls: "bg-root/20 text-foreground ring-1 ring-root/50" },
  buzz: { name: "Buzz — on purpose", cls: "bg-accent/20 text-foreground ring-1 ring-accent/50" },
  other: { name: "Other", cls: "bg-secondary" },
};

type Result = { stepId: string; found?: number; expected?: number; error?: string };

/**
 * Guided recording: walks through the plan one step at a time — what to play and how — records
 * until "Done", trims the silence (keeping every strum's full ring-out) and checks that the
 * number of strums heard matches what was asked.
 */
export function GuidedSession({ rec, takes, measured, onSave, onExport }: {
  rec: ReturnType<typeof useRecorder>;
  takes: Take[];
  measured: Map<string, TakeStrum[]>;
  onSave: (take: Take, strums: TakeStrum[]) => void;
  onExport: () => void;
}) {
  const [ready, setReady] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [listOpen, setListOpen] = useState(false);
  useEffect(() => {
    try {
      setReady(window.localStorage.getItem(SETUP_KEY) === "1");
    } catch {
      setReady(false);
    }
  }, []);

  // Only takes recorded on this device count as done here (imported ones are someone else's).
  const takeFor = (id: string) => takes.find((t) => t.step === id && !t.imported);
  const done = PLAN.filter((s) => takeFor(s.id)).length;
  const firstOpen = PLAN.findIndex((s) => !takeFor(s.id));
  const idx = pick ?? (firstOpen < 0 ? null : firstOpen);
  const step = idx === null ? null : PLAN[idx]!;
  const recording = rec.state !== "idle";
  const playing = rec.state === "recording";

  const begin = (s: PlanStep) => {
    setResult(null);
    rec.start((r) => {
      if (!r) return setResult({ stepId: s.id, error: "That was too short to keep — tap Start and try again." });
      const t = trimSilence(r.audio, r.sampleRate);
      if (!t) return setResult({ stepId: s.id, error: "No strums heard. Put the phone closer to the guitar and strum firmly, then try again." });
      const take: Take = {
        id: newTakeId(),
        at: Date.now(),
        target: s.target,
        label: s.label,
        note: s.title,
        sampleRate: r.sampleRate,
        pcm: toPcm(t.audio),
        ...(t.roomFloor !== undefined ? { roomFloor: t.roomFloor } : {}),
        originalSeconds: +(r.audio.length / r.sampleRate).toFixed(2),
        source: "mic",
        device: deviceLabel(),
        step: s.id,
        tab: s.tab,
        expected: s.strums,
      };
      const strums = analyseTake(take);
      onSave(take, strums);
      setResult({ stepId: s.id, found: strums.length, expected: s.strums });
      setPick(null); // on to the next step not yet recorded
    });
  };

  const last = result ? PLAN.find((p) => p.id === result.stepId) : null;

  return (
    <section className="panel space-y-4 p-3 sm:p-4" aria-label="Guided recording">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-black">Guided recording</h2>
          <span className="text-sm text-muted-foreground" data-testid="guided-progress">{done} of {PLAN.length} steps recorded</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(100 * done) / PLAN.length}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">Fretlab tells you what to play and how. Record each step, tap <b className="text-foreground">Done</b> when you've played it, and at the end send the recordings to Vix so Listen mode can be tuned to a real guitar.</p>
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

      {ready && last && result ? (
        <div role="status" data-testid="guided-result" className={cn("flex flex-wrap items-center gap-2 rounded-md border p-2.5 text-sm", result.error || result.found !== result.expected ? "border-root/60 bg-root/10" : "border-extension/50 bg-extension/10")}>
          {result.error ? <CircleAlert className="h-4 w-4 shrink-0" /> : result.found === result.expected ? <Check className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1">
            <b>{last.title}</b>{" "}
            {result.error
              ? result.error
              : result.found === result.expected
                ? `saved — heard all ${result.found} strums.`
                : result.found! > result.expected!
                  ? `saved — heard ${result.found} strums, but ${result.expected} were asked for. If you played ${result.expected}, keep it (that's useful data); if you played more, redo it.`
                  : `saved — heard ${result.found} of the ${result.expected} strums asked for. If you played ${result.expected}, keep it (that's useful data); if you played fewer, redo it.`}
          </span>
          {!result.error ? (
            <Button size="sm" variant="secondary" className="h-8 gap-1" disabled={recording} onClick={() => setPick(PLAN.findIndex((p) => p.id === last.id))}>
              <RotateCcw className="h-3.5 w-3.5" /> Redo
            </Button>
          ) : null}
        </div>
      ) : null}

      {ready && step ? (
        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3" data-testid="guided-step" data-step={step.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Step {idx! + 1} of {PLAN.length}</span>
            <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", KIND[step.label].cls)}>{KIND[step.label].name}</span>
            {takeFor(step.id) ? <span className="text-xs text-muted-foreground">(recorded — recording again replaces it)</span> : null}
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
              <p className={cn("text-base font-bold", playing ? "text-primary" : "")} data-testid="guided-status">
                {rec.state === "starting" ? "Starting the microphone…" : rec.state === "quiet" ? `Stay quiet… ${Math.max(0, QUIET_SECONDS - rec.seconds).toFixed(1)} s` : `Play now — strums heard: ${rec.heard} of ${step.strums}`}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full transition-[width] duration-100", playing ? "bg-primary" : "bg-muted-foreground")} style={{ width: `${Math.max(0, Math.min(100, ((rec.level + 70) / 70) * 100))}%` }} />
              </div>
              <Button size="lg" variant="destructive" className="h-14 w-full gap-2 text-base" onClick={rec.stop} disabled={!playing} data-testid="guided-done">
                <Square className="h-4 w-4 fill-current" /> Done — I played it
              </Button>
              <p className="text-xs text-muted-foreground">Tap Done after the last strum has rung out. Stops by itself after {MAX_SECONDS} s.</p>
            </div>
          ) : (
            <Button size="lg" className="h-14 w-full gap-2 text-base" onClick={() => begin(step)} data-testid="guided-start">
              <Mic className="h-5 w-5" /> Start step {idx! + 1}
            </Button>
          )}
          {rec.error ? <p className="text-sm text-destructive-foreground" role="alert">{MIC_HELP[rec.error]}</p> : null}
        </div>
      ) : null}

      {ready && !step ? (
        <div className="space-y-2 rounded-lg border border-extension/50 bg-extension/10 p-3" data-testid="guided-finished">
          <p className="font-display text-lg font-black">All {PLAN.length} steps recorded — thank you!</p>
          <p className="text-sm">Tap <b>Export & send</b>, then send the .zip file to Vix (text, email, AirDrop or Google Drive). On the PC he opens Develop → <b>Import takes</b>.</p>
          <Button size="lg" className="h-12 gap-2" onClick={onExport}><Download className="h-4 w-4" /> Export & send</Button>
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
                const found = t ? measured.get(t.id)?.length : undefined;
                return (
                  <li key={s.id}>
                    <button type="button" disabled={recording} onClick={() => { setPick(i); setResult(null); setListOpen(false); }}
                      className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary/60", i === idx && "bg-secondary/60")}>
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", t ? (found === s.strums ? "bg-extension/80 text-background" : "bg-root text-root-foreground") : "bg-secondary text-muted-foreground")}>
                        {t ? (found === s.strums ? "✓" : "!") : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{t ? `${found ?? "…"}/${s.strums} strums` : KIND[s.label].name.replace(" — on purpose", "")}</span>
                    </button>
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
