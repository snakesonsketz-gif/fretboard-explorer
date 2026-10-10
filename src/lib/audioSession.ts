/**
 * iPhone / iPad audio session (Safari 16.4+: navigator.audioSession).
 *
 * By default iOS treats web audio like a ringtone: the ringer switch on silent mutes it. Telling
 * Safari this is a "playback" app (like a music player) makes Fretlab audible with the switch on
 * silent. While Listen mode has the microphone open, the session must be "play-and-record".
 * Other browsers have no audioSession, so this is a no-op there.
 */
type SessionType = "playback" | "play-and-record";

let recording = false;

function apply(type: SessionType) {
  if (typeof navigator === "undefined") return;
  const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (!s) return;
  try {
    if (s.type !== type) s.type = type;
  } catch {
    /* value not supported on this version */
  }
}

/** Call before playing sound: plays even with the ringer switch on silent (unless recording). */
export function preferPlayback() {
  if (!recording) apply("playback");
}

/** Listen mode: open (true) or close (false) the microphone session. */
export function setRecording(on: boolean) {
  recording = on;
  apply(on ? "play-and-record" : "playback");
}
