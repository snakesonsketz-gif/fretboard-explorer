import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ear, Repeat, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChangeRace } from "@/components/games/ChangeRace";
import { ChordRush } from "@/components/games/ChordRush";
import { EarTrainer } from "@/components/games/EarTrainer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — Fretlab" }] }),
  component: PlayPage,
});

const GAMES = [
  { id: "rush", name: "Chord Rush", blurb: "Play the falling chord before it lands", icon: Zap },
  { id: "race", name: "Change Race", blurb: "Clean chord changes in one minute", icon: Repeat },
  { id: "ear", name: "Ear Trainer", blurb: "Hear it, name it — chords and intervals", icon: Ear },
] as const;

/** Games played on the real guitar: the microphone listens and judges every strum. */
function PlayPage() {
  const [game, setGame] = useState<(typeof GAMES)[number]["id"]>("rush");
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4">
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Games">
          {GAMES.map(({ id, name, blurb, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={game === id} onClick={() => setGame(id)} data-testid={`game-${id}`}
              className={cn("flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors sm:flex-row sm:gap-2 sm:p-3", game === id ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:border-primary/50")}>
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", game === id ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span className="block font-display text-sm font-black leading-tight sm:text-base">{name}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{blurb}</span>
              </span>
            </button>
          ))}
        </div>
        {game === "rush" ? <ChordRush /> : game === "race" ? <ChangeRace /> : <EarTrainer />}
        <p className="text-center text-xs text-muted-foreground">
          {game === "ear"
            ? "Train your ears: the app plays, you name it. Sing it back before you tap — it sticks faster."
            : "Your guitar is the controller — the microphone hears every strum. Only the notes count: every chord note there, nothing extra."}
        </p>
      </main>
    </AppShell>
  );
}
