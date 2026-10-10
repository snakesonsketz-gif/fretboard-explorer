/**
 * Microphone capture for Listen mode. Runs in the same AudioContext as the playback engine, so a
 * captured sample's time (frame / sampleRate) is on the same clock as the beats the engine
 * schedules — timing is measured against the real beat, not a separate timer.
 *
 * Browser voice processing (echo cancellation, noise suppression, auto gain) is switched off:
 * it is tuned for speech and smears or removes the parts of a guitar sound we measure.
 */
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; this.start = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.n === 0) this.start = currentFrame;
    this.buf.set(ch, this.n);
    this.n += ch.length;
    if (this.n >= this.buf.length) {
      this.port.postMessage({ frame: this.start, data: this.buf }, [this.buf.buffer]);
      this.buf = new Float32Array(2048);
      this.n = 0;
    }
    return true;
  }
}
registerProcessor("fretlab-tap", Tap);
`;

export type MicError = "denied" | "no-device" | "insecure" | "unsupported" | "other";

export interface Capture {
  sampleRate: number;
  /** Absolute frame index (AudioContext clock) of the newest captured sample + 1. */
  readonly endFrame: number;
  /** Copy of frames [from, to) if still buffered (null if overwritten or not yet captured). */
  read(from: number, to: number): Float32Array | null;
  /** RMS of the newest block (0..1). */
  readonly level: number;
  stop(): void;
}

const SECONDS = 40;

/** Start capturing from the microphone into a ring buffer on `ctx`'s clock. */
export async function startCapture(ctx: AudioContext): Promise<Capture | { error: MicError; detail?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return { error: window?.isSecureContext === false ? "insecure" : "unsupported" };
  if (!ctx.audioWorklet) return { error: "unsupported" };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
  } catch (e) {
    const name = (e as { name?: string }).name;
    return { error: name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "no-device" : "other", detail: String(e) };
  }
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "fretlab-tap", { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1, channelCountMode: "explicit" });
  src.connect(node);

  const size = Math.round(SECONDS * ctx.sampleRate);
  const ring = new Float32Array(size);
  let end = 0;
  let level = 0;
  node.port.onmessage = (ev: MessageEvent<{ frame: number; data: Float32Array }>) => {
    const { frame, data } = ev.data;
    for (let i = 0; i < data.length; i++) ring[(frame + i) % size] = data[i]!;
    end = frame + data.length;
    let s = 0;
    for (let i = 0; i < data.length; i++) s += data[i]! * data[i]!;
    level = Math.sqrt(s / data.length);
  };

  return {
    sampleRate: ctx.sampleRate,
    get endFrame() {
      return end;
    },
    get level() {
      return level;
    },
    read(from, to) {
      if (to > end || from < end - size || to <= from) return null;
      const out = new Float32Array(to - from);
      for (let i = 0; i < out.length; i++) out[i] = ring[(from + i) % size]!;
      return out;
    },
    stop() {
      node.port.onmessage = null;
      src.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
