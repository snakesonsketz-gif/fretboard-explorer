import { useCallback, useEffect, useRef, useState } from "react";
import { setRecording } from "@/lib/audioSession";
import { engine } from "@/lib/engine";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { dbfs } from "@/lib/listen/dsp";
import type { StrumReport, TargetChord } from "@/lib/listen/score";
import { ListenSession } from "@/lib/listen/session";
import { activeThresholds } from "@/lib/listen/tuning";

export interface HeardStrum {
  /** When it was played (seconds on the audio clock — compare with now()). */
  time: number;
  target: TargetChord;
  report: StrumReport;
}

/**
 * The microphone for games: Listen's strum finding and judging, live. `targetAt(time)` says which
 * chord a strum played at that moment was meant to be; each strum is reported once, as soon as
 * it can be judged (about half a second after it was played).
 */
export function useGameMic(targetAt: (time: number) => TargetChord | null, onStrum: (s: HeardStrum) => void) {
  const [state, setState] = useState<"off" | "starting" | "on">("off");
  const [error, setError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(-100);
  const cap = useRef<Capture | null>(null);
  const session = useRef<ListenSession | null>(null);
  const timer = useRef<number | null>(null);
  const seen = useRef(new Set<number>());
  const ctxRef = useRef<AudioContext | null>(null);
  const cb = useRef({ targetAt, onStrum });
  cb.current = { targetAt, onStrum };

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    cap.current?.stop();
    cap.current = null;
    session.current = null;
    setRecording(false);
    setState("off");
    setLevel(-100);
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    engine.unlock(); // inside the tap (iPhone)
    setRecording(true);
    setError(null);
    setState("starting");
    const ctx = await engine.audioContext();
    if (!ctx) {
      setError("unsupported");
      return stop();
    }
    if (ctx.state === "suspended") await ctx.resume();
    const c = await startCapture(ctx);
    if ("error" in c) {
      setError(c.error);
      return stop();
    }
    ctxRef.current = ctx;
    cap.current = c;
    seen.current = new Set();
    const s = new ListenSession(c, (t) => {
      const target = cb.current.targetAt(t);
      return target ? { target } : null;
    });
    s.thresholds = activeThresholds();
    session.current = s;
    timer.current = window.setInterval(() => {
      const ss = session.current, cc = cap.current;
      if (!ss || !cc) return;
      ss.tick();
      setLevel(dbfs(cc.level));
      for (const st of ss.strums)
        if (st.report && st.target && !seen.current.has(st.id)) {
          seen.current.add(st.id);
          cb.current.onStrum({ time: st.time, target: st.target, report: st.report });
        }
      if (ss.strums.length > 60) ss.strums.splice(0, ss.strums.length - 30);
    }, 80);
    setState("on");
  }, [stop]);

  /** Current time on the same clock as HeardStrum.time. */
  const now = useCallback(() => ctxRef.current?.currentTime ?? performance.now() / 1000, []);

  return { state, error, level, start, stop, now };
}
