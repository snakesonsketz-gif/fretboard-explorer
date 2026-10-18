import { useCallback, useEffect, useRef, useState } from "react";
import { setRecording } from "@/lib/audioSession";
import { engine } from "@/lib/engine";
import { startCapture, type Capture, type MicError } from "@/lib/listen/capture";
import { NoteGate } from "@/lib/tuner/gate";
import { detectPitch, windowFor } from "@/lib/tuner/pitch";
import { playRefTone, type ToneHandle } from "@/lib/tuner/refTone";
import { IN_TUNE_CENTS, Tracker, type Reading, type TunerMode } from "@/lib/tuner/tracker";
import { midiHz } from "@/lib/tuner/tunings";

/** How long a string must stay in tune to get its tick. */
const HOLD_IN_TUNE_S = 0.5;
/** Show the last reading this long after the note dies away. */
const KEEP_S = 1.5;
/** Chromatic mode listens from a low B on a 5-string bass (31 Hz) up past the guitar's top frets. */
const CHROMATIC_MIN_HZ = 27;
const CHROMATIC_MAX_HZ = 2100;

export interface TunerOptions {
  midis: number[];
  a4: number;
  /** Index of the string to tune against, or null to pick the nearest. */
  locked: number | null;
  flats: boolean;
  mode: TunerMode;
  /** Ignore voices and other sounds that aren't a plucked string. */
  pluckedOnly: boolean;
}

export type HearState = "idle" | "listening" | "note" | "voice";

/**
 * The live tuner: microphone in, steady readings out. Also plays reference tones, and pauses
 * listening while one sounds (so it doesn't tune itself to its own speaker).
 */
export function useTuner(o: TunerOptions) {
  const [state, setState] = useState<"off" | "starting" | "on">("off");
  const [error, setError] = useState<MicError | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [fresh, setFresh] = useState(false);
  const [level, setLevel] = useState(0);
  const [tuned, setTuned] = useState<number[]>([]);
  const [toneString, setToneString] = useState<number | null>(null);

  const cap = useRef<Capture | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const [hear, setHear] = useState<HearState>("idle");
  const tracker = useRef(new Tracker({ midis: o.midis, a4: o.a4, locked: o.locked, flats: o.flats, mode: o.mode }));
  const gate = useRef(new NoteGate({ pluckedOnly: o.pluckedOnly }));
  const lastAt = useRef(-1);
  const voiceAt = useRef(-10);
  const inTuneSince = useRef<{ string: number; t: number } | null>(null);
  const tone = useRef<ToneHandle | null>(null);
  const toneRef = useRef<number | null>(null);
  const opts = useRef(o);
  opts.current = o;

  // A new tuning, pitch or lock starts the readings (and the ticks) afresh.
  const key = `${o.midis.join(",")}|${o.a4}`;
  useEffect(() => {
    setTuned([]);
  }, [key]);
  useEffect(() => {
    tracker.current.opts = { midis: o.midis, a4: o.a4, locked: o.locked, flats: o.flats, mode: o.mode };
    tracker.current.reset();
    inTuneSince.current = null;
    setReading(null);
    setFresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for midis and a4
  }, [key, o.locked, o.flats, o.mode]);
  useEffect(() => {
    gate.current.opts = { pluckedOnly: o.pluckedOnly };
  }, [o.pluckedOnly]);

  const stopTone = useCallback(() => {
    tone.current?.stop();
    tone.current = null;
    setToneString(null);
  }, []);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    cap.current?.stop();
    cap.current = null;
    setRecording(false);
    setState("off");
    setLevel(0);
    setFresh(false);
    setHear("idle");
  }, []);
  useEffect(
    () => () => {
      stop();
      tone.current?.stop();
    },
    [stop],
  );

  const tick = useCallback(() => {
    const c = cap.current;
    const ctx = ctxRef.current;
    if (!c || !ctx) return;
    setLevel(c.level);
    const now = ctx.currentTime;
    const t = tone.current;
    if (t && now < t.until) return; // our own reference tone is playing
    if (t && now >= t.until) {
      tone.current = null;
      setToneString(null);
    }
    const { midis, a4, mode } = opts.current;
    const lowest = midiHz(Math.min(...midis), a4);
    const highest = midiHz(Math.max(...midis), a4);
    const minHz = mode === "chromatic" ? Math.min(CHROMATIC_MIN_HZ, lowest * 0.55) : Math.max(22, lowest * 0.55);
    const maxHz = mode === "chromatic" ? CHROMATIC_MAX_HZ : Math.min(2500, highest * 2.2);
    const n = windowFor(minHz / 0.6, c.sampleRate);
    const x = c.read(c.endFrame - n, c.endFrame);
    if (!x) return;
    let e = 0;
    for (let i = 0; i < x.length; i++) e += x[i]! * x[i]!;
    const db = 10 * Math.log10(e / x.length + 1e-12);
    const p = detectPitch(x, c.sampleRate, { minHz, maxHz, minLevel: 0.0005 });
    const verdict = gate.current.push({ t: now, db, hz: p?.hz ?? null, clarity: p?.clarity ?? 0 });
    if (verdict === "accept" && p) {
      const r = tracker.current.push(p);
      lastAt.current = now;
      setReading(r);
      setFresh(true);
      setHear("note");
      if (r.string >= 0 && Math.abs(r.cents) <= IN_TUNE_CENTS) {
        const s = inTuneSince.current;
        if (!s || s.string !== r.string) inTuneSince.current = { string: r.string, t: now };
        else if (now - s.t >= HOLD_IN_TUNE_S) setTuned((v) => (v.includes(r.string) ? v : [...v, r.string]));
      } else inTuneSince.current = null;
    } else if (verdict === "voice") {
      // A voice or other sound that isn't a string: drop the reading straight away.
      voiceAt.current = now;
      setFresh(false);
      setHear("voice");
      inTuneSince.current = null;
      tracker.current.reset();
    } else if (lastAt.current >= 0 && now - lastAt.current > KEEP_S) {
      setFresh(false);
      setHear(now - voiceAt.current < KEEP_S ? "voice" : "listening");
      inTuneSince.current = null;
      tracker.current.reset();
    } else if (lastAt.current < 0) setHear(now - voiceAt.current < KEEP_S ? "voice" : "listening");
  }, []);

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
    tracker.current.reset();
    gate.current = new NoteGate({ pluckedOnly: opts.current.pluckedOnly });
    lastAt.current = -1;
    setHear("listening");
    timer.current = window.setInterval(tick, 50);
    setState("on");
  }, [stop, tick]);

  /** Play (or with hold, toggle) the reference tone for a string. */
  const playString = useCallback(
    async (index: number, hold: boolean) => {
      const was = tone.current;
      stopTone();
      if (hold && was && toneRef.current === index) return; // tap again to stop a held tone
      engine.unlock();
      const ctx = await engine.audioContext();
      if (!ctx) return;
      const { midis, a4 } = opts.current;
      tone.current = playRefTone(ctx, midiHz(midis[index]!, a4), hold);
      toneRef.current = index;
      setToneString(index);
      // Readings resume once the tone has died away (or is stopped).
      tracker.current.reset();
      gate.current.reset();
    },
    [stopTone],
  );

  return { state, error, reading: fresh ? reading : null, lastReading: reading, level, hear, tuned, toneString, start, stop, playString, stopTone };
}
