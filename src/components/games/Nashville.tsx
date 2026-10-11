import { useEffect, useRef, useState } from "react";
import { ArrowRight, Delete, Hash, Home, Play, Settings2, Square, Trophy, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { engine } from "@/lib/engine";
import { loadBests, saveBest } from "@/lib/games";
import { TIERS, tierIndex } from "@/lib/levels";
import {
  FLAVORS, KEYS, NUMBERS, TIER_SETUP, buildChord, cadence, chordName, choices, nashPoints, nashProgression, nashQuestion, voice,
  type FlavorId, type NashChord, type NashSetup,
} from "@/lib/nashville";
import { pretty } from "@/lib/theory";
import { useTabActive } from "@/lib/tabActive";
import { cn } from "@/lib/utils";
import { Stat } from "./ChordRush";
import { TierPicker, useRemembered, useTier } from "./TierPicker";
import { NEON_BAD, NEON_GOOD, NEON_INFO, neonCard, neonLane, neonOf, neonText } from "./neon";

const NUM_COLOR: Record<string, string> = {
  "1": "#39ff14", "2-": "#00e5ff", "3-": "#b44dff", "4": "#ffe600", "5": "#ff2bd6", "6-": "#ff7a00", "7°": "#ff1f5a",
  b3: "#00ffa3", b6: "#ff8cf0", b7: "#ccff00", "3": "#7df9ff", "2": "#18c8ff",
};
const numColor = (id: string) => NUM_COLOR[id] ?? neonOf(id);
const ROUND = 10;

type Phase = "ready" | "playing" | "over";
type Mode = "single" | "prog";
interface Q {
  key: string;
  chords: NashChord[];
}
interface Round {
  n: number;
  q: Q | null;
  /** Numbers tapped for this question (one, or four for a progression). */
  taps: string[];
  /** Single mode with "name the type": the flavour tapped. */
  flavor: FlavorId | null;
  done: boolean;
  score: number;
  streak: number;
  correct: number;
  recent: string[];
  marks: boolean[];
}
const fresh = (): Round => ({ n: 0, q: null, taps: [], flavor: null, done: false, score: 0, streak: 0, correct: 0, recent: [], marks: [] });

/** The chart symbol: the number big, its quality small and raised (2-7, 5⁹, b7, 1/3). */
function Sym({ c, size = "lg" }: { c: NashChord; size?: "lg" | "md" }) {
  const col = numColor(c.number);
  return (
    <span className={cn("font-display font-black leading-none", size === "lg" ? "text-6xl sm:text-7xl" : "text-3xl")} style={neonText(col)}>
      {c.num}
      {c.qual ? <sup className={cn("ml-0.5 align-super", size === "lg" ? "text-2xl sm:text-3xl" : "text-base")}>{c.qual}</sup> : null}
    </span>
  );
}

const SETUP_KEY = "fretlab.nash.setup.v1";
function loadSetup(tier: string): NashSetup | null {
  try {
    const all = JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? "{}") as Record<string, NashSetup>;
    const s = all[tier];
    return s && s.numbers?.length ? { numbers: s.numbers.filter((n) => NUMBERS[n]), flavors: s.flavors.filter((f) => FLAVORS.some((x) => x.id === f)) } : null;
  } catch {
    return null;
  }
}
function storeSetup(tier: string, s: NashSetup | null) {
  try {
    const all = JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? "{}") as Record<string, NashSetup>;
    if (s) all[tier] = s;
    else delete all[tier];
    window.localStorage.setItem(SETUP_KEY, JSON.stringify(all));
  } catch {
    /* not remembered */
  }
}

/**
 * Nashville Numbers: a random key, a 1-4-5-1 to hear home, then a mystery chord (or a four-chord
 * progression). Tap its number. Every chord comes from the key; higher levels add borrowed chords,
 * slash chords and flavours (7ths, 9ths, 11ths, 13ths, sus, add9, 6, 6/9) — all switchable.
 */
