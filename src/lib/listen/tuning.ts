/**
 * Tuned Listen-mode thresholds for this device (Develop tab). The defaults in score.ts were set
 * on a simulated guitar; real recordings may call for different values. Tuned values are only
 * used by Listen when "Use in Listen" is switched on, and can be reset at any time.
 */
import { THRESHOLDS, type Thresholds } from "./score";

export type ThresholdKey = keyof Thresholds;

export interface ThresholdInfo {
  key: ThresholdKey;
  group: "Accuracy" | "Clarity" | "Ring-out" | "Level" | "Timing";
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/** Every threshold, in the order the Develop tab shows them, with plain-language help. */
export const THRESHOLD_INFO: ThresholdInfo[] = [
  { key: "heard", group: "Accuracy", label: "Note heard at", help: "A chord note this strong (or stronger) counts as played. Raise it if muted notes still show as heard; lower it if played notes show as missing.", min: 0.02, max: 0.3, step: 0.005, unit: "" },
  { key: "faint", group: "Accuracy", label: "Faint (can't tell) from", help: "Between this and 'Note heard' a note is 'too faint to tell' and not counted. Below it, the note is missing.", min: 0.005, max: 0.2, step: 0.005, unit: "" },
  { key: "wrong", group: "Accuracy", label: "Wrong note at", help: "A note that isn't in the chord this strong counts as a mistake. Lower it to catch more wrong notes; raise it if clean strums get flagged.", min: 0.05, max: 0.5, step: 0.005, unit: "" },
  { key: "maybeWrong", group: "Accuracy", label: "'Maybe wrong' from", help: "Between this and 'Wrong note' an extra note is shown with a ? and not counted.", min: 0.02, max: 0.4, step: 0.005, unit: "" },
  { key: "buzzRiseSome", group: "Clarity", label: "Some buzz at", help: "How far (dB) the hiss between the notes rises above the quiet room before it counts as buzz.", min: 1, max: 30, step: 0.5, unit: "dB" },
  { key: "buzzRiseStrong", group: "Clarity", label: "Strong buzz at", help: "Rise above the room (dB) that counts as strong buzz or rattle.", min: 2, max: 40, step: 0.5, unit: "dB" },
  { key: "buzzRelSome", group: "Clarity", label: "Some buzz (no room reading)", help: "Only used when the room wasn't quiet enough to measure: noise compared with the notes themselves (dB).", min: -70, max: -10, step: 1, unit: "dB" },
  { key: "buzzRelStrong", group: "Clarity", label: "Strong buzz (no room reading)", help: "As above, for strong buzz.", min: -70, max: -5, step: 1, unit: "dB" },
  { key: "deadNoteSeconds", group: "Ring-out", label: "Note died early under", help: "A note that fades within this many seconds (while the rest of the chord rings on) is reported as dead — usually a finger touching that string.", min: 0.2, max: 2, step: 0.05, unit: "s" },
  { key: "tooQuietDb", group: "Level", label: "Too quiet below", help: "Strums quieter than this (dBFS) aren't judged at all. Lower it for a quiet guitar or a far-away phone.", min: -70, max: -20, step: 1, unit: "dB" },
  { key: "timingGoodMs", group: "Timing", label: "'On the beat' within", help: "With the click or play-along: this close to the beat counts as on it.", min: 5, max: 100, step: 1, unit: "ms" },
  { key: "timingOkMs", group: "Timing", label: "Timing OK within", help: "Further off than this is marked early or late.", min: 10, max: 200, step: 1, unit: "ms" },
];

const KEY = "fretlab.thresholds.v1";

interface Stored {
  values: Partial<Thresholds>;
  useInListen: boolean;
}

/** Clamp to each slider's range and keep paired thresholds in order (faint ≤ heard, …). */
export function sanitize(values: Partial<Thresholds>): Thresholds {
  const t: Thresholds = { ...THRESHOLDS };
  for (const info of THRESHOLD_INFO) {
    const v = values[info.key];
    if (typeof v === "number" && Number.isFinite(v)) t[info.key] = Math.min(info.max, Math.max(info.min, v));
  }
  t.faint = Math.min(t.faint, t.heard);
  t.maybeWrong = Math.min(t.maybeWrong, t.wrong);
  t.buzzRiseSome = Math.min(t.buzzRiseSome, t.buzzRiseStrong);
  t.buzzRelSome = Math.min(t.buzzRelSome, t.buzzRelStrong);
  t.timingGoodMs = Math.min(t.timingGoodMs, t.timingOkMs);
  return t;
}

export function loadTuning(): { values: Thresholds; useInListen: boolean } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      return { values: sanitize(s.values ?? {}), useInListen: !!s.useInListen };
    }
  } catch {
    /* storage unavailable or corrupt: defaults */
  }
  return { values: { ...THRESHOLDS }, useInListen: false };
}

export function saveTuning(values: Thresholds, useInListen: boolean) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ values: sanitize(values), useInListen } satisfies Stored));
  } catch {
    /* storage unavailable */
  }
}

/** The thresholds Listen mode should use on this device. */
export function activeThresholds(): Thresholds {
  if (typeof window === "undefined") return THRESHOLDS;
  const t = loadTuning();
  return t.useInListen ? t.values : THRESHOLDS;
}

/** Keys whose value differs from the default. */
export const changedKeys = (t: Thresholds) => THRESHOLD_INFO.filter((i) => Math.abs(t[i.key] - THRESHOLDS[i.key]) > 1e-9).map((i) => i.key);
