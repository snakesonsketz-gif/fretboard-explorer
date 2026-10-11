import { useEffect, useRef, useState } from "react";
import { Heart, Mic, Play, Square, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChordBox } from "@/components/develop/ChordBox";
import { MIC_HELP } from "@/components/listen/micHelp";
import { CHORDS, RUSH_LEVELS, RUSH_LIVES, fallSeconds, loadBests, nextChord, rushPoints, saveBest, strumResult, type RushLevel } from "@/lib/games";
import { pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";
import { useGameMic, type HeardStrum } from "./useGameMic";

interface Drop {
  id: number;
  name: string;
  shownAt: number;
  landsAt: number;
  done: boolean;
}
type Phase = "ready" | "countdown" | "playing" | "over";
type Feedback = { text: string; tone: "good" | "bad" | "info"; id: number };

/**
 * Chord Rush: a chord name falls down the lane; play it cleanly on the guitar before it lands.
 * Faster with every chord cleared; a chord that lands costs a life (3 lives).
 */
export function ChordRush() {
  const [levelId, setLevelId] = useState<RushLevel["id"]>("starter");
  const level = RUSH_LEVELS.find((l) => l.id === levelId)!;
  const [hints, setHints] = useState(true);
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(RUSH_LIVES);
  const [cleared, setCleared] = useState(0);
  const [missed, setMissed] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);

  // The game loop reads these (state is for drawing).
  const g = useRef({ phase: "ready" as Phase, drop: null as Drop | null, drops: [] as Drop[], score: 0, combo: 0, lives: RUSH_LIVES, cleared: 0, missed: 0, nextId: 1 });
  const fbId = useRef(0);
  const say = (text: string, tone: Feedback["tone"]) => setFeedback({ text, tone, id: ++fbId.current });

  useEffect(() => setBest(loadBests()[`rush:${levelId}`] ?? 0), [levelId]);

  const mic = useGameMic(
    (t) => {
      // The chord on screen when the strum was played (a strum just after a new chord appears
      // still belongs to the old one if it began before).
      const d = g.current.drops.find((x) => t >= x.shownAt - 0.05 && t <= x.landsAt + 0.05);
      return d && !d.done ? CHORDS[d.name]!.target : null;
    },
    (s: HeardStrum) => onStrum(s),
  );

  const spawn = (now: number) => {
    const s = g.current;
    const name = nextChord(level.chords, s.drop?.name ?? null);
    const fall = fallSeconds(level, s.cleared);
    const d: Drop = { id: s.nextId++, name, shownAt: now, landsAt: now + fall, done: false };
    s.drop = d;
    s.drops = [...s.drops.slice(-4), d];
    setDrop(d);
  };

  const sync = () => {
    const s = g.current;
    setScore(s.score);
    setCombo(s.combo);
    setLives(s.lives);
    setCleared(s.cleared);
    setMissed(s.missed);
  };

  const gameOver = () => {
    const s = g.current;
    s.phase = "over";
    setPhase("over");
    setNewBest(saveBest(`rush:${level.id}`, s.score));
    setBest(Math.max(best, s.score));
    mic.stop();
  };

  function onStrum(h: HeardStrum) {
    const s = g.current;
    if (s.phase !== "playing") return;
    const d = s.drops.find((x) => h.time >= x.shownAt - 0.05 && h.time <= x.landsAt + 0.05);
    if (!d || d.done || d.id !== s.drop?.id) return;
    const r = strumResult(h.report);
    if (r.kind === "clean") {
      d.done = true;
      s.combo += 1;
      const pts = rushPoints((d.landsAt - h.time) / (d.landsAt - d.shownAt), s.combo - 1);
      s.score += pts;
      s.cleared += 1;
      say(`${pretty(d.name)} — clean! +${pts}${s.combo > 1 ? `  ·  ×${s.combo} combo` : ""}`, "good");
      sync();
      spawn(mic.now());
    } else if (r.kind === "wrong") {
      s.combo = 0;
      s.missed += 1;
      say(`Not quite — ${r.why}`, "bad");
      sync();
    } else if (r.kind === "quiet") say("Louder — I can barely hear you", "info");
  }

  // Falling, landing, lives.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      const s = g.current;
      const d = s.drop;
      if (d && s.phase === "playing") {
        const now = mic.now();
        setProgress(Math.min(1, (now - d.shownAt) / (d.landsAt - d.shownAt)));
        // Landed, plus a moment for a strum played just in time to be judged.
        if (!d.done && now > d.landsAt + 0.7) {
          d.done = true;
          s.lives -= 1;
          s.combo = 0;
          s.missed += 1;
          say(`Too slow — that was ${pretty(d.name)}`, "bad");
          sync();
          if (s.lives <= 0) return gameOver();
          spawn(now);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    g.current = { phase: "countdown", drop: null, drops: [], score: 0, combo: 0, lives: RUSH_LIVES, cleared: 0, missed: 0, nextId: 1 };
    sync();
    setDrop(null);
    setFeedback(null);
    setNewBest(false);
    setPhase("countdown");
    await mic.start();
    for (let n = 3; n > 0; n--) {
      setCount(n);
      await new Promise((r) => window.setTimeout(r, 800));
      if (g.current.phase !== "countdown") return;
    }
    g.current.phase = "playing";
    setPhase("playing");
    spawn(mic.now());
  };
  const quit = () => {
    g.current.phase = "ready";
    setPhase("ready");
    setDrop(null);
    mic.stop();
  };

  const tab = drop ? CHORDS[drop.name]!.tab : null;
  const danger = progress > 0.75;

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Chord Rush">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-black">Chord Rush</h2>
        <span className="text-sm text-muted-foreground">Play the falling chord cleanly before it lands.</span>
      </div>

      {phase === "ready" || phase === "over" ? (
        <div className="flex flex-wrap items-center gap-2">
          {RUSH_LEVELS.map((l) => (
            <Button key={l.id} size="sm" variant={l.id === levelId ? "default" : "secondary"} onClick={() => setLevelId(l.id)} data-testid={`rush-level-${l.id}`}>
              {l.name}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground">{level.chords.map(pretty).join(" · ")}</span>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={hints} onCheckedChange={setHints} aria-label="Show chord shapes" /> Show shapes
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2 text-center" data-testid="rush-stats">
        <Stat label="Score" value={score} testId="rush-score" />
        <Stat label="Combo" value={combo ? `×${combo}` : "—"} />
        <div className="rounded-md bg-secondary/60 p-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Lives</p>
          <p className="flex h-7 items-center justify-center gap-0.5" data-testid="rush-lives" data-lives={lives}>
            {Array.from({ length: RUSH_LIVES }, (_, i) => <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-root text-root" : "text-muted-foreground/40")} />)}
          </p>
        </div>
        <Stat label="Best" value={best} />
      </div>

      {/* the lane */}
      <div className={cn("relative h-72 overflow-hidden rounded-lg border bg-background/60 sm:h-80", danger && phase === "playing" ? "border-root/70" : "border-border")} data-testid="rush-lane">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-root/70" aria-hidden />
        {phase === "countdown" ? (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-7xl font-black text-primary" aria-live="assertive">{mic.state === "on" ? count : "…"}</span>
          </div>
        ) : null}
        {phase === "playing" && drop ? (
          <div
            key={drop.id}
            className={cn("absolute left-1/2 flex items-center gap-3 rounded-xl border-2 px-4 py-2 shadow-lg", danger ? "border-root bg-root/15" : "border-primary bg-card")}
            style={{ top: `${progress * 100}%`, transform: `translate(-50%, -${progress * 100}%)` }}
            data-testid="rush-chord"
            data-chord={drop.name}
          >
            <span className="font-display text-5xl font-black leading-none">{pretty(drop.name)}</span>
            {hints && tab ? <ChordBox tab={tab} size={70} /> : null}
          </div>
        ) : null}
        {phase === "ready" ? (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Put the phone near the guitar. Each chord falls a little faster than the last — miss three and it's over.</p>
              <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={() => void start()} data-testid="rush-start"><Play className="h-5 w-5" /> Start</Button>
            </div>
          </div>
        ) : null}
        {phase === "over" ? (
          <div className="absolute inset-0 grid place-items-center bg-background/70 p-4 text-center" data-testid="rush-over">
            <div className="space-y-2">
              <p className="font-display text-3xl font-black">Game over</p>
              <p className="text-lg"><b data-testid="rush-final">{score}</b> points · {cleared} chord{cleared === 1 ? "" : "s"} cleared</p>
              {newBest ? <p className="flex items-center justify-center gap-1.5 font-semibold text-primary"><Trophy className="h-5 w-5" /> New best!</p> : <p className="text-sm text-muted-foreground">Best: {best}</p>}
              <Button size="lg" className="h-11 gap-2" onClick={() => void start()}><Zap className="h-4 w-4" /> Play again</Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2">
        {feedback ? (
          <p key={feedback.id} className={cn("text-sm font-semibold", feedback.tone === "good" ? "text-extension" : feedback.tone === "bad" ? "text-root" : "text-muted-foreground")} role="status" data-testid="rush-feedback">
            {feedback.text}
          </p>
        ) : null}
        {phase === "playing" || phase === "countdown" ? (
          <>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><Mic className="h-3.5 w-3.5" /><MicMeter db={mic.level} /></span>
            <Button size="sm" variant="ghost" className="gap-1" onClick={quit}><Square className="h-3.5 w-3.5 fill-current" /> Stop</Button>
          </>
        ) : null}
      </div>
      {mic.error ? <p className="text-sm text-destructive-foreground" role="alert">{MIC_HELP[mic.error]}</p> : null}
      {phase === "playing" ? <p className="text-[11px] text-muted-foreground">{missed} miss{missed === 1 ? "" : "es"} so far · only the notes count (buzz doesn't cost you)</p> : null}
    </section>
  );
}

export function Stat({ label, value, testId }: { label: string; value: string | number; testId?: string }) {
  return (
    <div className="rounded-md bg-secondary/60 p-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-black leading-7" data-testid={testId}>{value}</p>
    </div>
  );
}

export function MicMeter({ db }: { db: number }) {
  return (
    <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-secondary" aria-hidden>
      <span className="block h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${Math.max(0, Math.min(100, ((db + 70) / 70) * 100))}%` }} />
    </span>
  );
}
