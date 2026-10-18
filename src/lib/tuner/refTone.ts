/**
 * Reference tones for tuning by ear: a plucked-string-like tone at the exact pitch (so it follows
 * the A4 setting, which the sampled guitar can't). Either one pluck, or held until stopped.
 */
export interface ToneHandle {
  stop(): void;
  /** When the tone will have died away (AudioContext time). */
  until: number;
}

export function playRefTone(ctx: AudioContext, hz: number, hold = false): ToneHandle {
  const t = ctx.currentTime + 0.01;
  const len = hold ? 600 : 2.6;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.32, t + 0.006);
  if (hold) out.gain.setTargetAtTime(0.16, t + 0.05, 0.4);
  else out.gain.setTargetAtTime(0, t + 0.04, 0.7);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7;
  // Bright at the pick, mellowing as it rings — but keep low strings audible on phone speakers.
  const top = Math.min(9000, Math.max(1800, hz * 14));
  lp.frequency.setValueAtTime(top, t);
  lp.frequency.setTargetAtTime(Math.max(900, hz * 4), t + 0.02, hold ? 0.6 : 0.35);
  lp.connect(out);
  out.connect(ctx.destination);
  const oscs: OscillatorNode[] = [];
  // A saw for the string's overtones plus a sine an octave up so a low C2 is still heard on a
  // small speaker (the ear fills in the fundamental).
  for (const [type, mult, gain] of [["sawtooth", 1, 0.55], ["sine", 1, 0.5], ["sine", 2, 0.25]] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz * mult;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g);
    g.connect(lp);
    o.start(t);
    o.stop(t + len);
    oscs.push(o);
  }
  let stopped = false;
  return {
    until: t + (hold ? len : 2.2),
    stop() {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + 0.06);
      for (const o of oscs) {
        try {
          o.stop(now + 0.08);
        } catch {
          /* already stopped */
        }
      }
    },
  };
}
