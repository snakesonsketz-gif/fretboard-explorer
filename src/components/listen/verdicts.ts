import type { Verdict } from "@/lib/listen/score";

export const verdictClass: Record<Verdict, string> = {
  good: "border-extension/50 bg-extension/10",
  fix: "border-root/60 bg-root/10",
  unsure: "border-border bg-secondary/40",
};
export const verdictText: Record<Verdict, string> = { good: "Good", fix: "Work on it", unsure: "Unsure" };
