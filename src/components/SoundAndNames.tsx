/**
 * Two app-wide switches in the header: how note names are written (as spelled, all sharps, all
 * flats) and mute for every sound in Fretlab.
 */
import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setAccidentals, useAccidentals, type Accidentals } from "@/lib/accidentals";
import { engine } from "@/lib/engine";
import { cn } from "@/lib/utils";

const NEXT: Record<Accidentals, Accidentals> = { auto: "sharps", sharps: "flats", flats: "auto" };
const LABEL: Record<Accidentals, string> = { auto: "♯/♭", sharps: "♯", flats: "♭" };
const TITLE: Record<Accidentals, string> = {
  auto: "Note names: spelled for the key (tap for all sharps)",
  sharps: "Note names: all sharps (tap for all flats)",
  flats: "Note names: all flats (tap to spell for the key)",
};

export function useMuted() {
  return useSyncExternalStore(
    (l) => engine.onMuteChange(l),
    () => engine.isMuted(),
    () => false,
  );
}

export function SoundAndNames() {
  const acc = useAccidentals();
  const muted = useMuted();
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setAccidentals(NEXT[acc])}
        title={TITLE[acc]}
        aria-label={TITLE[acc]}
        data-testid="accidentals"
        data-mode={acc}
        className={cn(
          "flex h-8 min-w-11 touch-manipulation items-center justify-center rounded-md border px-2 font-mono text-sm font-bold transition-colors",
          acc === "auto" ? "border-border text-muted-foreground hover:text-foreground" : "border-primary bg-primary/15 text-primary",
        )}
      >
        {LABEL[acc]}
      </button>
      <button
        type="button"
        onClick={() => engine.setMuted(!muted)}
        aria-pressed={muted}
        title={muted ? "Sound is off — tap to turn it on" : "Mute all sound"}
        aria-label={muted ? "Turn sound on" : "Mute all sound"}
        data-testid="mute"
        className={cn(
          "flex h-8 w-9 touch-manipulation items-center justify-center rounded-md border transition-colors",
          muted ? "border-third bg-third/15 text-third" : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
