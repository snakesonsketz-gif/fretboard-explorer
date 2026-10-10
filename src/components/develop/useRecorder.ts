import { useEffect, useRef, useState } from "react";
import { setRecording } from "@/lib/audioSession";
import { engine } from "@/lib/engine";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { dbfs } from "@/lib/listen/dsp";

/** Longest take (the capture ring buffer holds 40 s). */
export const MAX_SECONDS = 30;
/** Quiet lead-in so the take carries a room-noise reference, as in Listen. */
export const QUIET_SECONDS = 1;

/** Records one take from the microphone (same capture path as Listen mode). */
export function useRecorder() {
  const [state, setState] = useState<"idle" | "starting" | "quiet" | "recording">("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(-100);
  const [seconds, setSeconds] = useState(0);
  const cap = useRef<Capture | null>(null);
  const timer = useRef<number | null>(null);
  const done = useRef<((r: { audio: Float32Array; sampleRate: number } | null) => void) | null>(null);

  const cleanup = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    cap.current?.stop();
    cap.current = null;
    setRecording(false);
    setLevel(-100);
    setState("idle");
  };
  useEffect(() => () => cleanup(), []);

  /** Stop and hand back the audio (everything captured since Start). */
  const stop = () => {
    const c = cap.current;
    const out = c ? c.read(c.firstFrame, c.endFrame) : null;
    const sr = c?.sampleRate ?? 48000;
    cleanup();
    done.current?.(out && out.length > sr * 0.5 ? { audio: out, sampleRate: sr } : null);
    done.current = null;
  };

  /** Start recording; resolves with the take when stop() is called (or at MAX_SECONDS). */
  const start = (onDone: (r: { audio: Float32Array; sampleRate: number } | null) => void) => {
    engine.unlock(); // inside the tap (iPhone)
    setRecording(true);
    setError(null);
    setState("starting");
    done.current = onDone;
    void (async () => {
      const ctx = await engine.audioContext();
      if (!ctx) {
        setError("unsupported");
        return cleanup();
      }
      if (ctx.state === "suspended") await ctx.resume();
      const c = await startCapture(ctx);
      if ("error" in c) {
        setError(c.error);
        return cleanup();
      }
      cap.current = c;
      setState("quiet");
      timer.current = window.setInterval(() => {
        const k = cap.current;
        if (!k) return;
        const secs = (k.endFrame - k.firstFrame) / k.sampleRate;
        setSeconds(secs);
        setLevel(dbfs(k.level));
        if (secs >= QUIET_SECONDS) setState((s) => (s === "quiet" ? "recording" : s));
        if (secs >= MAX_SECONDS) stop();
      }, 100);
    })();
  };

  return { state, error, level, seconds, start, stop };
}
