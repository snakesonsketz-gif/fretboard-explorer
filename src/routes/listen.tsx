import { createFileRoute, Link } from "@tanstack/react-router";
import { useTabActive } from "@/lib/tabActive";
import { useEffect, useMemo, useState } from "react";
import { Headphones, Mic, Square } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChordPicker } from "@/components/listen/ChordPicker";
import { MIC_HELP } from "@/components/listen/micHelp";
import { StrumResult } from "@/components/listen/StrumResult";
import { verdictClass } from "@/components/listen/verdicts";
import { useListen, type ListenMode } from "@/components/listen/useListen";
import type { StrumReport, TargetChord, Verdict } from "@/lib/listen/score";
import { loadSeqDraft } from "@/lib/sequences";
import { degreeToSemitones, pretty, rootByName, spellDegree } from "@/lib/theory";
import type { Arrangement } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen — Fretlab" }] }),
  component: ListenPage,
});


const DOT: Record<Verdict, string> = { good: "bg-extension", fix: "bg-root", unsure: "bg-muted-foreground/40" };

export function ListenPage() {
  const L = useListen();
  // Switching to another tab turns the microphone off (the settings stay as they were).
  const tabActive = useTabActive();
  useEffect(() => {
    if (!tabActive && (L.state === "on" || L.state === "starting")) L.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActive]);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ListenMode>("check");
  const [target, setTarget] = useState<TargetChord>({ rootName: "G", degrees: ["1", "3", "5"], label: "G" });
  const [bpm, setBpm] = useState(80);
  const [every, setEvery] = useState<1 | 2 | 4>(1);
  const [clickSound, setClickSound] = useState(true);
  const [backing, setBacking] = useState(false);
  const [drums, setDrums] = useState(false);
  const [draft, setDraft] = useState<Arrangement | null>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    setDraft(loadSeqDraft());
    setMounted(true);
  }, []);

  const listening = L.state === "on" || L.state === "starting";
  const judged = L.strums.filter((s) => s.report);
  const latest = shown !== null ? judged.find((s) => s.id === shown) : judged[judged.length - 1];
  const avg = useMemo(() => {
    const m = (xs: (number | null)[]) => {
      const v = xs.filter((x): x is number => x !== null);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    return {
      accuracy: m(judged.map((s) => s.report!.accuracy.score)),
      clarity: m(judged.map((s) => s.report!.clarity.score)),
      ring: m(judged.filter((s) => s.report!.ringOut.verdict !== "unsure").map((s) => (s.report!.ringOut.verdict === "good" ? 100 : 0))),
      timing: m(judged.map((s) => (s.report!.timing.offsetMs === null ? null : Math.abs(s.report!.timing.offsetMs)))),
    };
  }, [judged]);

  if (!mounted)
    return (
      <AppShell>
        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
          <section className="panel p-6 text-sm text-muted-foreground" aria-busy="true">Loading Listen mode…</section>
        </main>
      </AppShell>
    );

  const start = () =>
    L.start({ mode, target, bpm, every, clickSound, ...(mode === "along" && draft ? { arrangement: draft, backingChords: backing, drums } : {}) });
  const targetPcs = target.degrees.map((d) => (rootByName(target.rootName).pc + degreeToSemitones(d)) % 12);
  const canStart = mode !== "along" || !!draft?.chords.length;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4">
        <section className="panel space-y-4 p-3 sm:p-4" aria-label="Listen setup">
          <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/60 p-1" role="tablist" aria-label="Listen mode">
            {([["check", "Check a chord"], ["click", "With a click"], ["along", "Play along"]] as [ListenMode, string][]).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} disabled={listening} onClick={() => setMode(k)}
                className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {l}
              </button>
            ))}
          </div>

          {mode !== "along" ? (
            <ChordPicker target={target} onPick={setTarget} disabled={listening} />
          ) : (
            <div className="space-y-2 text-sm">
              {draft?.chords.length ? (
                <p>
                  Your sequence: <span className="font-mono">{draft.chords.length} chords · {draft.measures} bars · {draft.ts.beats}/{draft.ts.unit} · {draft.bpm} bpm</span>{" "}
                  <Link to="/sequencer" className="text-primary underline-offset-2 hover:underline">Edit in Sequencer</Link>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Nothing to play along with yet — place some chords in the <Link to="/sequencer" className="text-primary underline-offset-2 hover:underline">Sequencer</Link> first.
                </p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex items-center gap-2"><Switch checked={backing} onCheckedChange={setBacking} disabled={listening} /> Hear the chords</label>
                <label className="flex items-center gap-2"><Switch checked={drums} onCheckedChange={setDrums} disabled={listening} /> Hear the drums</label>
                <label className="flex items-center gap-2"><Switch checked={clickSound} onCheckedChange={setClickSound} disabled={listening} /> Click</label>
              </div>
              {backing || drums ? (
                <p className="flex items-center gap-1.5 text-xs text-primary"><Headphones className="h-3.5 w-3.5" /> Use headphones — through speakers the mic hears the app's own chords and drums too.</p>
              ) : null}
            </div>
          )}

          {mode === "click" ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">Tempo</span>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" disabled={listening} onClick={() => setBpm((b) => Math.max(40, b - 2))} aria-label="Slower">−</Button>
                <span className="w-16 text-center font-mono">{bpm} bpm</span>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" disabled={listening} onClick={() => setBpm((b) => Math.min(220, b + 2))} aria-label="Faster">+</Button>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">Strum on</span>
                {([[1, "every beat"], [2, "every 2 beats"], [4, "every bar"]] as [1 | 2 | 4, string][]).map(([n, l]) => (
                  <Button key={n} size="sm" variant={every === n ? "default" : "secondary"} className="h-8 px-2 text-xs" disabled={listening} onClick={() => setEvery(n)}>{l}</Button>
                ))}
              </div>
              <label className="flex items-center gap-2"><Switch checked={clickSound} onCheckedChange={setClickSound} disabled={listening} /> Click sound</label>
            </div>
          ) : null}

          {mode !== "check" ? (
            <p className="text-xs text-muted-foreground" data-testid="latency">
              {L.latencyMs !== null ? (
                <>Timing is corrected for this device's delay ({L.latencyMs} ms). <button type="button" className="text-primary hover:underline" onClick={L.calibrate} disabled={listening}>Re-calibrate</button> · <button type="button" className="hover:underline" onClick={L.resetLatency} disabled={listening}>Reset</button></>
              ) : (
                <>Phones and computers add a small delay between sound and microphone. <button type="button" className="font-semibold text-primary hover:underline" onClick={L.calibrate} disabled={listening}>Calibrate timing</button> once (strum along with 8 clicks) so “late” really means late.</>
              )}
            </p>
          ) : null}
          {L.tuned ? (
            <p className="text-xs text-muted-foreground" data-testid="tuned-note">
              Using thresholds tuned in <Link to="/develop" className="text-primary hover:underline">Develop</Link> on this device.
            </p>
          ) : null}
        </section>

        <section className="panel space-y-3 p-3 sm:p-4" aria-label="Microphone">
          <div className="flex flex-wrap items-center gap-3">
            {listening ? (
              <Button size="lg" variant="secondary" className="h-11 min-w-36 gap-2 text-base" onClick={L.stop}><Square className="h-4 w-4" /> Stop</Button>
            ) : (
              <Button size="lg" className="h-11 min-w-36 gap-2 text-base" onClick={start} disabled={!canStart || L.state === "calibrating"}><Mic className="h-4 w-4" /> Start listening</Button>
            )}
            <div className="min-w-40 flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-secondary" role="meter" aria-label="Microphone level" aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(L.level)}>
                <div className={cn("h-full transition-[width] duration-100", L.level > -6 ? "bg-third" : "bg-extension")} style={{ width: `${Math.max(0, Math.min(100, ((L.level + 60) / 60) * 100))}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground" aria-live="polite" data-testid="listen-status">
                {L.state === "calibrating" && L.calib ? `Calibrating: strum muted strings (or tap the guitar) on each click — ${L.calib.found}/${L.calib.need}`
                  : L.state === "starting" ? "Starting the microphone…"
                  : L.state === "on" ? (L.level < -55 ? "Listening… play when you're ready." : L.level > -6 ? "Very loud — move the mic back a little." : "Listening…")
                  : "Audio stays on this device. Nothing is recorded or sent anywhere."}
              </p>
            </div>
          </div>
          {L.error ? <p className="rounded-md border border-third/50 bg-third/10 p-2 text-sm" role="alert">{MIC_HELP[L.error]}</p> : null}
          {L.state === "on" && mode !== "along" ? (
            <div className="flex flex-wrap items-center gap-1.5" data-testid="hearing-now">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Hearing now</span>
              {target.degrees.map((d, i) => {
                const on = (L.live?.pcs[targetPcs[i]!] ?? 0) >= 0.2;
                return <span key={d} className={cn("rounded px-1.5 py-0.5 font-mono text-xs font-semibold", on ? "bg-extension/80 text-background" : "bg-secondary text-muted-foreground")}>{pretty(spellName(target, d))}</span>;
              })}
              {L.live?.pcs.map((v, pc) => (v >= 0.4 && !targetPcs.includes(pc) ? <span key={pc} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground ring-1 ring-border">+{["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][pc]}?</span> : null))}
              <span className="text-[11px] text-muted-foreground">(a rough live guess — the result after each strum is the careful check)</span>
            </div>
          ) : null}
        </section>

        {latest?.report ? (
          <section className="panel space-y-2 p-3 sm:p-4" aria-label="Last strum">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">{shown !== null ? "Selected strum" : "Last strum"}</h2>
            <StrumResult report={latest.report} label={latest.target?.label ?? ""} />
          </section>
        ) : null}

        {judged.length ? (
          <section className="panel space-y-2 p-3 sm:p-4" aria-label="This session">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest">This session</h2>
              <span className="font-mono text-xs text-muted-foreground" data-testid="session-averages">
                {judged.length} strums · accuracy {avg.accuracy ?? "–"}% · clarity {avg.clarity ?? "–"}% · rang well {avg.ring ?? "–"}%{avg.timing !== null ? ` · ±${avg.timing} ms` : ""}
              </span>
              <span className="text-[11px] text-muted-foreground">Averages leave out anything marked unsure.</span>
            </div>
            <ul className="max-h-72 divide-y divide-border/50 overflow-y-auto rounded-md border border-border/60 text-sm">
              {[...judged].reverse().map((s) => (
                <li key={s.id} data-testid="strum-row" data-time={s.time.toFixed(4)}>
                  <button type="button" onClick={() => setShown(shown === s.id ? null : s.id)} className={cn("flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-secondary/50", shown === s.id && "bg-secondary/60")}>
                    <span className="w-14 font-mono text-xs text-muted-foreground">{(s.time - (judged[0]?.time ?? 0)).toFixed(1)} s</span>
                    <span className="w-16 font-mono font-semibold">{pretty(s.target?.label ?? "")}</span>
                    {(["accuracy", "clarity", "ringOut", "timing"] as const).map((k) => (
                      <span key={k} className={cn("h-2.5 w-2.5 rounded-full", DOT[s.report![k].verdict])} title={`${k}: ${s.report![k].verdict}`} />
                    ))}
                    <span className="truncate text-xs text-muted-foreground">{headline(s.report!)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="panel space-y-2 p-3 sm:p-4" aria-label="Practice history">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Practice history</h2>
            {L.history.length ? <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={L.clearHistory}>Clear</Button> : null}
          </div>
          {L.history.length ? (
            <ul className="space-y-1 text-sm">
              {L.history.slice(0, 15).map((h) => (
                <li key={h.id} className={cn("flex flex-wrap items-center gap-x-3 rounded-md border px-2 py-1", verdictClass.unsure)}>
                  <span className="font-mono text-xs text-muted-foreground">{new Date(h.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="font-semibold">{pretty(h.label)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {h.strums} strums · accuracy {h.accuracy === null ? "–" : `${Math.round(h.accuracy)}%`} · clarity {h.clarity === null ? "–" : `${Math.round(h.clarity)}%`}
                    {h.onTimePct !== null ? ` · on time ${Math.round(h.onTimePct)}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Each session you finish is summarised here, on this device.</p>
          )}
        </section>
      </main>
    </AppShell>
  );
}

const spellName = (t: TargetChord, d: string) => spellDegree(rootByName(t.rootName), d);

/** One line per strum: the first thing to work on, else the accuracy result. */
const headline = (r: StrumReport) => ([r.accuracy, r.clarity, r.ringOut, r.timing].find((x) => x.verdict === "fix") ?? r.accuracy).summary;
