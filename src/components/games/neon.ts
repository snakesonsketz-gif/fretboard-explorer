import type { CSSProperties } from "react";

/** One neon colour per chord, so each chord is recognisable at a glance. */
const NEON: Record<string, string> = {
  G: "#39ff14", C: "#00e5ff", D: "#ff2bd6", Em: "#ffe600", Am: "#ff7a00", E: "#b44dff", A: "#ff1f5a",
  Dm: "#00ffa3", G7: "#7df9ff", A7: "#ff8cf0", F: "#ccff00", Bm: "#ff4d8d", B7: "#18c8ff", Cmaj7: "#ffb300",
};
export const NEON_GOOD = "#39ff14";
export const NEON_BAD = "#ff2b6d";
export const NEON_INFO = "#00e5ff";

export const neonOf = (chord: string) => NEON[chord] ?? "#00e5ff";

/** Glowing text in a neon colour. */
export const neonText = (c: string): CSSProperties => ({ color: c, textShadow: `0 0 6px ${c}, 0 0 18px ${c}, 0 0 36px ${c}99` });

/** A glowing neon card; also recolours chord-box dots (they use --primary). */
export const neonCard = (c: string, strong = true): CSSProperties =>
  ({
    borderColor: c,
    background: `linear-gradient(160deg, ${c}22, #0b0b16 70%)`,
    boxShadow: strong ? `0 0 14px ${c}, 0 0 44px ${c}77, inset 0 0 26px ${c}33` : `0 0 8px ${c}88`,
    "--primary": c,
  }) as CSSProperties;

/** The dark lane with a faint neon grid. */
export const neonLane: CSSProperties = {
  backgroundColor: "#07070f",
  backgroundImage:
    "linear-gradient(rgba(0,229,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,43,214,0.07) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};
