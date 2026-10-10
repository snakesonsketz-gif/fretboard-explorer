/**
 * Playback engine: one Tone.js transport drives chords, drums, metronome and count-in, so
 * nothing can drift apart. Events come from scheduleArrangement() (the same list MIDI export
 * uses). Tone.js is loaded on first use, so it never weighs down the other pages, and nothing
 * here runs during server rendering.
 */
import {
  PPQ,
  arrangementTicks,
  measureTicks,
  scheduleArrangement,
  ticksToSeconds,
  type Arrangement,
  type DrumLane,
  type DrumVoice,
  type ScheduledEvent,
} from "./timeline";
import { loadSampleBuffer } from "./sampleStore";

type ToneNS = typeof import("tone");
type Trigger = (time: number, velocity: number, durationSec: number) => void;

let toneMod: ToneNS | null = null;
async function loadTone(): Promise<ToneNS> {
  if (!toneMod) toneMod = await import("tone");
  return toneMod;
}

export interface EngineListener {
  /** Chord now sounding (null in a rest / count-in / stopped). Fired on the audible beat. */
  onChord?: (chordId: string | null) => void;
  /** Playback stopped by itself (end of a non-looping arrangement). */
  onEnded?: () => void;
  /**
   * Every event at its exact scheduled audio-clock time (seconds, AudioContext.currentTime base).
   * Listen mode uses this to score timing against the real beat; tests use it to measure drift.
   */
  onEvent?: (e: ScheduledEvent, audioTime: number) => void;
}

class Engine {
  private T: ToneNS | null = null;
  private part: { start: (t: number) => void; dispose: () => void } | null = null;
  private chordSynth: InstanceType<ToneNS["PolySynth"]> | null = null;
  private click: InstanceType<ToneNS["Synth"]> | null = null;
  private master: InstanceType<ToneNS["Volume"]> | null = null;
  private lanes = new Map<string, { key: string; trigger: Trigger; dispose: () => void }>();
  private samples = new Map<string, AudioBuffer>();
  private arrangement: Arrangement | null = null;
  private countInTicks = 0;
  private endId: number | null = null;
  private listener: EngineListener = {};
  playing = false;

