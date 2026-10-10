import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/sequencer")({
  head: () => ({ meta: [{ title: "Sequencer — Fretlab" }] }),
  component: SequencerPage,
});

function SequencerPage() {
  return (
    <AppShell>
      <ComingSoon title="Chord & drum sequencer">
        <p>Place your saved chords on a timeline and build a drum groove under them, both locked to one clock.</p>
        <p>Tempo, time signature, measures, chord lengths, loop and count-in. Export to MIDI follows.</p>
      </ComingSoon>
    </AppShell>
  );
}
