import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Play, Square, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { engine } from "@/lib/engine";
import { saveSample } from "@/lib/sampleStore";
import {
  DRUM_VOICES,
  audibleLanes,
  newId,
  patternSteps,
  resizePattern,
  stepTicks,
  type Arrangement,
  type DrumLane,
  type DrumVoice,
  GRIDS,
  gridName,
  type Grid,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { usePlayhead } from "./useSequencer";

type Tool = "hit" | "accent" | "soft" | "erase";
const VEL = { soft: 0.45, hit: 0.75, accent: 1 } as const;
const CELL = 26; // px per step
const LABEL_W = 132;

interface Props {
  arr: Arrangement;
  playing: boolean;
  /** Is the drum pattern playing on its own (vs the whole arrangement)? */
  drumsOnly?: boolean;
  onPlayDrums?: () => void;
  onStop?: () => void;
  set: (fn: (a: Arrangement) => Arrangement) => void;
  update: (fn: (a: Arrangement) => Arrangement) => void;
  snapshot: () => void;
}

export function DrumGrid({ arr, playing, drumsOnly = false, onPlayDrums, onStop, set, update, snapshot }: Props) {
  const p = arr.drums;
  const steps = patternSteps(arr.ts, p);
  const perBar = arr.ts.beats * p.stepsPerBeat;
  const [tool, setTool] = useState<Tool>("hit");
  const [addVoice, setAddVoice] = useState<DrumVoice>("crash");
  const [error, setError] = useState("");
  const paint = useRef<{ laneId: string; value: number | null } | null>(null);
  const head = useRef<HTMLDivElement>(null);
  const files = useRef<Record<string, HTMLInputElement | null>>({});
  const audible = new Set(audibleLanes(p).map((l) => l.id));

  usePlayhead(playing, (t) => {
    const el = head.current;
    if (!el) return;
    if (!playing || t < 0) return void (el.style.opacity = "0");
    const patLen = steps * stepTicks(arr.ts, p);
    const step = Math.floor((t % patLen) / stepTicks(arr.ts, p));
    el.style.opacity = "1";
    el.style.transform = `translateX(${step * CELL}px)`;
  });
  useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const setLane = (id: string, fn: (l: DrumLane) => DrumLane, undoable = true) =>
    (undoable ? update : set)((a) => ({ ...a, drums: { ...a.drums, lanes: a.drums.lanes.map((l) => (l.id === id ? fn(l) : l)) } }));
  const applyCell = (laneId: string, step: number, value: number | null) =>
    setLane(laneId, (l) => ({ ...l, hits: [...l.hits.filter((h) => h.step !== step), ...(value === null ? [] : [{ step, velocity: value }])].sort((x, y) => x.step - y.step) }), false);

  const onCellDown = (e: RPointerEvent, lane: DrumLane, step: number) => {
    const have = lane.hits.find((h) => h.step === step);
    const value =
      tool === "erase" ? null : tool === "hit" ? (have ? null : VEL.hit) : have?.velocity === VEL[tool] ? VEL.hit : VEL[tool];
    snapshot();
    paint.current = { laneId: lane.id, value };
    applyCell(lane.id, step, value);
    if (value !== null && !playing) void engine.previewLane(lane, value);
    if (e.pointerType === "mouse") e.preventDefault();
  };
  const onCellEnter = (lane: DrumLane, step: number) => {
    const pt = paint.current;
    if (pt && pt.laneId === lane.id) applyCell(lane.id, step, pt.value);
  };

  const setPattern = (patch: { measures?: number; stepsPerBeat?: Grid }) =>
    update((a) => ({ ...a, drums: resizePattern(a.drums, a.ts, patch) }));

  const loadSample = async (lane: DrumLane, file: File | undefined) => {
    setError("");
    if (!file) return;
    const res = await saveSample(file);
    if ("error" in res) return setError(res.error);
    await engine.useSample(res.id);
    setLane(lane.id, (l) => ({ ...l, sampleId: res.id, sampleName: res.name }));
    void engine.previewLane({ ...lane, sampleId: res.id });
  };

  const repeats = arr.measures / p.measures;
  const fit =
    p.measures > arr.measures
      ? `Longer than the ${arr.measures}-bar chord part: only the first ${arr.measures} bar${arr.measures > 1 ? "s" : ""} play.`
      : `Loops ${Number.isInteger(repeats) ? repeats : repeats.toFixed(1)}× under the ${arr.measures}-bar chord part.`;

  return (
    <section className="panel space-y-3 p-3 sm:p-4" aria-label="Drums">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Drums</h2>
        {onPlayDrums && onStop ? (
          playing && drumsOnly ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={onStop} aria-label="Stop drums" data-testid="drums-play">
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </Button>
          ) : (
            <Button size="sm" className="h-8 gap-1.5" onClick={onPlayDrums} aria-label="Play drums" data-testid="drums-play" title="Loop the drum pattern on its own">
              <Play className="h-3.5 w-3.5 fill-current" /> Play drums
            </Button>
          )
        ) : null}
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Pattern</span>
          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" disabled={p.measures <= 1} onClick={() => setPattern({ measures: p.measures - 1 })} aria-label="Shorter pattern">−</Button>
          <span className="w-14 text-center font-mono text-sm">{p.measures} bar{p.measures > 1 ? "s" : ""}</span>
          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" disabled={p.measures >= 16} onClick={() => setPattern({ measures: p.measures + 1 })} aria-label="Longer pattern">+</Button>
        </div>
        <Select value={String(p.stepsPerBeat)} onValueChange={(v) => setPattern({ stepsPerBeat: Number(v) as Grid })}>
          <SelectTrigger className="h-8 w-44" aria-label="Drum grid" data-testid="drum-grid-select"><SelectValue /></SelectTrigger>
          <SelectContent>{GRIDS.map((g) => <SelectItem key={g} value={String(g)}>{gridName(arr.ts, g)}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{fit}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Drum tool">
        <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">Tap to</span>
        {([["hit", "Hit"], ["accent", "Accent"], ["soft", "Soft"], ["erase", "Erase"]] as [Tool, string][]).map(([k, l]) => (
          <Button key={k} size="sm" role="radio" aria-checked={tool === k} variant={tool === k ? "default" : "secondary"} className="h-7 px-2.5 text-xs" onClick={() => setTool(k)}>
            {l}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 px-2 text-xs" onClick={() => update((a) => ({ ...a, drums: { ...a.drums, lanes: a.drums.lanes.map((l) => ({ ...l, hits: [] })) } }))}>
          <Trash2 className="h-3.5 w-3.5" /> Clear hits
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive-foreground" role="alert">{error}</p> : null}

      <div className="scrollbar-thin-x overflow-x-auto pb-1">
        <div className="relative" style={{ width: LABEL_W + steps * CELL }}>
          {/* beat numbers */}
          <div className="flex font-mono text-[10px] text-muted-foreground" aria-hidden>
            <div className="sticky left-0 z-10 shrink-0 bg-card" style={{ width: LABEL_W }} />
            {Array.from({ length: steps }, (_, s) => (
              <div key={s} className="shrink-0 text-center" style={{ width: CELL }}>
                {s % p.stepsPerBeat === 0 ? (s % perBar === 0 ? <b className="text-foreground">{s / perBar + 1}</b> : (s % perBar) / p.stepsPerBeat + 1) : ""}
              </div>
            ))}
          </div>
          {p.lanes.map((lane) => (
            <div key={lane.id} className={cn("flex items-center", !audible.has(lane.id) && "opacity-45")} data-testid="drum-lane" data-voice={lane.voice}>
              <div className="sticky left-0 z-10 flex shrink-0 items-center gap-0.5 bg-card py-0.5 pr-1" style={{ width: LABEL_W }}>
                <button type="button" className="min-w-0 flex-1 truncate rounded px-1 text-left text-xs font-semibold hover:bg-secondary" onClick={() => void engine.previewLane(lane)} title={lane.sampleName ? `Sample: ${lane.sampleName}` : "Tap to hear"}>
                  {lane.sampleName ? <span className="text-primary">{lane.sampleName}</span> : lane.name}
                </button>
                <button type="button" aria-pressed={lane.muted} onClick={() => setLane(lane.id, (l) => ({ ...l, muted: !l.muted }))} className={cn("h-5 w-5 rounded text-[10px] font-bold", lane.muted ? "bg-destructive text-foreground" : "bg-secondary text-muted-foreground")} title="Mute">M</button>
                <button type="button" aria-pressed={lane.solo} onClick={() => setLane(lane.id, (l) => ({ ...l, solo: !l.solo }))} className={cn("h-5 w-5 rounded text-[10px] font-bold", lane.solo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")} title="Solo">S</button>
              </div>
              <div className="flex">
                {Array.from({ length: steps }, (_, s) => {
                  const h = lane.hits.find((x) => x.step === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      data-step={s}
                      aria-label={`${lane.name} step ${s + 1}${h ? `, ${h.velocity >= 1 ? "accent" : h.velocity < 0.6 ? "soft" : "hit"}` : ""}`}
                      aria-pressed={!!h}
                      onPointerDown={(e) => onCellDown(e, lane, s)}
                      onPointerEnter={() => onCellEnter(lane, s)}
                      className={cn(
                        "grid h-7 shrink-0 place-items-center border-r border-border/40",
                        s % perBar === 0 ? "border-l-2 border-l-border" : s % p.stepsPerBeat === 0 && "border-l border-l-border/80",
                        Math.floor(s / p.stepsPerBeat) % 2 ? "bg-secondary/20" : "bg-secondary/45",
                      )}
                      style={{ width: CELL }}
                    >
                      {h ? (
                        <span
                          className={cn("block rounded-sm", h.velocity >= 1 ? "h-5 w-5 bg-primary ring-1 ring-foreground" : "h-4 w-4 bg-primary")}
                          style={{ opacity: h.velocity < 0.6 ? 0.45 : 1 }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={head} aria-hidden className="pointer-events-none absolute top-4 bottom-0 z-0 rounded-sm bg-foreground/15 opacity-0" style={{ left: LABEL_W, width: CELL }} />
        </div>
      </div>

      <details className="rounded-md border border-border/60 p-2 text-sm">
        <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">Lanes: volume, nudge, your own samples</summary>
        <div className="mt-2 space-y-2">
          {p.lanes.map((lane) => (
            <div key={lane.id} className="flex flex-wrap items-center gap-2">
              <span className="w-24 truncate text-xs font-semibold">{lane.name}</span>
              <Slider className="w-28" min={0} max={100} step={5} value={[Math.round(lane.gain * 100)]} onValueChange={(v) => setLane(lane.id, (l) => ({ ...l, gain: (v[0] ?? 90) / 100 }), false)} aria-label={`${lane.name} volume`} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${lane.name} hits earlier`} onClick={() => setLane(lane.id, (l) => ({ ...l, hits: l.hits.map((h) => ({ ...h, step: (h.step - 1 + steps) % steps })).sort((x, y) => x.step - y.step) }))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${lane.name} hits later`} onClick={() => setLane(lane.id, (l) => ({ ...l, hits: l.hits.map((h) => ({ ...h, step: (h.step + 1) % steps })).sort((x, y) => x.step - y.step) }))}><ChevronRight className="h-4 w-4" /></Button>
              <input ref={(el) => void (files.current[lane.id] = el)} type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac,.aif,.aiff" className="hidden" onChange={(e) => void loadSample(lane, e.target.files?.[0]).finally(() => (e.target.value = ""))} />
              <Button size="sm" variant="secondary" className="h-7 gap-1 px-2 text-xs" onClick={() => files.current[lane.id]?.click()}>
                <Upload className="h-3.5 w-3.5" /> {lane.sampleName ? "Replace sample" : "Your sample"}
              </Button>
              {lane.sampleId ? (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => setLane(lane.id, ({ sampleId: _s, sampleName: _n, ...l }) => l)}>
                  <X className="h-3.5 w-3.5" /> Built-in sound
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs text-muted-foreground" onClick={() => update((a) => ({ ...a, drums: { ...a.drums, lanes: a.drums.lanes.filter((l) => l.id !== lane.id) } }))} aria-label={`Remove ${lane.name} lane`}>
                Remove lane
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
            <Select value={addVoice} onValueChange={(v) => setAddVoice(v as DrumVoice)}>
              <SelectTrigger className="h-8 w-36" aria-label="Drum to add"><SelectValue /></SelectTrigger>
              <SelectContent>{DRUM_VOICES.map((v) => <SelectItem key={v.voice} value={v.voice}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="secondary" className="h-8" onClick={() => update((a) => ({ ...a, drums: { ...a.drums, lanes: [...a.drums.lanes, { id: newId(), voice: addVoice, name: DRUM_VOICES.find((v) => v.voice === addVoice)!.name, hits: [], muted: false, solo: false, gain: 0.9 }] } }))}>
              Add lane
            </Button>
            <span className="text-[11px] text-muted-foreground">Samples (WAV, MP3, OGG, M4A, FLAC, up to 8 MB) stay on this device.</span>
          </div>
        </div>
      </details>
    </section>
  );
}
