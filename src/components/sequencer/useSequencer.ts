import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/lib/engine";
import { loadSeqDraft, saveSeqDraft } from "@/lib/sequences";
import { drumsOnly, emptyArrangement, type Arrangement } from "@/lib/timeline";

/**
 * Sequencer state: the arrangement (auto-saved as a draft), undo, and the link to the one
 * shared playback engine. Edits made while playing are heard on the next pass of the playhead.
 */
export function useSequencer() {
  const [arr, setArrState] = useState<Arrangement>(() => emptyArrangement());
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  /** What is playing: the whole arrangement, or the drum pattern on its own. */
  const [playMode, setPlayMode] = useState<"all" | "drums">("all");
  const [currentChord, setCurrentChord] = useState<string | null>(null);
  const history = useRef<Arrangement[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const arrRef = useRef(arr);
  arrRef.current = arr;

  // Load the draft after mount (localStorage is browser-only; the server renders the default).
  useEffect(() => {
    const d = loadSeqDraft();
    if (d) setArrState(d);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveSeqDraft(arr);
  }, [arr, ready]);

  useEffect(() => {
    engine.setListener({ onChord: setCurrentChord, onEnded: () => setPlaying(false) });
    return () => {
      engine.stop();
      engine.setListener({});
    };
  }, []);

  // Swap events into the running transport when anything changes.
  useEffect(() => {
    if (playing) void engine.load(playMode === "drums" ? drumsOnly(arr) : arr);
  }, [arr, playing, playMode]);

  /** Record the current state so the next change can be undone. */
  const snapshot = useCallback(() => {
    history.current = [...history.current.slice(-79), arrRef.current];
    setCanUndo(true);
  }, []);
  /** Change without an undo step (used for live drags after one snapshot). */
  const set = useCallback((fn: (a: Arrangement) => Arrangement) => setArrState((a) => fn(a)), []);
  /** Change with an undo step. */
  const update = useCallback(
    (fn: (a: Arrangement) => Arrangement) => {
      snapshot();
      setArrState((a) => fn(a));
    },
    [snapshot],
  );
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setArrState(prev);
    setCanUndo(history.current.length > 0);
  }, []);

  const play = useCallback(async () => {
    setPlayMode("all");
    await engine.play(arrRef.current);
    setPlaying(true);
  }, []);
  /** Loop just the drum pattern (no chords, no count-in). */
  const playDrums = useCallback(async () => {
    setPlayMode("drums");
    await engine.play(drumsOnly(arrRef.current));
    setPlaying(true);
  }, []);
  const stop = useCallback(() => {
    engine.stop();
    setPlaying(false);
    setCurrentChord(null);
  }, []);
  const setBpm = useCallback(
    (bpm: number) => {
      engine.setBpm(bpm);
      set((a) => ({ ...a, bpm }));
    },
    [set],
  );

  return { arr, ready, playing, playMode, currentChord, canUndo, set, update, snapshot, undo, play, playDrums, stop, setBpm };
}

/** Calls `onFrame(ticks)` every animation frame while playing (for the playhead and counter). */
export function usePlayhead(playing: boolean, onFrame: (ticks: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!playing) {
      cb.current(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      cb.current(engine.positionTicks());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
