import { rootByName } from "@/lib/theory";

/** Chord colour by root, so harmonic movement is visible at a glance on the timeline. */
export const rootHue = (rootName: string) => (rootByName(rootName).pc * 30 + 40) % 360;