  async init() {
    if (this.T) return this.T;
    const T = await loadTone();
    this.T = T;
    T.getContext().lookAhead = 0.06;
    T.getTransport().PPQ = PPQ;
    this.master = new T.Volume(-4).toDestination();
    const chordFilter = new T.Filter(3200, "lowpass").connect(this.master);
    this.chordSynth = new T.PolySynth(T.Synth, {
      oscillator: { type: "fattriangle", count: 2, spread: 12 },
      envelope: { attack: 0.004, decay: 0.7, sustain: 0.28, release: 0.9 },
    }).connect(chordFilter);
    this.chordSynth.maxPolyphony = 48;
    this.chordSynth.volume.value = -9;
    this.click = new T.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 } }).connect(this.master);
    this.click.volume.value = -14;
    return T;
  }

  setListener(l: EngineListener) {
    this.listener = l;
  }

  /** Audible position in ticks from the first downbeat (negative during the count-in). */
  positionTicks(): number {
    if (!this.T || !this.playing) return 0;
    const tr = this.T.getTransport();
    return tr.getTicksAtTime(this.T.getContext().currentTime) - this.countInTicks;
  }

  setBpm(bpm: number) {
    if (this.T) this.T.getTransport().bpm.value = bpm;
  }

  /** Decode and cache a user sample so its lane can play it. */
  async useSample(sampleId: string) {
    if (this.samples.has(sampleId)) return;
    const T = await this.init();
    const buf = await loadSampleBuffer(sampleId, (data) => T.getContext().decodeAudioData(data));
    if (buf) this.samples.set(sampleId, buf);
  }

  /** Audition one drum lane right now (for the editor). */
  async previewLane(lane: DrumLane, velocity = 0.9) {
    const T = await this.init();
    await T.start();
    if (lane.sampleId) await this.useSample(lane.sampleId);
    this.laneTrigger(lane)(T.now(), velocity * lane.gain, 0.25);
  }

  /** Audition a chord right now. */
  async previewChord(midis: number[], strumMs = 18) {
    const T = await this.init();
    await T.start();
    this.playChord(midis, T.now(), 1.2, 0.8, strumMs);
  }

  /**
   * (Re)load the arrangement. Safe while playing: the transport keeps its position and only
   * the events are swapped, so edits are heard on the next pass of the playhead.
   */
  async load(a: Arrangement) {
    const T = await this.init();
    this.arrangement = a;
    for (const lane of a.drums.lanes) if (lane.sampleId) await this.useSample(lane.sampleId);
    const tr = T.getTransport();
    tr.bpm.value = a.bpm;
    tr.timeSignature = [a.ts.beats, a.ts.unit];
    if (!this.playing) this.countInTicks = a.countIn * measureTicks(a.ts);
    const offset = this.countInTicks;
    const len = arrangementTicks(a);
    const events = scheduleArrangement(a, { countIn: !this.playing || this.countInTicks > 0 });

    this.part?.dispose();
    const part = new T.Part<ScheduledEvent & { time: string }>((time, e) => this.fire(time, e), events.map((e) => ({ ...e, time: `${e.tick + offset}i` })));
    part.start(0);
    this.part = part;

    tr.loopStart = `${offset}i`;
    tr.loopEnd = `${offset + len}i`;
    tr.loop = a.loop;
    if (this.endId !== null) tr.clear(this.endId);
    this.endId = a.loop ? null : tr.scheduleOnce((time) => T.getDraw().schedule(() => this.finish(), time), `${offset + len}i`);
  }

  async play(a: Arrangement) {
    const T = await this.init();
    await T.start(); // browsers require a user gesture before audio; play is one
    this.stop();
    this.countInTicks = a.countIn * measureTicks(a.ts);
    await this.load(a);
    const tr = T.getTransport();
    tr.position = 0;
    this.playing = true;
    tr.start("+0.05");
  }

  stop() {
    if (!this.T) return;
    const tr = this.T.getTransport();
    tr.stop();
    tr.position = 0;
    this.chordSynth?.releaseAll();
    this.playing = false;
    this.listener.onChord?.(null);
  }

  private finish() {
    this.stop();
    this.listener.onEnded?.();
  }

  private fire(time: number, e: ScheduledEvent) {
    const a = this.arrangement;
    if (!a || !this.T) return;
    this.listener.onEvent?.(e, time);
    const dur = ticksToSeconds(e.duration, this.T.getTransport().bpm.value);
    if (e.kind === "click") {
      this.click?.triggerAttackRelease(e.accent ? "G6" : "C6", 0.03, time, e.accent ? 1 : 0.6);
    } else if (e.kind === "chord") {
      this.playChord(e.midis, time, dur, e.velocity, a.strumMs);
      const id = e.chordId;
      this.T.getDraw().schedule(() => this.listener.onChord?.(id), time);
      this.T.getDraw().schedule(() => {
        // Clear the highlight when the chord ends, unless another chord has started since.
        if (this.playing) this.listener.onChord?.(null);
      }, time + dur - 0.001);
    } else {
      const lane = a.drums.lanes.find((l) => l.id === e.laneId);
      if (lane) this.laneTrigger(lane)(time, e.velocity, dur);
    }
  }

  private playChord(midis: number[], time: number, dur: number, velocity: number, strumMs: number) {
    if (!this.T || !this.chordSynth) return;
    const T = this.T;
    midis.forEach((m, i) => {
      const off = (i * strumMs) / 1000;
      this.chordSynth!.triggerAttackRelease(T.Frequency(m, "midi").toFrequency(), Math.max(0.05, dur - off), time + off, velocity * (0.85 + 0.15 * (i / Math.max(1, midis.length - 1))));
    });
  }

  /** One instrument per lane (so lanes never cut each other off), rebuilt if its sound changes. */
  private laneTrigger(lane: DrumLane): Trigger {
    const key = `${lane.voice}|${lane.sampleId ?? ""}`;
    const have = this.lanes.get(lane.id);
    if (have && have.key === key) return have.trigger;
    have?.dispose();
    const made = lane.sampleId && this.samples.has(lane.sampleId) ? this.sampleVoice(this.samples.get(lane.sampleId)!) : this.synthVoice(lane.voice);
    this.lanes.set(lane.id, { key, ...made });
    return made.trigger;
  }

  private sampleVoice(buffer: AudioBuffer): { trigger: Trigger; dispose: () => void } {
    const T = this.T!;
    const out = new T.Gain(1).connect(this.master!);
    const tb = new T.ToneAudioBuffer(buffer);
    return {
      // A fresh one-shot source per hit, so overlapping hits ring out naturally.
      trigger: (time, velocity) => {
        const g = new T.Gain(velocity).connect(out);
        const src = new T.ToneBufferSource({ url: tb, onended: () => { src.dispose(); g.dispose(); } }).connect(g);
        src.start(time);
      },
      dispose: () => out.dispose(),
    };
  }

  private synthVoice(voice: DrumVoice): { trigger: Trigger; dispose: () => void } {
    const T = this.T!;
    const out = new T.Gain(1).connect(this.master!);
    const nodes: { dispose: () => void }[] = [out];
    const keep = <N extends { dispose: () => void }>(n: N) => (nodes.push(n), n);
    const dispose = () => nodes.forEach((n) => n.dispose());
    const membrane = (note: string, decay: number, octaves = 4, pitchDecay = 0.05) => {
      const s = keep(new T.MembraneSynth({ pitchDecay, octaves, envelope: { attack: 0.001, decay, sustain: 0, release: 0.05 } }).connect(out));
      return (time: number, v: number) => s.triggerAttackRelease(note, decay, time, v);
    };
    const noise = (filterHz: number, type: BiquadFilterType, decay: number, color: "white" | "pink" = "white") => {
      const f = keep(new T.Filter(filterHz, type).connect(out));
      const s = keep(new T.NoiseSynth({ noise: { type: color }, envelope: { attack: 0.001, decay, sustain: 0, release: 0.02 } }).connect(f));
      return (time: number, v: number) => s.triggerAttackRelease(decay, time, v);
    };
    const metal = (decay: number, freq: number, harmonicity = 5.1, vol = -18) => {
      const s = keep(new T.MetalSynth({ envelope: { attack: 0.001, decay, release: 0.01 }, harmonicity, modulationIndex: 32, resonance: 4200, octaves: 1.5 }).connect(out));
      s.volume.value = vol;
      s.frequency.value = freq;
      return (time: number, v: number) => s.triggerAttackRelease(freq, decay, time, v);
    };
    let trigger: Trigger;
    switch (voice) {
      case "kick": {
        const k = membrane("C1", 0.45, 6, 0.04);
        trigger = (t, v) => k(t, v);
        break;
      }
      case "snare": {
        const body = membrane("G2", 0.12, 2, 0.02);
        const wires = noise(1800, "highpass", 0.2);
        trigger = (t, v) => (body(t, v * 0.6), wires(t, v));
        break;
      }
      case "clap": {
        const n = noise(1200, "bandpass", 0.16, "pink");
        // A clap is a few fast bursts.
        trigger = (t, v) => [0, 0.011, 0.023].forEach((d, i) => n(t + d, v * (i === 2 ? 1 : 0.6)));
        break;
      }
      case "rim":
        trigger = membrane("E5", 0.04, 1.5, 0.008);
        break;
      case "lowTom":
        trigger = membrane("G2", 0.35, 2.5);
        break;
      case "highTom":
        trigger = membrane("D3", 0.3, 2.5);
        break;
      case "closedHat":
        trigger = metal(0.05, 250, 5.1, -20);
        break;
      case "openHat":
        trigger = metal(0.4, 250, 5.1, -22);
        break;
      case "crash":
        trigger = metal(1.4, 300, 5.4, -24);
        break;
      case "ride":
        trigger = metal(0.8, 420, 3.1, -26);
        break;
    }
    return { trigger, dispose };
  }
}

/** The one shared engine (one transport for the whole app). */
export const engine = new Engine();
