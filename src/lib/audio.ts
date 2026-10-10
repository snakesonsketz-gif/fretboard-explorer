import { preferPlayback } from "./audioSession";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  preferPlayback(); // iPhone: sound even with the ringer switch on silent
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Pluck a soft synthetic guitar-ish tone. */
export function pluck(midi: number, when = 0, gain = 0.22) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + when;
  const freq = midiToFreq(midi);

  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();

  osc.type = "triangle";
  osc2.type = "sawtooth";
  osc.frequency.value = freq;
  osc2.frequency.value = freq * 2.005;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(6000, freq * 8), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2), t + 0.9);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 1.35);
  osc2.stop(t + 1.35);
}

export function playSequence(midis: number[], stepSeconds = 0.28) {
  midis.forEach((m, i) => pluck(m, i * stepSeconds, 0.18));
}

export function playChord(midis: number[]) {
  midis.forEach((m, i) => pluck(m, i * 0.045, 0.16));
}
