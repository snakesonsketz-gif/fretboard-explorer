import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Gamepad2, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NEON_BAD, NEON_INFO, neonText } from "@/components/games/neon";

const KEY = "fretlab.welcome.games.v1";

/** A note from Tio Vix, shown when the app opens until Bradley taps a button. */
export function WelcomeNote() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) !== "seen") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);
  const close = (play: boolean) => {
    try {
      window.localStorage.setItem(KEY, "seen");
    } catch {
      /* shows again next time: fine */
    }
    setOpen(false);
    if (play) void navigate({ to: "/play" });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-2 text-center sm:rounded-2xl" style={{ background: "#0b0b16", borderColor: NEON_INFO, boxShadow: `0 0 18px ${NEON_INFO}, 0 0 48px ${NEON_INFO}55` }} data-testid="welcome-note">
        <Gamepad2 className="mx-auto h-12 w-12" style={{ color: NEON_INFO, filter: `drop-shadow(0 0 8px ${NEON_INFO})` }} aria-hidden />
        <DialogTitle className="font-display text-2xl font-black leading-snug" style={neonText(NEON_INFO)}>
          Life is too short to not have fun
        </DialogTitle>
        <DialogDescription className="text-base text-foreground">
          Here are a couple games I designed for you.
        </DialogDescription>
        <p className="flex items-center justify-center gap-1.5 font-display text-xl font-black" style={neonText(NEON_BAD)}>
          Love Tio Vix <Heart className="h-5 w-5" style={{ fill: NEON_BAD }} aria-hidden />
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Button size="lg" className="h-12 gap-2 text-base font-black" onClick={() => close(true)} data-testid="welcome-play">
            <Gamepad2 className="h-5 w-5" /> Let's play
          </Button>
          <Button variant="ghost" onClick={() => close(false)}>Later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
