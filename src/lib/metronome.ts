/**
 * Simple click metronome. Timing is driven by setInterval; each tick schedules a
 * short WebAudio blip, which is accurate enough for practice use.
 */
import { preferPlayback } from "./audioSession";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  preferPlayback(); // iPhone: sound even with the ringer switch on silent
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function click(accent = false) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.2 : 0.12, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}
