/// <reference lib="webworker" />
/**
 * Runs the take analysis off the page's main thread, so finishing a recording never freezes the
 * screen (an iPad killed and reloaded the page while it was busy analysing, Oct 2026).
 */
import { safeAnalyse, type Take } from "./takes";

self.onmessage = (e: MessageEvent<{ id: number; take: Pick<Take, "pcm" | "sampleRate" | "target" | "roomHf" | "step"> }>) => {
  const { id, take } = e.data;
  (self as unknown as Worker).postMessage({ id, ...safeAnalyse(take) });
};
