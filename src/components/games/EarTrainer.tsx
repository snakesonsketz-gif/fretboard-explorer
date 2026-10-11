import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Ear, Play, Square, Trophy, Turtle, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { engine } from "@/lib/engine";
import { EAR_ANSWERS, EAR_READY, EAR_ROUND, earLevel, earPoints, earQuestion, loadBests, saveBest, savedEarAnswers, type EarAnswer, type EarMode, type EarQuestion } from "@/lib/games";
import { TIERS, tierIndex } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Stat } from "./ChordRush";
import { ChordToggles, MineToggle, TierPicker, useRemembered, useSavedChords, useSwitchedOff, useTier } from "./TierPicker";
import { NEON_BAD, NEON_GOOD, NEON_INFO, neonCard, neonLane, neonText } from "./neon";

type Phase = "ready" | "playing" | "over";

interface Round {
  n: number;
  q: EarQuestion | null;
  picked: string | null;
  score: number;
  streak: number;
  topStreak: number;
  correct: number;
  recent: string[];
  /** Right or wrong, per sound answered. */
  marks: boolean[];
}
const fresh = (): Round => ({ n: 0, q: null, picked: null, score: 0, streak: 0, topStreak: 0, correct: 0, recent: [], marks: [] });

/** Play a question: chords strummed (or picked slowly), intervals one note then the other. */
function hear(q: EarQuestion, kind: "chord" | "interval", slow = false) {
  if (kind === "interval") void engine.previewNotes(q.midis, slow ? 1.1 : 0.7, { velocity: 0.8 });
  else if (slow) void engine.previewNotes(q.midis, 0.34, { velocity: 0.75 });
  else void engine.previewChord(q.midis, 45);
}

/**
 * Ear Trainer: the app plays a chord or an interval, you tap what you heard. Ten sounds a round,
 * points grow with the streak. Chords or intervals, at four difficulties; saved chord types from
 * Explore can join the chord rounds. No microphone.
 */
