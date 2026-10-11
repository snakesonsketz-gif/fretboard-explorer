/**
 * Quick note and chord sounds for the fretboard, scales and chord views. They all play on the
 * one shared engine (same audio clock and the same chosen instrument as the sequencer and the
 * song play-through). Each call starts audio inside the tap that triggered it (iPhone rule).
 */
import { engine } from "./engine";

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** One note (a fret tapped on the fretboard). */
export function pluck(midi: number, when = 0, gain = 0.22) {
  void engine.previewNotes([midi], 0, { velocity: Math.min(1, gain / 0.22) * 0.8, delay: when });
}

/** Notes one after another (a scale or arpeggio, a strummed shape). */
export function playSequence(midis: number[], stepSeconds = 0.28) {
  void engine.previewNotes(midis, stepSeconds, { velocity: 0.7 });
}

/** A chord, lightly strummed. */
export function playChord(midis: number[]) {
  void engine.previewChord(midis, 45);
}
