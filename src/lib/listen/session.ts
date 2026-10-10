/**
 * Live Listen session: fed audio as it arrives (a ring buffer on the playback clock), it finds
 * strums, judges each one once enough sound is in, finishes ring-out when the next strum comes
 * (or after a few seconds), and keeps a room-noise reference from quiet moments.
 * Pure logic over a read() source, so it is tested by streaming synthetic guitar through it.
 */
import { bandFloor, dbfs, detectOnsets, rms, spectrumOf } from "./dsp";
import { analyseStrum, type StrumReport, type TargetChord } from "./score";

export interface AudioSource {
  sampleRate: number;
  readonly endFrame: number;
  /** First frame that holds captured audio (default 0). */
  readonly firstFrame?: number;
  read(from: number, to: number): Float32Array | null;
}

export interface Expectation {
  target: TargetChord;
  /** When this strum was due (seconds, same clock), for timing. */
  expectedTime?: number;
  /** How long this chord should ring (seconds), for ring-out. */
  expectedSeconds?: number;
}

export interface Strum {
  id: number;
  frame: number;
  time: number;
  target: TargetChord | null;
  expectedTime?: number;
  report?: StrumReport;
  /** Ring-out is final (next strum arrived or MAX_RING passed). */
  final: boolean;
}

/** Seconds of audio needed after a strum to judge its notes (analysis starts 80 ms in, 16384 samples). */
const analysisSeconds = (sr: number) => 0.08 + 16384 / sr;
const MAX_RING = 4;

export class ListenSession {
  strums: Strum[] = [];
  roomFloor: number | undefined;
  private scanned = 0;
  private nextId = 1;
  private quietSince = 0;
  private startFrame: number;

  constructor(
    private src: AudioSource,
    private expect: (time: number) => Expectation | null,
    /** Device round-trip latency (seconds), subtracted before scoring timing. */
    public latency = 0,
    /**
     * Drop a detection that isn't a strum — e.g. the app's own click picked up from the speakers
     * (lands on a click, dies away almost at once). Called once, with the first report.
     */
    private ignore?: (s: Strum, r: StrumReport) => boolean,
  ) {
    this.startFrame = src.endFrame;
  }

  /** Process whatever audio has arrived. Returns strums that are new or changed. */
  tick(): Strum[] {
    const sr = this.src.sampleRate;
    const end = this.src.endFrame;
    const first = this.src.firstFrame ?? 0;
    const changed = new Set<Strum>();
    // 1) New strums: scan with 0.15 s of context, leave 30 ms at the edge for the next pass.
    // Never before the first captured frame (the clock may predate the microphone).
    const from = Math.max(first, this.scanned - Math.round(0.15 * sr), end - Math.round(MAX_RING * sr));
    const to = end - Math.round(0.03 * sr);
    if (to - from > Math.round(0.1 * sr)) {
      const chunk = this.src.read(from, to);
      if (chunk) {
        const last = this.strums[this.strums.length - 1];
        for (const o of detectOnsets(chunk, sr)) {
          const frame = from + o;
          if (frame < this.scanned - Math.round(0.02 * sr) || (last && frame - last.frame < Math.round(0.1 * sr))) continue;
          if (this.strums.length && frame - this.strums[this.strums.length - 1]!.frame < Math.round(0.1 * sr)) continue;
          const time = frame / sr;
          const exp = this.expect(time - this.latency);
          const s: Strum = { id: this.nextId++, frame, time, target: exp?.target ?? null, ...(exp?.expectedTime !== undefined ? { expectedTime: exp.expectedTime } : {}), final: false };
          this.strums.push(s);
          changed.add(s);
        }
        this.scanned = to;
      }
    }
    // 2) Judge strums with enough audio; finish ring-out at the next strum or after MAX_RING.
    this.strums.forEach((s, i) => {
      if (s.final || !s.target) return;
      const next = this.strums[i + 1];
      const ringEnd = Math.min(next ? next.frame : Infinity, s.frame + Math.round(MAX_RING * sr));
      const ready = end >= s.frame + Math.round(analysisSeconds(sr) * sr);
      const done = end >= ringEnd;
      if (!ready || (s.report && !done)) return;
      const stop = Math.min(end, ringEnd);
      const audio = this.src.read(s.frame - Math.round(0.05 * sr), stop);
      if (!audio) return void (s.final = true);
      const exp = this.expect(s.time - this.latency);
      const first = !s.report;
      s.report = analyseStrum({
        audio,
        sr,
        onset: Math.round(0.05 * sr),
        end: audio.length,
        target: s.target,
        ...(this.roomFloor !== undefined ? { roomFloor: this.roomFloor } : {}),
        offsetMs: s.expectedTime !== undefined ? (s.time - this.latency - s.expectedTime) * 1000 : null,
        ...(exp?.expectedSeconds ? { expectedSeconds: exp.expectedSeconds } : {}),
        complete: done,
      });
      s.final = done;
      if (first && this.ignore?.(s, s.report)) s.target = null;
      changed.add(s);
    });
    this.strums = this.strums.filter((s) => s.target !== null || !s.report);
    // 3) Room noise. First reference: the opening moment after Start (if the player is already
    // strumming it reads high, which only makes buzz *less* likely to be reported). Then refine
    // with any quiet moment: 0.6 s below -45 dBFS with no strum in the last 1.5 s.
    const opening = Math.max(this.startFrame, first);
    if (this.roomFloor === undefined && end - opening >= 16384) {
      const w = this.src.read(opening, opening + 16384);
      if (w) this.roomFloor = bandFloor(spectrumOf(w, sr));
    }
    const recent = this.src.read(end - Math.round(0.35 * sr), end);
    if (recent) {
      const quiet = dbfs(rms(recent)) < -45 && (!this.strums.length || end - this.strums[this.strums.length - 1]!.frame > 1.5 * sr);
      if (!quiet) this.quietSince = end;
      else if (end - this.quietSince > 0.6 * sr) {
        const w = this.src.read(end - 16384, end);
        if (w) this.roomFloor = this.roomFloor === undefined ? bandFloor(spectrumOf(w, sr)) : Math.min(this.roomFloor * 1.02, bandFloor(spectrumOf(w, sr)));
      }
    }
    return [...changed];
  }
}