export function Nashville() {
  const [tier, setTier] = useTier("nash");
  const [mode, setMode] = useState<Mode>("single");
  const [nameType, setNameType] = useRemembered("fretlab.nash.nametype", false);
  const [keyChoice, setKeyChoice] = useState<string>("random");
  const [custom, setCustom] = useState<NashSetup | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const setup: NashSetup = custom ?? TIER_SETUP[tier];
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
  useEffect(() => setCustom(loadSetup(tier)), [tier]);
  useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), []);
  const bestKey = `nash:${tier}:${mode}`;
  const best = bests[bestKey] ?? 0;

  const editSetup = (s: NashSetup) => {
    const same = s.numbers.join() === TIER_SETUP[tier].numbers.join() && s.flavors.join() === TIER_SETUP[tier].flavors.join();
    setCustom(same ? null : s);
    storeSetup(tier, same ? null : s);
  };
  const toggleNum = (n: string) => {
    const has = setup.numbers.includes(n);
    if (has && setup.numbers.length <= 2) return;
    editSetup({ ...setup, numbers: has ? setup.numbers.filter((x) => x !== n) : Object.keys(NUMBERS).filter((x) => x === n || setup.numbers.includes(x)) });
  };
  const toggleFlavor = (f: FlavorId) => {
    const has = setup.flavors.includes(f);
    if (has && setup.flavors.length <= 1) return;
    editSetup({ ...setup, flavors: has ? setup.flavors.filter((x) => x !== f) : FLAVORS.map((x) => x.id).filter((x) => x === f || setup.flavors.includes(x)) });
  };

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  // Switching to another tab pauses the round: nothing plays while it's hidden.
  const tabActive = useTabActive();
  useEffect(() => {
    if (!tabActive) clearTimer();
  }, [tabActive]);

  /** The key-setting 1-4-5-1, then the mystery chord(s). */
  const play = (q: Q, withCadence = true) => {
    let t = 0;
    if (withCadence) {
      for (const m of cadence(q.key)) {
        void engine.previewNotes(m, 0.025, { velocity: 0.5, delay: t });
        t += 0.75;
      }
      t += 0.6;
    }
    for (const c of q.chords) {
      void engine.previewNotes(voice(q.key, c), 0.035, { velocity: 0.8, delay: t });
      t += 1.25;
    }
  };
  const playHome = (q: Q) => void engine.previewNotes(voice(q.key, buildChord("1", "triad")!), 0.03, { velocity: 0.7 });

  const ask = (prev: Round) => {
    const raw = mode === "prog" ? nashProgression(setup) : nashQuestion(setup, prev.recent.slice(-2));
    const q: Q = { key: keyChoice === "random" ? raw.key : keyChoice, chords: raw.chords };
    setR({ ...prev, n: prev.n + 1, q, taps: [], flavor: null, done: false, recent: [...prev.recent, q.chords[0]!.number].slice(-4) });
    play(q);
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
    setNewBest(saveBest(bestKey, fin.score));
    setBests(loadBests());
    setPhase("over");
  };
  const advance = () => {
    clearTimer();
    const cur = live.current;
    if (cur.n >= ROUND) finish(cur);
    else ask(cur);
  };

  const judge = (cur: Round, taps: string[], flavor: FlavorId | null) => {
    const q = cur.q!;
    const rightSlots = q.chords.map((c, i) => taps[i] === c.number);
    const allRight = rightSlots.every(Boolean);
    const flavorRight = mode === "single" && nameType && flavor === q.chords[0]!.flavor;
    const mult = 1 + Math.min(10, cur.streak) * 0.1;
    const gain = mode === "single" ? (allRight ? nashPoints(cur.streak, flavorRight) : 0) : Math.round((rightSlots.filter(Boolean).length * 50 + (allRight ? 100 : 0)) * mult);
    const streak = allRight ? cur.streak + 1 : 0;
    setR({ ...cur, taps, flavor, done: true, score: cur.score + gain, streak, correct: cur.correct + (allRight ? 1 : 0), marks: [...cur.marks, allRight] });
    const names = q.chords.map((c) => pretty(chordName(q.key, c))).join(" – ");
    if (mode === "single") {
      const c = q.chords[0]!;
      const fl = FLAVORS.find((f) => f.id === c.flavor)!.name;
      setLast(allRight
        ? { text: `${c.symbol} ✓ ${nameType ? (flavorRight ? `and ${fl} ✓ ` : `(it was a ${fl}) `) : ""}+${gain}${streak >= 3 ? ` · ${streak} in a row!` : ""}`, good: true, id: ++lastId.current }
        : { text: `That was the ${c.symbol} (${names} in ${pretty(q.key)}) — not ${taps[0]}`, good: false, id: ++lastId.current });
    } else {
      setLast(allRight
        ? { text: `All four ✓ ${q.chords.map((c) => c.symbol).join(" · ")} +${gain}`, good: true, id: ++lastId.current }
        : { text: `${rightSlots.filter(Boolean).length}/4 — it was ${q.chords.map((c) => c.symbol).join(" · ")} +${gain}`, good: false, id: ++lastId.current });
    }
    if (allRight && (!nameType || mode === "prog" || flavorRight)) timer.current = window.setTimeout(advance, 1600);
  };

  const tapNumber = (n: string) => {
    const cur = live.current;
    if (!cur.q || cur.done) return;
    const taps = [...cur.taps, n];
    const need = cur.q.chords.length;
    if (mode === "single" && nameType && n === cur.q.chords[0]!.number) {
      // Right number: now name the type.
      setR({ ...cur, taps });
      return;
    }
    if (taps.length >= need) judge(cur, taps, null);
    else setR({ ...cur, taps });
  };
  const tapFlavor = (f: FlavorId) => {
    const cur = live.current;
    if (!cur.q || cur.done || !cur.taps.length) return;
    judge(cur, cur.taps, f);
  };
  const undo = () => {
    const cur = live.current;
    if (cur.done || !cur.taps.length) return;
    setR({ ...cur, taps: cur.taps.slice(0, -1) });
  };

  const quit = () => {
    clearTimer();
    setPhase("ready");
    setR(fresh());
    setLast(null);
  };

  const q = r.q;
  const awaitingFlavor = phase === "playing" && mode === "single" && nameType && !!q && !r.done && r.taps.length === 1;
  const usable = choices(setup);
  const nextTier = TIERS[tierIndex(tier) + 1];

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Nashville Numbers">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-black">Nashville Numbers</h2>
        <span className="text-sm text-muted-foreground">Hear home, then name the chord by its number. Works in every key.</span>
      </div>

      {phase !== "playing" ? (
        <div className="space-y-2">
          <TierPicker value={tier} onChange={setTier} bests={Object.fromEntries(TIERS.map((t) => [t.id, bests[`nash:${t.id}:${mode}`] ?? 0]))}
            note={(t) => TIER_SETUP[t].numbers.length > 8 ? `${TIER_SETUP[t].numbers.length} numbers, ${TIER_SETUP[t].flavors.length} flavours` : TIER_SETUP[t].numbers.join(" ")} />
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Question type">
            {([["single", "One chord"], ["prog", "4-chord progression"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} data-testid={`nash-mode-${m}`}
                className="rounded-lg border-2 px-3 py-2 font-display text-sm font-black transition-transform active:scale-95"
                style={mode === m ? { ...neonCard(NEON_INFO), ...neonText(NEON_INFO) } : { borderColor: `${NEON_INFO}44`, background: "#0b0b16", color: NEON_INFO }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Key
              <Select value={keyChoice} onValueChange={setKeyChoice}>
                <SelectTrigger className="h-8 w-28" aria-label="Key" data-testid="nash-key"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  {KEYS.map((k) => <SelectItem key={k} value={k}>{pretty(k)} major</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {mode === "single" ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={nameType} onCheckedChange={setNameType} aria-label="Also name the chord type" data-testid="nash-nametype" /> Also name the chord type (+50)
              </label>
            ) : null}
            <InstrumentPicker />
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "#2a1f4d", background: "#0b0b16" }}>
            <button type="button" className="flex w-full items-center gap-2 text-left text-xs font-bold" style={{ color: NEON_INFO }} onClick={() => setShowSetup((v) => !v)} aria-expanded={showSetup} data-testid="nash-setup">
              <Settings2 className="h-3.5 w-3.5 shrink-0" /> Numbers &amp; chord types {custom ? <span style={{ color: "#ffe600" }}>· custom</span> : <span className="text-muted-foreground">· {TIERS[tierIndex(tier)]!.name} set</span>}
              <span className="ml-auto text-muted-foreground">{showSetup ? "hide" : "show"}</span>
            </button>
            {showSetup ? (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Numbers</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(NUMBERS).map((n) => {
                    const on = setup.numbers.includes(n.id), col = numColor(n.id);
                    return (
                      <button key={n.id} type="button" onClick={() => toggleNum(n.id)} title={n.about} aria-pressed={on} data-testid="nash-num-toggle"
                        className="rounded-md border-2 px-2 py-0.5 font-display text-sm font-black" style={on ? { borderColor: col, ...neonText(col), background: `${col}18` } : { borderColor: "#2a1f4d", color: "#6b6b85" }}>
                        {n.id}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Chord types (only used where they fit the key)</p>
                <div className="flex flex-wrap gap-1.5">
                  {FLAVORS.map((f) => {
                    const on = setup.flavors.includes(f.id);
                    return (
                      <button key={f.id} type="button" onClick={() => toggleFlavor(f.id)} title={f.about} aria-pressed={on} data-testid="nash-flavor-toggle"
                        className="rounded-md border-2 px-2 py-0.5 text-xs font-bold" style={on ? { borderColor: "#ff2bd6", ...neonText("#ff2bd6"), background: "#ff2bd618" } : { borderColor: "#2a1f4d", color: "#6b6b85" }}>
                        {f.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">{usable.length} different chords in play. {custom ? <button type="button" className="underline" onClick={() => editSetup(TIER_SETUP[tier])}>Back to the {TIERS[tierIndex(tier)]!.name} set</button> : null}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Question" value={`${r.n}/${ROUND}`} color={NEON_INFO} testId="nash-n" />
        <Stat label="Score" value={r.score} color={NEON_GOOD} testId="nash-score" />
        <Stat label="Streak" value={r.streak} color="#ffe600" />
        <Stat label="Best" value={best} color="#ff2bd6" />
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: ROUND }, (_, i) => {
          const m = r.marks[i];
          const c = m === true ? NEON_GOOD : m === false ? NEON_BAD : phase === "playing" && i === r.n - 1 ? NEON_INFO : null;
          return <span key={i} className={cn("h-1.5 flex-1 rounded-full bg-secondary", m === undefined && c && "animate-pulse")} style={c ? { background: c, boxShadow: `0 0 6px ${c}` } : undefined} />;
        })}
      </div>

      <div className="relative grid min-h-[22rem] place-items-center rounded-xl border-2 p-3 sm:p-4" style={{ ...neonLane, borderColor: "#2a1f4d" }} data-testid="nash-board">
        {phase === "ready" ? (
          <div className="space-y-3 text-center">
            <Hash className="mx-auto h-14 w-14" style={{ color: "#ffe600", filter: "drop-shadow(0 0 10px #ffe600)" }} />
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              You'll hear 1 – 4 – 5 – 1 to find home, then {mode === "prog" ? "four chords" : "one chord"}. Tap {mode === "prog" ? "their numbers in order" : "its number"}.
              Minor is a minus (2-), diminished is ° and borrowed chords get a flat (b7).
            </p>
            <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={start} data-testid="nash-start"><Play className="h-5 w-5" /> Start</Button>
          </div>
        ) : phase === "playing" && q ? (
          <div className="flex w-full flex-col items-center gap-3" data-testid="nash-question" data-answer={q.chords.map((c) => c.number).join(" ")}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => play(q)} aria-label="Play it again" data-testid="nash-replay"
                className="grid h-20 w-20 place-items-center rounded-full border-[3px] transition-transform active:scale-95" style={neonCard(NEON_INFO)}>
                <Volume2 className="h-9 w-9" style={{ color: NEON_INFO, filter: `drop-shadow(0 0 8px ${NEON_INFO})` }} />
              </button>
              <div className="flex flex-col gap-1.5">
                <span className="rounded-md border px-2 py-1 text-center text-xs font-bold" style={{ borderColor: "#ffe60088", ...neonText("#ffe600") }} data-testid="nash-keyname">Key of {pretty(q.key)}</span>
                <Button size="sm" variant="ghost" className="gap-1.5 border" style={{ borderColor: `${NEON_GOOD}88`, color: NEON_GOOD }} onClick={() => playHome(q)}><Home className="h-4 w-4" /> Hear the 1</Button>
                <Button size="sm" variant="ghost" className="gap-1.5 border" style={{ borderColor: `${NEON_INFO}88`, color: NEON_INFO }} onClick={() => play({ ...q }, false)}><Play className="h-3.5 w-3.5" /> Just the {mode === "prog" ? "chords" : "chord"}</Button>
              </div>
            </div>

            {/* the answer slots */}
            <div className="flex flex-wrap justify-center gap-1.5" data-testid="nash-slots">
              {q.chords.map((c, i) => {
                const t = r.taps[i];
                const right = r.done && t === c.number;
                const col = r.done ? (right ? NEON_GOOD : NEON_BAD) : t ? numColor(t) : "#2a1f4d";
                return (
                  <div key={i} className={cn("grid place-items-center rounded-xl border-2 px-2", mode === "prog" ? "h-20 min-w-[4rem]" : "h-28 min-w-[8rem]")} style={t || r.done ? neonCard(col, r.done) : { borderColor: "#2a1f4d", background: "#0b0b16" }}>
                    {r.done ? (
                      <span className="flex flex-col items-center">
                        <Sym c={c} size={mode === "prog" ? "md" : "lg"} />
                        <span className="mt-1 font-mono text-xs" style={{ color: "#e8e8f0" }}>{pretty(chordName(q.key, c))}</span>
                        {!right && t ? <span className="text-[10px] line-through" style={{ color: NEON_BAD }}>{t}</span> : null}
                      </span>
                    ) : (
                      <span className={cn("font-display font-black", mode === "prog" ? "text-3xl" : "text-6xl")} style={t ? neonText(numColor(t)) : { color: "#3a3a55" }}>{t ?? "?"}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {awaitingFlavor ? (
              <div className="w-full space-y-1.5 text-center" data-testid="nash-flavors">
                <p className="text-sm font-black" style={neonText(NEON_GOOD)}>Right number! Now — what type of chord?</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {setup.flavors.map((f) => (
                    <button key={f} type="button" onClick={() => tapFlavor(f)} data-testid="nash-flavor" data-id={f}
                      className="rounded-lg border-2 px-3 py-2 font-display text-sm font-black active:scale-95" style={{ ...neonCard("#ff2bd6", false), ...neonText("#ff2bd6") }}>
                      {FLAVORS.find((x) => x.id === f)!.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : !r.done ? (
              <div className={cn("grid w-full gap-2", setup.numbers.length <= 3 ? "grid-cols-3" : setup.numbers.length <= 8 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")} role="group" aria-label="Which number?">
                {setup.numbers.map((n) => {
                  const col = numColor(n);
                  return (
                    <button key={n} type="button" onClick={() => tapNumber(n)} data-testid="nash-num" data-id={n} title={NUMBERS[n]!.about}
                      className={cn("rounded-xl border-2 font-display font-black transition-transform active:scale-95", setup.numbers.length <= 3 ? "min-h-[5.5rem] text-5xl" : "min-h-[3.75rem] text-2xl sm:text-3xl")}
                      style={{ ...neonCard(col, false), ...neonText(col) }}>
                      {n}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 text-center" data-testid="nash-over">
            <p className="font-display text-5xl font-black" style={neonText(NEON_INFO)}>Round over!</p>
            <p className="text-lg"><b className="text-4xl" style={neonText(r.correct >= 8 ? NEON_GOOD : "#ffe600")} data-testid="nash-correct">{r.correct}/{ROUND}</b> right · <b style={neonText(NEON_GOOD)}>{r.score}</b> points</p>
            {newBest ? <p className="flex items-center justify-center gap-1.5 text-xl font-black" style={neonText("#ffe600")}><Trophy className="h-6 w-6" /> New best!</p> : <p className="text-sm text-muted-foreground">Best: {best}</p>}
            {r.correct >= 8 && nextTier ? <p className="text-lg font-black" style={neonText("#ff2bd6")}>Ready for {nextTier.name}!</p> : <p className="text-xs text-muted-foreground">Tip: sing the root of each chord, then count up the scale from home to find its number.</p>}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button size="lg" className="h-11 gap-2" onClick={start} data-testid="nash-again"><Zap className="h-4 w-4" /> Go again</Button>
              {r.correct >= 8 && nextTier ? (
                <Button size="lg" variant="ghost" className="h-11 gap-2 border font-bold" style={{ borderColor: "#ff2bd6", color: "#ff2bd6", boxShadow: "0 0 10px #ff2bd666" }} onClick={() => { setTier(nextTier.id); setPhase("ready"); setR(fresh()); setLast(null); }}>
                  Try {nextTier.name} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2">
        {last && phase === "playing" ? <p key={last.id} className="text-base font-black" style={neonText(last.good ? NEON_GOOD : NEON_BAD)} role="status" data-testid="nash-feedback">{last.text}</p> : null}
        {phase === "playing" ? (
          <span className="ml-auto flex gap-2">
            {!r.done && r.taps.length && mode === "prog" ? <Button size="sm" variant="ghost" className="gap-1.5 border" onClick={undo}><Delete className="h-3.5 w-3.5" /> Undo</Button> : null}
            {r.done ? <Button size="sm" className="gap-1.5 font-bold" onClick={advance} data-testid="nash-next">Next <ArrowRight className="h-3.5 w-3.5" /></Button> : null}
            <Button size="sm" variant="ghost" className="gap-1.5 border font-bold" style={{ borderColor: NEON_BAD, color: NEON_BAD, boxShadow: `0 0 8px ${NEON_BAD}66` }} onClick={quit}><Square className="h-3 w-3" style={{ fill: NEON_BAD }} /> Stop</Button>
          </span>
        ) : null}
      </div>
    </section>
  );
}
