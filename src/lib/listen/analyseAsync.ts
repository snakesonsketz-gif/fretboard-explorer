/**
 * Analyse a take without blocking the page: in a background worker when the browser has one,
 * otherwise on the page after a short pause (one take at a time either way).
 */
import { safeAnalyse, type Take, type TakeStrum } from "./takes";

type Job = Pick<Take, "pcm" | "sampleRate" | "target" | "roomHf" | "step">;
type Result = { strums: TakeStrum[]; error?: string };

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, (r: Result) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./analyse.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number } & Result>) => {
      const done = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      done?.({ strums: e.data.strums, ...(e.data.error ? { error: e.data.error } : {}) });
    };
    worker.onerror = () => {
      // The worker couldn't run here: finish what was waiting on the page, and stop using it.
      worker?.terminate();
      worker = null;
      for (const [id, done] of waiting) {
        waiting.delete(id);
        done({ strums: [], error: "retry" });
      }
    };
  } catch {
    worker = null;
  }
  return worker;
}

const onPage = (take: Job) => new Promise<Result>((resolve) => window.setTimeout(() => resolve(safeAnalyse(take)), 50));

export async function analyseAsync(take: Job): Promise<Result> {
  const w = typeof Worker !== "undefined" ? getWorker() : null;
  if (!w) return onPage(take);
  const id = nextId++;
  const r = await new Promise<Result>((resolve) => {
    waiting.set(id, resolve);
    // A copy goes to the worker; the take keeps its own audio.
    w.postMessage({ id, take: { pcm: take.pcm, sampleRate: take.sampleRate, target: take.target, ...(take.roomHf !== undefined ? { roomHf: take.roomHf } : {}), ...(take.step ? { step: take.step } : {}) } });
  });
  return r.error === "retry" ? onPage(take) : r;
}
