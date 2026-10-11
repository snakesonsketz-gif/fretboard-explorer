import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Square, Timer, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChordBox } from "@/components/develop/ChordBox";
import { MIC_HELP } from "@/components/listen/micHelp";
import { CHANGE_PAIRS, CHANGE_SECONDS, CHORDS, loadBests, raceStart, raceStep, saveBest, strumResult, type RaceState } from "@/lib/games";
import { pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";
import { MicMeter, Stat } from "./ChordRush";
import { useGameMic, type HeardStrum } from "./useGameMic";
import { NEON_BAD, NEON_GOOD, NEON_INFO, neonCard, neonLane, neonOf, neonText } from "./neon";

type Phase = "ready" | "countdown" | "playing" | "over";

/**
 * Change Race: two chords, one minute — how many clean changes between them? The classic chord-
 * change drill, counted by the microphone. A personal best is kept for every pair.
 */
export function ChangeRace() {
  const [pairIdx, setPairIdx] = useState(0);
  const pair = CHANGE_PAIRS[pairIdx]!;
  const key = `race:${pair[0]}-${pair[1]}`;
  const [hints, setHints] = useState(true);
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [race, setRace] = useState<RaceState>(raceStart());
  const [left, setLeft] = useState(CHANGE_SECONDS);
  const [last, setLast] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const [bests, setBests] = useState<Record<string, number>>({});
  const [newBest, setNewBest] = useState(false);
  const g = useRef({ phase: "ready" as Phase, race: raceStart(), endsAt: 0 });
  const lastId = useRef(0);

  useEffect(() => setBests(loadBests()), []);

  const mic = useGameMic(
    // The chord due when the strum was played (the next chord becomes due as soon as the last
    // one is judged clean — about half a second after it was strummed).
    () => (g.current.phase === "playing" ? CHORDS[pair[g.current.race.due]]!.target : null),
    (h: HeardStrum) => {
      const s = g.current;
      if (s.phase !== "playing" || h.time > s.endsAt) return;
      const r = strumResult(h.report);
      const before = s.race;
      s.race = raceStep(s.race, r);
      setRace(s.race);
      const name = pretty(pair[before.due]);
      if (r.kind === "clean") setLast({ text: before.started ? `${name} ✓ — change ${s.race.changes}` : `${name} ✓ — go!`, good: true, id: ++lastId.current });
      else if (r.kind === "wrong") setLast({ text: `That wasn't a clean ${name} — ${r.why}`, good: false, id: ++lastId.current });
      else if (r.kind === "quiet") setLast({ text: "Louder — I can barely hear you", good: false, id: ++lastId.current });
    },
  );

  // The clock.
  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const s = g.current;
      const remain = Math.max(0, s.endsAt - mic.now());
      setLeft(remain);
      // A strum in the last moment still gets judged before the result is final.
      if (remain <= 0 && mic.now() > s.endsAt + 0.7) {
        window.clearInterval(id);
        s.phase = "over";
        setPhase("over");
        setNewBest(saveBest(key, s.race.changes));
        setBests(loadBests());
        mic.stop();
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    g.current = { phase: "countdown", race: raceStart(), endsAt: 0 };
    setRace(raceStart());
    setLeft(CHANGE_SECONDS);
    setLast(null);
    setNewBest(false);
    setPhase("countdown");
    await mic.start();
    for (let n = 3; n > 0; n--) {
      setCount(n);
      await new Promise((r) => window.setTimeout(r, 800));
      if (g.current.phase !== "countdown") return;
    }
    g.current.phase = "playing";
    g.current.endsAt = mic.now() + CHANGE_SECONDS;
    setPhase("playing");
  };
  const quit = () => {
    g.current.phase = "ready";
    setPhase("ready");
    mic.stop();
  };

  const due = pair[race.due], next = pair[race.due === 0 ? 1 : 0];
  const best = bests[key] ?? 0;

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Change Race">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-black">Change Race</h2>
        <span className="text-sm text-muted-foreground">One minute. Switch between two chords — every clean change counts.</span>
      </div>

      {phase === "ready" || phase === "over" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chord pair">
            {CHANGE_PAIRS.map(([a, b], i) => (
              <Button key={`${a}-${b}`} size="sm" variant={i === pairIdx ? "default" : "secondary"} className="font-display font-bold" role="radio" aria-checked={i === pairIdx} onClick={() => setPairIdx(i)} data-testid="race-pair">
                {pretty(a)} ↔ {pretty(b)}
                {bests[`race:${a}-${b}`] ? <span className="ml-1 font-mono text-[10px] opacity-70">{bests[`race:${a}-${b}`]}</span> : null}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={hints} onCheckedChange={setHints} aria-label="Show chord shapes" /> Show shapes
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Changes" value={race.changes} testId="race-changes" color={NEON_GOOD} />
        <div className="rounded-md border p-1.5" style={{ background: "#0b0b16", borderColor: `${NEON_INFO}55` }}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Time</p>
          <p className="flex items-center justify-center gap-1 font-mono text-xl font-black leading-7" style={neonText(left <= 10 && phase === "playing" ? NEON_BAD : NEON_INFO)}><Timer className="h-4 w-4" />{Math.ceil(left)}</p>
        </div>
        <Stat label="Best" value={best} color="#ff2bd6" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${(100 * left) / CHANGE_SECONDS}%`, background: left <= 10 ? NEON_BAD : NEON_INFO, boxShadow: `0 0 8px ${left <= 10 ? NEON_BAD : NEON_INFO}` }} />
      </div>

      <div className="relative grid min-h-[22rem] place-items-center rounded-xl border-2 p-4" style={{ ...neonLane, borderColor: "#2a1f4d" }} data-testid="race-board">
        {phase === "ready" ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Start on {pretty(pair[0])}, then {pretty(pair[1])}, then back — as fast as you can while every strum stays clean.</p>
            <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={() => void start()} data-testid="race-start"><Play className="h-5 w-5" /> Start</Button>
          </div>
        ) : phase === "countdown" ? (
          <span className="font-display text-9xl font-black" style={neonText(NEON_INFO)} aria-live="assertive">{mic.state === "on" ? count : "…"}</span>
        ) : phase === "playing" ? (
          <div className="flex w-full flex-col items-center gap-4" data-testid="race-due" data-chord={due}>
            <div key={`${due}-${race.changes}`} className="flex w-full max-w-md items-center justify-center gap-4 rounded-2xl border-[3px] px-4 py-5 sm:gap-6" style={neonCard(neonOf(due))}>
              <span className="font-display text-[6rem] font-black leading-none sm:text-[7.5rem]" style={neonText(neonOf(due))}>{pretty(due)}</span>
              {hints ? <ChordBox tab={CHORDS[due]!.tab} size={112} /> : null}
            </div>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs uppercase tracking-widest">next</span>
              <ArrowRight className="h-5 w-5" />
              <span className="rounded-lg border-2 px-3 py-1 font-display text-3xl font-black" style={{ ...neonCard(neonOf(next), false), ...neonText(neonOf(next)) }}>{pretty(next)}</span>
            </span>
          </div>
        ) : (
          <div className="space-y-2 text-center" data-testid="race-over">
            <p className="font-display text-5xl font-black" style={neonText(NEON_INFO)}>Time!</p>
            <p className="text-lg"><b className="text-3xl" style={neonText(NEON_GOOD)} data-testid="race-final">{race.changes}</b> clean change{race.changes === 1 ? "" : "s"} in a minute · {pretty(pair[0])} ↔ {pretty(pair[1])}</p>
            {newBest ? <p className="flex items-center justify-center gap-1.5 text-xl font-black" style={neonText("#ffe600")}><Trophy className="h-6 w-6" /> New best!</p> : <p className="text-sm text-muted-foreground">Best: {best}</p>}
            <p className="text-xs text-muted-foreground">{race.misses} strum{race.misses === 1 ? "" : "s"} weren't clean. Tip: 30+ changes a minute on a pair means it's in your hands.</p>
            <Button size="lg" className="h-11 gap-2" onClick={() => void start()}><Zap className="h-4 w-4" /> Go again</Button>
          </div>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2">
        {last ? <p key={last.id} className="text-base font-black" style={neonText(last.good ? NEON_GOOD : NEON_BAD)} role="status" data-testid="race-feedback">{last.text}</p> : null}
        {phase === "playing" || phase === "countdown" ? (
          <>
            <span className="ml-auto"><MicMeter db={mic.level} /></span>
            <Button size="sm" variant="ghost" className="gap-1.5 border font-bold" style={{ borderColor: NEON_BAD, color: NEON_BAD, boxShadow: `0 0 8px ${NEON_BAD}66` }} onClick={quit}><Square className="h-3 w-3" style={{ fill: NEON_BAD }} /> Stop</Button>
          </>
        ) : null}
      </div>
      {mic.error ? <p className="text-sm text-destructive-foreground" role="alert">{MIC_HELP[mic.error]}</p> : null}
    </section>
  );
}