export function EarTrainer() {
  const [kind, setKindRaw] = useState<EarMode>("chord");
  const [tier, setTier] = useTier(`ear.${kind}`);
  const [mineOn, setMineOn] = useRemembered("fretlab.games.mine.ear", true);
  const favs = useSavedChords();
  const builtIn = earLevel(kind, tier);
  const mine = kind === "chord" ? savedEarAnswers(favs, tier, builtIn.answers) : {};
  const answers: Record<string, EarAnswer> = { ...EAR_ANSWERS, ...mine };
  const full = mineOn && kind === "chord" ? earLevel(kind, tier, Object.keys(mine)) : builtIn;
  // The ones switched on are the sounds you'll hear and the answers you choose from.
  const [off, toggleOff, allOn] = useSwitchedOff(`ear:${kind}:${tier}`);
  const onAnswers = full.answers.filter((a) => !off.has(a));
  const level = { ...full, answers: onAnswers.length >= 2 ? onAnswers : full.answers };
  const setKind = (k: EarMode) => setKindRaw(k);
  const [phase, setPhase] = useState<Phase>("ready");
  const [r, setR] = useState<Round>(fresh());
  const [bests, setBests] = useState<Record<string, number>>({});
  const [newBest, setNewBest] = useState(false);
  const [last, setLast] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const live = useRef(r);
  live.current = r;
  const timer = useRef<number | null>(null);
  const lastId = useRef(0);

  useEffect(() => setBests(loadBests()), []);
  useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), []);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const ask = (prev: Round) => {
    const q = earQuestion(level, prev.recent.slice(-2), Math.random, answers);
    const next = { ...prev, n: prev.n + 1, q, picked: null, recent: [...prev.recent, q.answer].slice(-4) };
    setR(next);
    hear(q, level.kind);
  };

  const start = () => {
    clearTimer();
    engine.unlock(); // inside the tap (iPhone)
    setNewBest(false);
    setLast(null);
    setPhase("playing");
    ask(fresh());
  };

  const finish = (fin: Round) => {
    setNewBest(saveBest(`ear:${level.id}`, fin.score));
    setBests(loadBests());
    setPhase("over");
  };

  const advance = () => {
    clearTimer();
    const cur = live.current;
    if (cur.n >= EAR_ROUND) finish(cur);
    else ask(cur);
  };

  const pick = (id: string) => {
    const cur = live.current;
    if (!cur.q || cur.picked) return;
    const right = id === cur.q.answer;
    const name = answers[cur.q.answer]!.label;
    const gain = right ? earPoints(cur.streak) : 0;
    const streak = right ? cur.streak + 1 : 0;
    setR({ ...cur, picked: id, score: cur.score + gain, streak, topStreak: Math.max(cur.topStreak, streak), correct: cur.correct + (right ? 1 : 0), marks: [...cur.marks, right] });
    setLast(
      right
        ? { text: `${name} ✓ +${gain}${streak >= 3 ? ` · ${streak} in a row!` : ""}`, good: true, id: ++lastId.current }
        : { text: `That was ${name} — not ${answers[id]!.label}`, good: false, id: ++lastId.current },
    );
    if (right) timer.current = window.setTimeout(advance, 1100);
  };

  /** After a miss: the real answer, then the one picked, so the difference is easy to hear. */
  const compare = () => {
    const cur = live.current;
    if (!cur.q || !cur.picked) return;
    hear(cur.q, level.kind);
    const other = answers[cur.picked]!;
    const base = cur.q.down ? cur.q.midis[1]! : cur.q.midis[0]!;
    const midis = other.steps.map((s) => base + s);
    const q2: EarQuestion = { answer: other.id, midis: cur.q.down ? midis.reverse() : midis, down: cur.q.down };
    timer.current = window.setTimeout(() => hear(q2, level.kind), 1800);
  };

  const quit = () => {
    clearTimer();
    setPhase("ready");
    setR(fresh());
    setLast(null);
  };

  const best = bests[`ear:${level.id}`] ?? 0;
  const nextTier = TIERS[tierIndex(tier) + 1];
  const q = r.q;
  const many = level.answers.length > 6;

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Ear Trainer">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-black">Ear Trainer</h2>
        <span className="text-sm text-muted-foreground">Listen, then tap what you heard. No guitar needed — turn the sound up.</span>
      </div>

      {phase !== "playing" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What to train">
            {(["chord", "interval"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} data-testid={`ear-kind-${k}`}
                className="rounded-lg border-2 px-3 py-2 font-display font-black transition-transform active:scale-95"
                style={kind === k ? { ...neonCard(NEON_INFO), ...neonText(NEON_INFO) } : { borderColor: `${NEON_INFO}44`, background: "#0b0b16", color: NEON_INFO }}>
                {k === "chord" ? "Chord types" : "Intervals"}
              </button>
            ))}
          </div>
          <TierPicker value={tier} onChange={setTier} bests={Object.fromEntries(TIERS.map((t) => [t.id, bests[`ear:${kind}:${t.id}`] ?? 0]))} note={(t) => earLevel(kind, t).name} />
          <ChordToggles names={full.answers} off={off} onToggle={(n) => toggleOff(n, full.answers)} onAll={allOn} label={(n) => answers[n]?.label ?? n} colorOf={(n) => answers[n]?.color ?? NEON_INFO}
            title={kind === "chord" ? "Chords you'll hear" : "Intervals you'll hear"} testId="ear-toggle" />
          {kind === "chord" ? <MineToggle checked={mineOn} onChange={setMineOn} count={Object.keys(mine).length} tier={tier} what="chord types" /> : null}
          <InstrumentPicker />
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Sound" value={`${r.n}/${EAR_ROUND}`} color={NEON_INFO} testId="ear-n" />
        <Stat label="Score" value={r.score} color={NEON_GOOD} testId="ear-score" />
        <Stat label="Streak" value={r.streak} color="#ffe600" />
        <Stat label="Best" value={best} color="#ff2bd6" />
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: EAR_ROUND }, (_, i) => {
          const m = r.marks[i];
          const c = m === true ? NEON_GOOD : m === false ? NEON_BAD : phase === "playing" && i === r.n - 1 ? NEON_INFO : null;
          return <span key={i} className={cn("h-1.5 flex-1 rounded-full bg-secondary", m === undefined && c && "animate-pulse")} style={c ? { background: c, boxShadow: `0 0 6px ${c}` } : undefined} />;
        })}
      </div>

      <div className="relative grid min-h-[22rem] place-items-center rounded-xl border-2 p-3 sm:p-4" style={{ ...neonLane, borderColor: "#2a1f4d" }} data-testid="ear-board">
        {phase === "ready" ? (
          <div className="space-y-3 text-center">
            <Ear className="mx-auto h-14 w-14" style={{ color: NEON_INFO, filter: `drop-shadow(0 0 10px ${NEON_INFO})` }} />
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {level.kind === "chord" ? "A chord plays — which type is it?" : "Two notes play — how far apart are they?"}
              {" "}{EAR_ROUND} sounds a round. Get {EAR_READY} right and you're ready for the next level.
            </p>
            <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={start} data-testid="ear-start"><Play className="h-5 w-5" /> Start</Button>
          </div>
        ) : phase === "playing" && q ? (
          <div className="flex w-full flex-col items-center gap-4" data-testid="ear-question" data-answer={q.answer}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => hear(q, level.kind)} aria-label="Play the sound again" data-testid="ear-replay"
                className="grid h-24 w-24 place-items-center rounded-full border-[3px] transition-transform active:scale-95 sm:h-28 sm:w-28" style={neonCard(NEON_INFO)}>
                <Volume2 className="h-11 w-11" style={{ color: NEON_INFO, filter: `drop-shadow(0 0 8px ${NEON_INFO})` }} />
              </button>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="ghost" className="gap-1.5 border" style={{ borderColor: `${NEON_INFO}88`, color: NEON_INFO }} onClick={() => hear(q, level.kind, true)}>
                  <Turtle className="h-4 w-4" /> Slow
                </Button>
                {level.kind === "interval" ? (
                  <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold" style={{ borderColor: "#ffe60088", ...neonText("#ffe600") }} data-testid="ear-dir">
                    {q.down ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />} {q.down ? "going down" : "going up"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={cn("grid w-full gap-2", many ? "grid-cols-3 sm:grid-cols-4" : level.answers.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")} role="group" aria-label="What did you hear?">
              {level.answers.map((id) => {
                const a = answers[id]!;
                const isAnswer = !!r.picked && id === q.answer;
                const isWrongPick = !!r.picked && id === r.picked && id !== q.answer;
                const color = isWrongPick ? NEON_BAD : a.color;
                return (
                  <button key={id} type="button" onClick={() => pick(id)} disabled={!!r.picked} data-testid="ear-answer" data-id={id}
                    className={cn("flex flex-col items-center justify-center rounded-xl border-2 text-center transition-all active:scale-95",
                      many ? "min-h-[4.25rem] px-1 py-2" : level.answers.length === 2 ? "min-h-[8.5rem] px-2 py-4" : "min-h-[5.5rem] px-2 py-3",
                      r.picked && !isAnswer && !isWrongPick && "opacity-35", isAnswer && "scale-[1.04]")}
                    style={neonCard(color, isAnswer || isWrongPick)}>
                    <span className={cn("font-display font-black leading-tight", many ? "text-base sm:text-lg" : level.answers.length === 2 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl", isWrongPick && "line-through")} style={neonText(color)}>{a.label}</span>
                    {!q.down && !many ? <span className="mt-1 text-[11px] text-muted-foreground">{a.hint}</span> : null}
                    {!q.down && many ? <span className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">{a.hint}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-center" data-testid="ear-over">
            <p className="font-display text-5xl font-black" style={neonText(NEON_INFO)}>Round over!</p>
            <p className="text-lg"><b className="text-4xl" style={neonText(r.correct >= EAR_READY ? NEON_GOOD : "#ffe600")} data-testid="ear-correct">{r.correct}/{EAR_ROUND}</b> right · <b style={neonText(NEON_GOOD)}>{r.score}</b> points</p>
            {newBest ? <p className="flex items-center justify-center gap-1.5 text-xl font-black" style={neonText("#ffe600")}><Trophy className="h-6 w-6" /> New best!</p> : <p className="text-sm text-muted-foreground">Best: {best}</p>}
            {r.correct >= EAR_READY && nextTier ? (
              <p className="text-lg font-black" style={neonText("#ff2bd6")} data-testid="ear-ready">Ready for {nextTier.name}!</p>
            ) : r.correct < EAR_READY ? (
              <p className="text-xs text-muted-foreground">Get {EAR_READY} right and you're ready for the next level.</p>
            ) : null}
            {r.topStreak >= 3 ? <p className="text-xs text-muted-foreground">Longest streak: {r.topStreak}</p> : null}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button size="lg" className="h-11 gap-2" onClick={start} data-testid="ear-again"><Zap className="h-4 w-4" /> Go again</Button>
              {r.correct >= EAR_READY && nextTier ? (
                <Button size="lg" variant="ghost" className="h-11 gap-2 border font-bold" style={{ borderColor: "#ff2bd6", color: "#ff2bd6", boxShadow: "0 0 10px #ff2bd666" }} onClick={() => { setTier(nextTier.id); setPhase("ready"); setR(fresh()); setLast(null); }}>
                  Try {nextTier.name} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2">
        {last && phase === "playing" ? <p key={last.id} className="text-base font-black" style={neonText(last.good ? NEON_GOOD : NEON_BAD)} role="status" data-testid="ear-feedback">{last.text}</p> : null}
        {phase === "playing" ? (
          <span className="ml-auto flex gap-2">
            {r.picked && q && r.picked !== q.answer ? (
              <>
                <Button size="sm" variant="ghost" className="gap-1.5 border font-bold" style={{ borderColor: "#ffe600", color: "#ffe600" }} onClick={compare} data-testid="ear-compare"><Volume2 className="h-3.5 w-3.5" /> Compare</Button>
                <Button size="sm" className="gap-1.5 font-bold" onClick={advance} data-testid="ear-next">Next <ArrowRight className="h-3.5 w-3.5" /></Button>
              </>
            ) : null}
            <Button size="sm" variant="ghost" className="gap-1.5 border font-bold" style={{ borderColor: NEON_BAD, color: NEON_BAD, boxShadow: `0 0 8px ${NEON_BAD}66` }} onClick={quit}><Square className="h-3 w-3" style={{ fill: NEON_BAD }} /> Stop</Button>
          </span>
        ) : null}
      </div>
    </section>
  );
}
