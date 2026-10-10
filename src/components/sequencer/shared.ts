import { rootByName } from "@/lib/theory";
import type { Grid } from "@/lib/timeline";

/** Chord colour by root, so harmonic movement is visible at a glance on the timeline. */
export const rootHue = (rootName: string) => (rootByName(rootName).pc * 30 + 40) % 360;

export const GRID_LABELS: Record<Grid, string> = { 1: "Beats", 2: "½ beats", 3: "Triplets", 4: "¼ beats" };
