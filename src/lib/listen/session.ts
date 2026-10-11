/**
 * Live Listen session: fed audio as it arrives (a ring buffer on the playback clock), it finds
 * strums, judges each one once enough sound is in, finishes ring-out when the next strum comes
 * (or after a few seconds), and keeps a room-noise reference from quiet moments.
 * Pure logic over a read() source, so it is tested by streaming synthetic guitar through it.
 */
import { dbfs, hfFloor, detectOnsets, onsetLookahead, rms, spectrumOf } from "./dsp";
import { BUZZ_MIN_RING, THRESHOLDS, judgeStrum, measureStrum, type StrumMeasure, type StrumReport, type TargetChord, type Thresholds } from "./score";

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
  /** The raw measurements behind the report (re-judge with other thresholds: judgeStrum). */
  measure?: StrumMeasure;
  /** Ring-out is final (next strum arrived or MAX_RING passed). */
  final: boolean;
}

/** Seconds of audio needed after a strum to judge its notes (analysis starts 80 ms in, 16384 samples). */
// Enough audio for the note check (0.08 s + one 16384-sample window) and the buzz check (the
// strum ringing on its own for BUZZ_MIN_RING).
const analysisSeconds = (sr: number) => Math.max(0.08 + 16384 / sr, BUZZ_MIN_RING + 0.03);
const MAX_RING = 4;

export class ListenSession {
  strums: Strum[] = [];
  roomFloor: number | undefined;
  /**
   * Room noise is already known (a trimmed Develop take carries the reading from its quiet
   * lead-in): use roomFloor as given and don't re-estimate it.
   */
  lockRoom = false;
  /**
   * Count only sounds that ring like a strum (taps, clicks and knocks are ignored). Off for timing
   * calibration, where the player is asked to tap the guitar or strum muted strings.
   */
  strumsOnly = true;
  /** Ignore anything before this frame (e.g. the "stay quiet" lead-in of a Develop recording). */
  ignoreBefore = 0;
  /**
   * Seconds after a strum in which a new one must be clearly louder to count (see detectOnsets).
   * Listen keeps it short so quick strums count; Develop recordings never ask for more than two
   * strums a second, so they use a longer window that also keeps very slow strums from splitting.
   */
  mergeWindow: number | undefined = undefined;
  /** See OnsetOptions.minRise (guided steps where each strum rings out). */
  minRise: number | undefined = undefined;
  /** Thresholds used to judge strums (Develop tab can supply tuned ones). */
  thresholds: Thresholds = THRESHOLDS;
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

  /**
   * Process whatever audio has arrived. Returns strums that are new or changed.
   * `final`: the recording has stopped — finish every strum's ring-out with the audio there is.
   */
  tick(final = false): Strum[] {
    const sr = this.src.sampleRate;
    const end = this.src.endFrame;
    const first = this.src.firstFrame ?? 0;
    const changed = new Set<Strum>();
    // 1) New strums: scan with 0.15 s of context, reading all the audio there is, but decide only
    // on sounds that started at least a quarter second ago (unless the recording is over), so every
    // candidate is checked for ringing like a strum against the audio that follows it.
    // Never before the first captured frame (the clock may predate the microphone).
    const from = Math.max(first, this.scanned - Math.round(0.15 * sr), end - Math.round(MAX_RING * sr));
    const to = final ? end : end - Math.round((this.strumsOnly ? onsetLookahead(this.minRise) + 0.03 : 0.03) * sr);
    if (to - from > Math.round(0.1 * sr)) {
      const chunk = this.src.read(from, end);
      if (chunk) {
        const last = this.strums[this.strums.length - 1];
        const prev = this.strums.length ? this.strums[this.strums.length - 1]!.frame - from : undefined;
        for (const o of detectOnsets(chunk, sr, { strumsOnly: this.strumsOnly, atEnd: final, ...(prev !== undefined ? { prev } : {}), ...(this.mergeWindow !== undefined ? { mergeWindow: this.mergeWindow } : {}), ...(this.minRise !== undefined ? { minRise: this.minRise } : {}) })) {
          const frame = from + o;
          if (frame >= to) break; // too recent to judge yet: next pass
          if (frame < this.ignoreBefore) continue;
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
      const done = final || end >= ringEnd;
      // When the recording is over, a strum played just before the end still counts: it is judged
      // on the audio there is (the analysis windows are zero-padded).
      if ((!ready && !final) || (s.report && !done)) return;
      const stop = Math.min(end, ringEnd);
      const audio = this.src.read(s.frame - Math.round(0.05 * sr), stop);
      if (!audio) return void (s.final = true);
      const exp = this.expect(s.time - this.latency);
      const first = !s.report;
      s.measure = measureStrum({
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
      s.report = judgeStrum(s.measure, s.target, this.thresholds);
      s.final = done;
      if (first && this.ignore?.(s, s.report)) s.target = null;
      changed.add(s);
    });
    this.strums = this.strums.filter((s) => s.target !== null || !s.report);
    // 3) Room noise. First reference: the opening moment after Start (if the player is already
    // strumming it reads high, which only makes buzz *less* likely to be reported). Then refine
    // with any quiet moment: 0.6 s below -45 dBFS with no strum in the last 1.5 s.
    if (this.lockRoom) return [...changed];
    const opening = Math.max(this.startFrame, first);
    if (this.roomFloor === undefined && end - opening >= 16384) {
      const w = this.src.read(opening, opening + 16384);
      if (w) this.roomFloor = hfFloor(spectrumOf(w, sr));
    }
    const recent = this.src.read(end - Math.round(0.35 * sr), end);
    if (recent) {
      const quiet = dbfs(rms(recent)) < -45 && (!this.strums.length || end - this.strums[this.strums.length - 1]!.frame > 1.5 * sr);
      if (!quiet) this.quietSince = end;
      else if (end - this.quietSince > 0.6 * sr) {
        const w = this.src.read(end - 16384, end);
        if (w) this.roomFloor = this.roomFloor === undefined ? hfFloor(spectrumOf(w, sr)) : Math.min(this.roomFloor * 1.02, hfFloor(spectrumOf(w, sr)));
      }
    }
    return [...changed];
  }
}
