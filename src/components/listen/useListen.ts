import { useCallback, useEffect, useRef, useState } from "react";
import { setRecording } from "@/lib/audioSession";
import { engine } from "@/lib/engine";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { dbfs, detectNotes, spectrumOf } from "@/lib/listen/dsp";
import type { TargetChord } from "@/lib/listen/score";
import { ListenSession, type Expectation, type Strum } from "@/lib/listen/session";
import { beatTicks, emptyArrangement, ticksToSeconds, type Arrangement, type ScheduledEvent } from "@/lib/timeline";

export type ListenMode = "check" | "click" | "along";

export interface StartOptions {
  mode: ListenMode;
  target: TargetChord | null;
  bpm: number;
  /** Strum on every Nth beat (click mode). */
  every: 1 | 2 | 4;
  clickSound: boolean;
  /** Play-along: the arrangement to play, and what of it to hear. */
  arrangement?: Arrangement;
  backingChords?: boolean;
  drums?: boolean;
}

export interface SessionSummary {
  id: string;
  at: number;
  mode: ListenMode;
  label: string;
  strums: number;
  accuracy: number | null;
  clarity: number | null;
  ringGoodPct: number | null;
  onTimePct: number | null;
  avgOffsetMs: number | null;
}

type Ev = { kind: ScheduledEvent["kind"]; time: number; tick: number; chordId?: string; accent?: boolean; countIn?: boolean; duration: number };

