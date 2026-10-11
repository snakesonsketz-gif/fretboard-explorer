import { useEffect, useRef, useState } from "react";
import { setRecording } from "@/lib/audioSession";
import { engine } from "@/lib/engine";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { dbfs } from "@/lib/listen/dsp";
import { ListenSession } from "@/lib/listen/session";
import { appendDraft, startDraft } from "@/lib/listen/drafts";
import { isSpacedStep, SPACED_MIN_RISE, TAKE_MERGE_WINDOW, toPcm } from "@/lib/listen/takes";

/** How often the recording so far is written to the device (seconds). */
const DRAFT_EVERY = 2;

/** Longest take (the capture ring buffer holds 40 s); a 4-strum step takes about 15 s. */
export const MAX_SECONDS = 36;
/** Quiet lead-in so the take carries a room-noise reference, as in Listen. */
export const QUIET_SECONDS = 1;

/** Records one take from the microphone (same capture path as Listen mode). */
export function useRecorder() {
  const [state, setState] = useState<"idle" | "starting" | "quiet" | "recording">("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(-100);
  const [seconds, setSeconds] = useState(0);
  /** Strums heard so far (live count, same detector as Listen). */
  const [heard, setHeard] = useState(0);
  const counter = useRef<ListenSession | null>(null);
  const cap = useRef<Capture | null>(null);
  const timer = useRef<number | null>(null);
  const done = useRef<((r: { audio: Float32Array; sampleRate: number } | null) => void) | null>(null);
  // The recording so far, kept on the device as it goes (see lib/listen/drafts).
  const draft = useRef<{ on: boolean; saved: number; n: number; chain: Promise<void> }>({ on: false, saved: 0, n: 0, chain: Promise.resolve() });

  const cleanup = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    cap.current?.stop();
    cap.current = null;
    counter.current = null;
    draft.current.on = false;
    setRecording(false);
    setLevel(-100);
    setState("idle");
  };
  useEffect(() => () => cleanup(), []);

  /** Stop and hand back the audio (everything captured since Start). */
  const stop = () => {
    const c = cap.current;
    const out = c ? c.read(c.firstFrame, c.endFrame) : null;
    // The last stretch goes into the draft too, in case the page dies while the take is saved.
    const d = draft.current;
    if (c && d.saved < c.firstFrame) d.saved = c.firstFrame;
    if (c && d.on && c.endFrame > d.saved) {
      const rest = c.read(d.saved, c.endFrame);
      if (rest) {
        const n = d.n++, pcm = toPcm(rest);
        d.chain = d.chain.then(() => appendDraft(n, pcm)).catch(() => undefined);
      }
    }
    const sr = c?.sampleRate ?? 48000;
    cleanup();
    done.current?.(out && out.length > sr * 0.5 ? { audio: out, sampleRate: sr } : null);
    done.current = null;
  };

  /** Start recording; resolves with the take when stop() is called (or at MAX_SECONDS). */
  const start = (onDone: (r: { audio: Float32Array; sampleRate: number } | null) => void, opts: { step?: string; draft?: Record<string, unknown> } = {}) => {
    engine.unlock(); // inside the tap (iPhone)
    setRecording(true);
    setError(null);
    setHeard(0);
    setSeconds(0);
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
      // Keep the recording on the device as it goes, so a crash or reload can't lose it.
      draft.current = { on: true, saved: c.firstFrame, n: 0, chain: startDraft({ startedAt: Date.now(), sampleRate: c.sampleRate, ...(opts.step ? { step: opts.step } : {}), info: opts.draft ?? {} }).catch(() => undefined) };
      // Count strums as they come, without judging them (no target).
      counter.current = new ListenSession(c, () => null);
      counter.current.mergeWindow = TAKE_MERGE_WINDOW;
      if (isSpacedStep(opts.step)) counter.current.minRise = SPACED_MIN_RISE;
      setState("quiet");
      timer.current = window.setInterval(() => {
        const k = cap.current;
        if (!k) return;
        const secs = (k.endFrame - k.firstFrame) / k.sampleRate;
        setSeconds(secs);
        setLevel(dbfs(k.level));
        const n = counter.current;
        if (n) {
          // Same rules as the saved take (taps, clicks and the mic switching on aren't strums).
          n.tick();
          setHeard(n.strums.length);
        }
        if (secs >= QUIET_SECONDS) setState((s) => (s === "quiet" ? "recording" : s));
        const d = draft.current;
        // (The mic's first frame is only known once audio arrives.)
        if (d.saved < k.firstFrame) d.saved = k.firstFrame;
        if (d.on && k.endFrame - d.saved >= DRAFT_EVERY * k.sampleRate) {
          const chunk = k.read(d.saved, k.endFrame);
          if (chunk) {
            const n = d.n++;
            d.saved = k.endFrame;
            const pcm = toPcm(chunk);
            d.chain = d.chain.then(() => appendDraft(n, pcm)).catch(() => undefined);
          }
        }
        if (secs >= MAX_SECONDS) stop();
      }, 100);
    })();
  };

  return { state, error, level, seconds, heard, start, stop };
}
