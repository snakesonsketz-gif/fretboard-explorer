import { useSyncExternalStore } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTRUMENTS, engine, type Instrument } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** The instrument everything plays with (one setting for the whole app, remembered). */
export function useInstrument(): [Instrument, (i: Instrument) => void, boolean] {
  const inst = useSyncExternalStore(engine.subscribeInstrument, () => engine.getInstrument(), () => "guitar" as Instrument);
  const ready = useSyncExternalStore(engine.subscribeInstrument, () => engine.pianoReady(), () => false);
  return [inst, (i) => engine.setInstrument(i), inst !== "piano" || ready];
}

export function InstrumentPicker({ className }: { className?: string }) {
  const [inst, setInst, ready] = useInstrument();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">Sound</span>
      <Select value={inst} onValueChange={(v) => setInst(v as Instrument)}>
        <SelectTrigger className="h-8 w-32" aria-label="Instrument sound" data-testid="instrument">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INSTRUMENTS.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!ready ? <span className="text-[11px] text-muted-foreground" aria-live="polite">loading piano…</span> : null}
    </div>
  );
}
