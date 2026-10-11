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
import { preferPlayback } from "./audioSession";
import { loadSampleBuffer } from "./sampleStore";

type ToneNS = typeof import("tone");
type Trigger = (time: number, velocity: number, durationSec: number) => void;

/** The sound chords and notes are played with, everywhere in the app (one setting). */
export type Instrument = "guitar" | "piano" | "synth";
export const INSTRUMENTS: { id: Instrument; name: string }[] = [
  { id: "guitar", name: "Guitar" },
  { id: "piano", name: "Piano" },
  { id: "synth", name: "Synth pad" },
];
const INSTRUMENT_KEY = "fretlab.instrument.v1";
/** Piano samples (Salamander Grand Piano, CC BY 3.0 — see public/samples/piano/CREDITS.txt), a tritone apart. */
const PIANO_URLS: Record<string, string> = Object.fromEntries(
  [2, 3, 4, 5, 6].flatMap((o) => [[`C${o}`, `C${o}.mp3`], [`F#${o}`, `Fs${o}.mp3`]]),
);

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
  private native: AudioContext | null = null;
  private unlocked = false;
  private initP: Promise<ToneNS> | null = null;
  private chordsMuted = false;
  private clickMuted = false;
  /** Everything chord/note-shaped goes through here (muted for Listen play-along). */
  private chordBus: InstanceType<ToneNS["Volume"]> | null = null;
  private guitarIn: GainNode | null = null;
  private plucks = new Set<{ g: GainNode; oscs: OscillatorNode[] }>();
  private piano: InstanceType<ToneNS["Sampler"]> | null = null;
  private instrument: Instrument = "guitar";
  private instrumentListeners = new Set<() => void>();
  playing = false;

  constructor() {
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(INSTRUMENT_KEY) : null;
      if (v && INSTRUMENTS.some((i) => i.id === v)) this.instrument = v as Instrument;
    } catch {
      /* storage unavailable: default */
    }
  }

  getInstrument(): Instrument {
    return this.instrument;
  }

  /** Choose the sound for chords and notes (remembered on this device). */
  setInstrument(i: Instrument) {
    this.instrument = i;
    try {
      window.localStorage.setItem(INSTRUMENT_KEY, i);
    } catch {
      /* not remembered: fine */
    }
    if (i === "piano") void this.init().then(() => this.loadPiano());
    this.instrumentListeners.forEach((f) => f());
  }

  /** For React's useSyncExternalStore. */
  subscribeInstrument = (f: () => void) => {
    this.instrumentListeners.add(f);
    return () => void this.instrumentListeners.delete(f);
  };

  /** True once the piano samples are ready (until then the guitar sound stands in). */
  pianoReady(): boolean {
    return !!this.piano?.loaded;
  }

  /** Fetch the sound library in the background, so the first tap plays without a wait. */
  preload() {
    if (typeof window !== "undefined") void loadTone().catch(() => undefined);
  }

  /** The AudioContext everything plays on (created on first use). */
  async audioContext(): Promise<AudioContext | null> {
    this.unlock();
    await this.init();
    return this.native;
  }

  /**
   * Start audio from inside a tap. iPhones only let sound start synchronously within the user's
   * gesture, and init() first awaits loading Tone.js — so every method that makes sound calls this
   * before its first await. Creates the AudioContext, resumes it and plays one silent sample.
   */
  unlock() {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    preferPlayback();
    if (!this.native) this.native = new AudioContext({ latencyHint: "interactive" });
    if (this.native.state !== "running") void this.native.resume().catch(() => undefined);
    if (!this.unlocked) {
      const src = this.native.createBufferSource();
      src.buffer = this.native.createBuffer(1, 1, this.native.sampleRate);
      src.connect(this.native.destination);
      src.start();
      this.unlocked = true;
    }
  }

  /** Keep the beat events (for timing) but make the click silent. */
  setClickMuted(muted: boolean) {
    this.clickMuted = muted;
    if (this.click) this.click.volume.value = muted ? -Infinity : -14;
  }

  /** Silence chords and notes (Listen play-along: so the mic hears you, not the app). */
  setChordsMuted(muted: boolean) {
    this.chordsMuted = muted;
    if (this.chordBus) this.chordBus.mute = muted;
  }

  init(): Promise<ToneNS> {
    // One shared start-up, however many callers arrive while Tone.js is still loading.
    this.initP ??= this.setup();
    return this.initP;
  }

  private async setup() {
    const T = await loadTone();
    // Own a plain AudioContext and hand it to Tone, so Listen mode can record the microphone on
    // exactly the same clock as the beats Tone schedules.
    if (typeof AudioContext !== "undefined" && !this.native) this.native = new AudioContext({ latencyHint: "interactive" });
    if (this.native) T.setContext(new T.Context(this.native));
    this.T = T;
    T.getContext().lookAhead = 0.06;
    T.getTransport().PPQ = PPQ;
    this.master = new T.Volume(-4).toDestination();
    this.chordBus = new T.Volume(0).connect(this.master);
    this.chordBus.mute = this.chordsMuted;
    const chordFilter = new T.Filter(3200, "lowpass").connect(this.chordBus);
    this.chordSynth = new T.PolySynth(T.Synth, {
      oscillator: { type: "fattriangle", count: 2, spread: 12 },
      envelope: { attack: 0.004, decay: 0.7, sustain: 0.28, release: 0.9 },
    }).connect(chordFilter);
    this.chordSynth.maxPolyphony = 48;
    this.chordSynth.volume.value = -9;
    if (this.native) {
      this.guitarIn = this.native.createGain();
      this.guitarIn.gain.value = 1.6;
      T.connect(this.guitarIn, this.chordBus);
    }
    if (this.instrument === "piano") this.loadPiano();
    this.click = new T.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 } }).connect(this.master);
    this.click.volume.value = this.clickMuted ? -Infinity : -14;
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
    this.unlock();
    const T = await this.init();
    await T.start();
    if (lane.sampleId) await this.useSample(lane.sampleId);
    this.laneTrigger(lane)(T.now(), velocity * lane.gain, 0.25);
  }

  /** Audition a chord right now. */
  async previewChord(midis: number[], strumMs = 18) {
    this.unlock();
    const T = await this.init();
    await T.start();
    this.playChord(midis, T.now(), 1.4, 0.8, strumMs);
  }

  /** Audition notes one after another (gap 0 = together), e.g. a scale or a single fret. */
  async previewNotes(midis: number[], gapSec: number, opts: { velocity?: number; delay?: number } = {}) {
    this.unlock();
    const T = await this.init();
    await T.start();
    const t0 = T.now() + (opts.delay ?? 0);
    const dur = Math.max(0.9, Math.min(1.6, gapSec * 3));
    midis.forEach((m, i) => this.note(m, t0 + i * gapSec, dur, opts.velocity ?? 0.75));
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
    this.unlock();
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
    this.piano?.releaseAll();
    this.silencePlucks();
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
    midis.forEach((m, i) => {
      const off = (i * strumMs) / 1000;
      this.note(m, time + off, Math.max(0.05, dur - off), velocity * (0.85 + 0.15 * (i / Math.max(1, midis.length - 1))));
    });
  }

  /** One note on the chosen instrument. */
  private note(midi: number, time: number, dur: number, velocity: number) {
    if (!this.T) return;
    const freq = 440 * 2 ** ((midi - 69) / 12);
    if (this.instrument === "synth" && this.chordSynth) this.chordSynth.triggerAttackRelease(freq, dur, time, velocity);
    else if (this.instrument === "piano" && this.piano?.loaded) this.piano.triggerAttackRelease(freq, Math.max(dur, 0.3), time, velocity);
    else this.pluck(freq, time, dur, velocity); // guitar (and the stand-in while the piano loads)
  }

  private loadPiano() {
    if (this.piano || !this.T || !this.chordBus) return;
    const T = this.T;
    this.piano = new T.Sampler({ urls: PIANO_URLS, baseUrl: "/samples/piano/", release: 1.2, onload: () => this.instrumentListeners.forEach((f) => f()) }).connect(this.chordBus);
    this.piano.volume.value = -3;
  }

  /** Plucked-string tone (two oscillators through a closing low-pass), as the fretboard always had. */
  private pluck(freq: number, time: number, dur: number, velocity: number) {
    const ac = this.native, out = this.guitarIn;
    if (!ac || !out) return;
    const t = Math.max(time, ac.currentTime);
    const ring = Math.max(0.9, Math.min(2.6, dur + 0.4));
    const osc = ac.createOscillator(), osc2 = ac.createOscillator();
    const g = ac.createGain(), filter = ac.createBiquadFilter();
    osc.type = "triangle";
    osc2.type = "sawtooth";
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 2.005;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(6000, freq * 8), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2), t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.22 * velocity), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(out);
    const voice = { g, oscs: [osc, osc2] };
    this.plucks.add(voice);
    osc.onended = () => {
      this.plucks.delete(voice);
      g.disconnect();
    };
    osc.start(t);
    osc2.start(t);
    osc.stop(t + ring + 0.05);
    osc2.stop(t + ring + 0.05);
  }

  private silencePlucks() {
    const ac = this.native;
    if (!ac) return;
    for (const v of this.plucks) {
      v.g.gain.cancelScheduledValues(ac.currentTime);
      v.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.02);
      v.oscs.forEach((o) => {
        try {
          o.stop(ac.currentTime + 0.12);
        } catch {
          /* already stopped */
        }
      });
    }
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
