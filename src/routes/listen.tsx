import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen — Fretlab" }] }),
  component: ListenPage,
});

function ListenPage() {
  return (
    <AppShell>
      <ComingSoon title="Listen mode">
        <p>Play chords into your microphone and get a breakdown of accuracy, clarity, ring-out and timing.</p>
        <p>Anything the app can't hear clearly is marked as unsure, never as a mistake. Audio stays on your device.</p>
      </ComingSoon>
    </AppShell>
  );
}
