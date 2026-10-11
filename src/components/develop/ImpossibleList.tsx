import { useEffect, useState } from "react";
import { Ban, Copy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { impossibleReport, loadImpossible, unmarkImpossible, type ImpossibleShape } from "@/lib/impossible";
import { pretty } from "@/lib/theory";
import { shapeToTab } from "@/lib/voicings";

/**
 * Develop tab: the shapes marked "Impossible chord" on Explore. They're hidden from suggestions on
 * this device; copy the list and send it so the shape finder can learn the rule behind them.
 */
export function ImpossibleList() {
  const [list, setList] = useState<ImpossibleShape[]>([]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setList(loadImpossible());
    load();
    window.addEventListener("fretlab-impossible", load);
    return () => window.removeEventListener("fretlab-impossible", load);
  }, []);
  const copy = async () => {
    const text = `Fretlab — impossible chord shapes (low E string first):\n${impossibleReport(list)}`;
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied — paste it into a message to send it.");
    } catch {
      setNote(text);
    }
  };
  return (
    <section className="panel space-y-2 p-3 sm:p-4" aria-label="Impossible chords" data-testid="impossible-list">
      <div className="flex flex-wrap items-center gap-2">
        <Ban className="h-4 w-4 text-red-400" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Impossible chords ({list.length})</h2>
        <Button size="sm" variant="secondary" className="ml-auto h-8 gap-1.5" disabled={!list.length} onClick={() => void copy()}><Copy className="h-3.5 w-3.5" /> Copy list</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Shapes you marked with <b>Impossible chord</b> on Explore (developer mode, under a picked shape). They're never suggested again on this phone.
        Copy the list and send it so the shape finder learns from them.
      </p>
      {note ? <p className="whitespace-pre-wrap rounded-md bg-secondary px-2 py-1 font-mono text-xs" role="status">{note}</p> : null}
      {list.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {list.map((x) => (
            <li key={`${x.tuningId}:${x.shape.join(",")}`} className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs">
              <span className="font-display font-bold">{pretty(x.chord)}</span>
              <span className="font-mono text-red-300">{shapeToTab(x.shape)}</span>
              <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setList(unmarkImpossible(x.shape, x.tuningId))} title="It's playable after all — suggest it again">
                <Undo2 className="h-3 w-3" /> Undo
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">None marked yet.</p>
      )}
    </section>
  );
}
