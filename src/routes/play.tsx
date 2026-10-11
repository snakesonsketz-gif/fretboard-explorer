import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Repeat, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChangeRace } from "@/components/games/ChangeRace";
import { ChordRush } from "@/components/games/ChordRush";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — Fretlab" }] }),
  component: PlayPage,
});

const GAMES = [
  { id: "rush", name: "Chord Rush", blurb: "Play the falling chord before it lands", icon: Zap },
  { id: "race", name: "Change Race", blurb: "Clean chord changes in one minute", icon: Repeat },
] as const;

/** Games played on the real guitar: the microphone listens and judges every strum. */
function PlayPage() {
  const [game, setGame] = useState<(typeof GAMES)[number]["id"]>("rush");
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Games">
          {GAMES.map(({ id, name, blurb, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={game === id} onClick={() => setGame(id)} data-testid={`game-${id}`}
              className={cn("flex items-start gap-2 rounded-lg border p-3 text-left transition-colors", game === id ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:border-primary/50")}>
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", game === id ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span className="block font-display font-black">{name}</span>
                <span className="block text-xs text-muted-foreground">{blurb}</span>
              </span>
            </button>
          ))}
        </div>
        {game === "rush" ? <ChordRush /> : <ChangeRace />}
        <p className="text-center text-xs text-muted-foreground">Your guitar is the controller — the microphone hears every strum. Only the notes count: every chord note there, nothing extra.</p>
      </main>
    </AppShell>
  );
}
