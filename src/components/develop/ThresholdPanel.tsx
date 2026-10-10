import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { THRESHOLDS, type Thresholds } from "@/lib/listen/score";
import { THRESHOLD_INFO, changedKeys, sanitize, type ThresholdInfo } from "@/lib/listen/tuning";
import { cn } from "@/lib/utils";

const fmt = (i: ThresholdInfo, v: number) => `${i.step < 0.01 ? v.toFixed(3) : i.step < 1 ? v.toFixed(2).replace(/0$/, "") : Math.round(v)}${i.unit ? ` ${i.unit}` : ""}`;

/** Sliders for every Listen threshold; changes re-score all takes immediately. */
export function ThresholdPanel({ values, onChange, useInListen, onUseInListen }: {
  values: Thresholds;
  onChange: (t: Thresholds) => void;
  useInListen: boolean;
  onUseInListen: (on: boolean) => void;
}) {
  const changed = new Set(changedKeys(values));
  const groups = [...new Set(THRESHOLD_INFO.map((i) => i.group))];
  return (
    <section className="panel space-y-4 p-3 sm:p-4" aria-label="Thresholds">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Thresholds</h2>
        <span className="text-xs text-muted-foreground" data-testid="changed-count">{changed.size ? `${changed.size} changed from the defaults` : "All at the defaults"}</span>
        <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1 text-xs" disabled={!changed.size} onClick={() => onChange({ ...THRESHOLDS })}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset all
        </Button>
      </div>
      <label className="flex items-start gap-3 rounded-md border border-border/70 bg-secondary/30 p-2.5 text-sm">
        <Switch checked={useInListen} onCheckedChange={onUseInListen} aria-label="Use these thresholds in Listen" className="mt-0.5" />
        <span>
          <span className="font-medium">Use these in Listen on this device</span>
          <span className="block text-xs text-muted-foreground">Off: Listen keeps the built-in defaults. Only this phone/browser is affected.</span>
        </span>
      </label>
      {groups.map((g) => (
        <div key={g} className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{g}</p>
          {THRESHOLD_INFO.filter((i) => i.group === g).map((i) => (
            <div key={i.key} className="space-y-1.5" data-testid={`threshold-${i.key}`}>
              <div className="flex items-baseline gap-2 text-sm">
                <span className={cn("font-medium", changed.has(i.key) && "text-primary")}>{i.label}</span>
                <span className="ml-auto font-mono tabular-nums" data-testid="threshold-value">{fmt(i, values[i.key])}</span>
                {changed.has(i.key) ? (
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange(sanitize({ ...values, [i.key]: THRESHOLDS[i.key] }))} title={`Back to the default (${fmt(i, THRESHOLDS[i.key])})`}>
                    default {fmt(i, THRESHOLDS[i.key])}
                  </button>
                ) : null}
              </div>
              <Slider min={i.min} max={i.max} step={i.step} value={[values[i.key]]} aria-label={i.label} onValueChange={(v) => onChange(sanitize({ ...values, [i.key]: v[0] ?? values[i.key] }))} />
              <p className="text-xs leading-snug text-muted-foreground">{i.help}</p>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
