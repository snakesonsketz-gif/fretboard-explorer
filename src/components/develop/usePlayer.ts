import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/lib/engine";
import { toFloat, type Take } from "@/lib/listen/takes";

export interface Player {
  /** Id of the take playing now, or null. */
  playingId: string | null;
  play: (take: Take, from?: number, seconds?: number) => void;
  stop: () => void;
  /** Seconds into the take that is playing now (for a playhead), or null. */
  position: (id: string) => number | null;
}

/** Plays recorded takes (one at a time) on the app's audio engine. */
export function usePlayer(): Player {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const node = useRef<AudioBufferSourceNode | null>(null);
  const timing = useRef<{ id: string; ctx: AudioContext; startedAt: number; from: number; until: number } | null>(null);

  const stop = useCallback(() => {
    try {
      node.current?.stop();
    } catch {
      /* already stopped */
    }
    node.current = null;
    timing.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    (take: Take, from = 0, seconds?: number) => {
      engine.unlock(); // inside the tap (iPhone)
      void (async () => {
        const ctx = await engine.audioContext();
        if (!ctx) return;
        try {
          node.current?.stop();
        } catch {
          /* already stopped */
        }
        const f = toFloat(take.pcm);
        const b = ctx.createBuffer(1, f.length, take.sampleRate);
        b.getChannelData(0).set(f);
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        const total = f.length / take.sampleRate;
        const until = seconds ? Math.min(total, from + seconds) : total;
        src.onended = () => {
          if (node.current === src) stop();
        };
        src.start(0, from, until - from);
        node.current = src;
        timing.current = { id: take.id, ctx, startedAt: ctx.currentTime, from, until };
        setPlayingId(take.id);
      })();
    },
    [stop],
  );

  const position = useCallback((id: string) => {
    const t = timing.current;
    if (!t || t.id !== id) return null;
    return Math.min(t.until, t.from + (t.ctx.currentTime - t.startedAt));
  }, []);

  return { playingId, play, stop, position };
}
