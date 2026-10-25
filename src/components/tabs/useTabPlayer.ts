/**
 * Plays a tab on the shared sound engine, at any speed (10%–200%), optionally looping. Notes are
 * scheduled a moment ahead on the audio clock, so the timing stays steady, and the speed can be
 * changed while it plays.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/lib/engine";
import { playEvents, type PlayEvent } from "@/lib/tabs/play";
import type { TabDoc } from "@/lib/tabs/model";

interface Run {
  events: PlayEvent[];
  idx: number;
  anchorPerf: number;
  anchorSong: number;
  end: number;
  timer: number;
  ui: number[];
}

export function useTabPlayer(doc: TabDoc) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [speed, setSpeedState] = useState(1);
  const [loop, setLoopState] = useState(false);
  const run = useRef<Run | null>(null);
  const speedRef = useRef(1);
  const loopRef = useRef(false);

  const songNow = (r: Run) => r.anchorSong + ((performance.now() - r.anchorPerf) / 1000) * speedRef.current;

  const stop = useCallback(() => {
    const r = run.current;
    if (r) {
      window.clearInterval(r.timer);
      r.ui.forEach((t) => window.clearTimeout(t));
    }
    run.current = null;
    setPlaying(null);
  }, []);

  const tick = useCallback(() => {
    const r = run.current;
    if (!r) return;
    const song = songNow(r);
    const sp = speedRef.current;
    while (r.idx < r.events.length && r.events[r.idx]!.at <= song + 0.25 * sp) {
      const e = r.events[r.idx]!;
      const delay = Math.max(0, (e.at - song) / sp);
      if (e.midis.length) void engine.previewNotes(e.strum < 0 ? [...e.midis].reverse() : e.midis, e.midis.length > 2 ? 0.018 : 0, { velocity: 0.75, delay });
      for (const x of e.extras) void engine.previewNotes([x.midi], 0, { velocity: x.vel, delay: Math.max(0, (x.at - song) / sp) });
      r.ui.push(window.setTimeout(() => setPlaying(e.col), delay * 1000));
      r.idx++;
    }
    if (r.ui.length > 64) r.ui = r.ui.slice(-32);
    if (r.idx >= r.events.length && song >= r.end) {
      if (loopRef.current) {
        r.idx = 0;
        r.anchorPerf = performance.now();
        r.anchorSong = 0;
      } else stop();
    }
  }, [stop]);

  /** Start from a column. Returns false when there's nothing to play. */
  const start = useCallback(
    (from = 0) => {
      stop();
      const events = playEvents(doc, from);
      if (!events.length) return false;
      engine.unlock();
      const last = events[events.length - 1]!;
      run.current = { events, idx: 0, anchorPerf: performance.now(), anchorSong: 0, end: last.at + Math.max(0.4, last.dur), timer: 0, ui: [] };
      tick();
      run.current.timer = window.setInterval(tick, 30);
      return true;
    },
    [doc, stop, tick],
  );

  const setSpeed = useCallback((v: number) => {
    const r = run.current;
    if (r) {
      // Re-anchor so the music carries on from where it is, at the new speed.
      r.anchorSong = songNow(r);
      r.anchorPerf = performance.now();
    }
    speedRef.current = v;
    setSpeedState(v);
  }, []);
  const setLoop = useCallback((v: boolean) => {
    loopRef.current = v;
    setLoopState(v);
  }, []);

  useEffect(() => stop, [stop]);
  return { playing, speed, setSpeed, loop, setLoop, start, stop, isPlaying: playing !== null || !!run.current };
}