const LAT_KEY = "fretlab.latency.v1";
const HIST_KEY = "fretlab.listenhistory.v1";
const read = <T,>(k: string, d: T): T => {
  try {
    const v = window.localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function useListen() {
  const [state, setState] = useState<"idle" | "starting" | "on" | "calibrating">("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [strums, setStrums] = useState<Strum[]>([]);
  const [level, setLevel] = useState(-100);
  const [live, setLive] = useState<{ pcs: number[]; tuning: number } | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [calib, setCalib] = useState<{ found: number; need: number } | null>(null);

  const cap = useRef<Capture | null>(null);
  const session = useRef<ListenSession | null>(null);
  const events = useRef<Ev[]>([]);
  const timer = useRef<number | null>(null);
  const opts = useRef<StartOptions | null>(null);
  const tickCount = useRef(0);

  useEffect(() => {
    setLatencyMs(read<number | null>(LAT_KEY, null));
    setHistory(read<SessionSummary[]>(HIST_KEY, []));
    return () => stopAll();
  }, []);

  const clicks = () => events.current.filter((e) => e.kind === "click" && !e.countIn);

  /** What was this strum meant to be, and when was it due? (Reads refs, so it is never stale.) */
  const expect = (time: number): Expectation | null => {
    const o = opts.current;
    if (!o) return null;
    if (o.mode === "check") return o.target ? { target: o.target } : null;
    const arr = o.arrangement;
    const beat = arr ? ticksToSeconds(beatTicks(arr.ts), arr.bpm) : 60 / o.bpm;
    const cs = clicks().filter((c) => o.mode !== "click" || Math.round(c.tick / (o.arrangement ? beatTicks(o.arrangement.ts) : 480)) % o.every === 0);
    const near = cs.reduce<Ev | null>((b, c) => (!b || Math.abs(c.time - time) < Math.abs(b.time - time) ? c : b), null);
    const due = near && Math.abs(near.time - time) <= (beat * (o.mode === "click" ? o.every : 1)) / 2 ? near.time : undefined;
    if (o.mode === "click") return o.target ? { target: o.target, ...(due !== undefined ? { expectedTime: due } : {}) } : null;
    // Play along: the chord starting within 150 ms of the strum (an early change), else the one sounding.
    const chords = events.current.filter((e) => e.kind === "chord");
    const starting = chords.find((c) => Math.abs(c.time - time) <= 0.15);
    const sounding = starting ?? [...chords].reverse().find((c) => c.time <= time && time < c.time + ticksToSeconds(c.duration, arr!.bpm));
    const def = sounding && arr?.chords.find((c) => c.id === sounding.chordId);
    if (!def || !sounding) return null;
    const endTime = sounding.time + ticksToSeconds(sounding.duration, arr!.bpm);
    return {
      target: { rootName: def.rootName, degrees: def.degrees, label: def.label },
      ...(due !== undefined ? { expectedTime: due } : {}),
      expectedSeconds: Math.max(0.2, endTime - (due ?? time)),
    };
  };
  const expectRef = useRef(expect);
  expectRef.current = expect;

  const stopAll = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    engine.stop();
    engine.setChordsMuted(false);
    engine.setClickMuted(false);
    engine.setListener({});
    cap.current?.stop();
    cap.current = null;
    setRecording(false);
  };

  const tick = useCallback(() => {
    const s = session.current, c = cap.current;
    if (!s || !c) return;
    if (s.tick().length) setStrums(s.strums.slice(-200));
    const db = dbfs(c.level);
    setLevel(db);
    if (++tickCount.current % 2 === 0) {
      const w = db > -45 ? c.read(c.endFrame - 8192, c.endFrame) : null;
      if (w) {
        const d = detectNotes(spectrumOf(w, c.sampleRate), { minRelative: 0.2, maxNotes: 6 });
        setLive({ pcs: d.pcs, tuning: d.tuningCents });
      } else setLive(null);
    }
  }, []);

  const begin = async (o: StartOptions, calibrating = false) => {
    engine.unlock(); // must run inside the tap (iPhone)
    setRecording(true);
    setError(null);
    setState("starting");
    opts.current = o;
    events.current = [];
    tickCount.current = 0;
    const ctx = await engine.audioContext();
    if (!ctx) {
      setRecording(false);
      setError("unsupported");
      setState("idle");
      return;
    }
    if (ctx.state === "suspended") await ctx.resume();
    const c = await startCapture(ctx);
    if ("error" in c) {
      setRecording(false);
      setError(c.error);
      setState("idle");
      return;
    }
    cap.current = c;
    engine.setListener({
      onEvent: (e, time) => {
        events.current.push({ kind: e.kind, time, tick: e.tick, duration: e.duration, ...(e.kind === "chord" ? { chordId: e.chordId } : {}), ...(e.kind === "click" ? { accent: e.accent, countIn: e.countIn } : {}) });
        if (events.current.length > 600) events.current.splice(0, 200);
      },
    });
    const latency = calibrating ? 0 : (read<number | null>(LAT_KEY, null) ?? 0) / 1000;
    session.current = new ListenSession(c, (t) => expectRef.current(t), latency, (s, r) => {
      // The app's own click heard through the speakers: on a click, and gone almost at once.
      if (o.mode === "check") return false;
      const onClick = clicks().some((k) => Math.abs(s.time - k.time) < 0.03 + latency);
      return onClick && r.ringOut.seconds < 0.15;
    });
    setStrums([]);
    // Dev-only handle for automated browser tests (never in production builds).
    if (import.meta.env.DEV) (window as unknown as { __listen?: unknown }).__listen = { session: session.current, cap: c };
    if (o.mode !== "check") {
      const base = o.mode === "along" && o.arrangement ? o.arrangement : { ...emptyArrangement(), bpm: o.bpm, measures: 1, chords: [] };
      const arr: Arrangement = {
        ...base,
        metronome: true,
        loop: true,
        countIn: 1,
        drums: { ...base.drums, lanes: base.drums.lanes.map((l) => ({ ...l, muted: o.mode !== "along" || !o.drums ? true : l.muted })) },
      };
      engine.setClickMuted(!o.clickSound);
      engine.setChordsMuted(o.mode !== "along" || !o.backingChords);
      await engine.play(arr);
    }
    timer.current = window.setInterval(tick, 100);
    setState(calibrating ? "calibrating" : "on");
  };

  const stop = () => {
    const s = session.current;
    const o = opts.current;
    stopAll();
    setState("idle");
    setLevel(-100);
    setLive(null);
    const judged = (s?.strums ?? []).filter((x) => x.report);
    if (o && judged.length) {
      const offs = judged.map((x) => x.report!.timing.offsetMs).filter((v): v is number => v !== null);
      const summary: SessionSummary = {
        id: Math.random().toString(36).slice(2, 10),
        at: Date.now(),
        mode: o.mode,
        label: o.mode === "along" ? "Play along" : (o.target?.label ?? "—"),
        strums: judged.length,
        accuracy: avg(judged.map((x) => x.report!.accuracy.score).filter((v): v is number => v !== null)),
        clarity: avg(judged.map((x) => x.report!.clarity.score).filter((v): v is number => v !== null)),
        ringGoodPct: avg(judged.filter((x) => x.report!.ringOut.verdict !== "unsure").map((x) => (x.report!.ringOut.verdict === "good" ? 100 : 0))),
        onTimePct: offs.length ? (100 * offs.filter((v) => Math.abs(v) <= 60).length) / offs.length : null,
        avgOffsetMs: avg(offs),
      };
      const next = [summary, ...read<SessionSummary[]>(HIST_KEY, [])].slice(0, 60);
      write(HIST_KEY, next);
      setHistory(next);
    }
  };

  /** Strum (or tap the guitar body) on 8 clicks; the median delay is this device's latency. */
  const calibrate = async () => {
    setCalib({ found: 0, need: 8 });
    await begin({ mode: "click", target: null, bpm: 80, every: 1, clickSound: true }, true);
    const started = performance.now();
    const poll = window.setInterval(() => {
      const s = session.current;
      if (!s) return window.clearInterval(poll);
      const cs = clicks();
      const offs = s.strums
        .map((x) => cs.reduce<number | null>((b, c) => (b === null || Math.abs(x.time - c.time) < Math.abs(b) ? x.time - c.time : b), null))
        .filter((v): v is number => v !== null && v > -0.1 && v < 0.35);
      setCalib({ found: offs.length, need: 8 });
      if (offs.length >= 8 || performance.now() - started > 20000) {
        window.clearInterval(poll);
        stopAll();
        setState("idle");
        if (offs.length >= 5) {
          offs.sort((a, b) => a - b);
          const ms = Math.round(offs[Math.floor(offs.length / 2)]! * 1000);
          write(LAT_KEY, ms);
          setLatencyMs(ms);
        }
        setCalib(null);
      }
    }, 200);
  };

  const clearHistory = () => {
    write(HIST_KEY, []);
    setHistory([]);
  };

  return { state, error, strums, level, live, latencyMs, history, calib, start: (o: StartOptions) => void begin(o), stop, calibrate: () => void calibrate(), clearHistory, resetLatency: () => (write(LAT_KEY, null), setLatencyMs(null)) };
}
