import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Mic, Square, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MIC_HELP } from "@/components/listen/micHelp";
import { TunerMeter } from "@/components/tuner/TunerMeter";
import { useTuner } from "@/components/tuner/useTuner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTabActive } from "@/lib/tabActive";
import { A4_MAX, A4_MIN, activeTuning, DEFAULT_SETTINGS, loadSettings, saveSettings, standardFor, type TunerSettings } from "@/lib/tuner/settings";
import { advice, zoneOf } from "@/lib/tuner/tracker";
import { FAVORITE_TUNINGS, GROUP_ORDER, INSTRUMENTS, midiHz, midiName, midiOctave, octaveName, stringsOf, tuningById, tuningsFor, type InstrumentId } from "@/lib/tuner/tunings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tuner")({
  head: () => ({ meta: [{ title: "Tuner — Fretlab" }] }),
  component: TunerPage,
});

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const ZONE_TEXT = { "in-tune": "text-extension", close: "text-primary", off: "text-third" } as const;

/** The guitar tuner: every popular tuning (Drop C one tap away), auto string detection, reference tones. */
export function TunerPage() {
  const [s, setS] = useState<TunerSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState<number | null>(null);
  useEffect(() => {
    setS(loadSettings());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveSettings(s);
  }, [s, loaded]);
  const update = (fn: (s: TunerSettings) => TunerSettings) => setS((v) => fn(v));

  const tuning = useMemo(() => activeTuning(s), [s]);
  const midisKey = tuning.strings.map((x) => x.midi).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable per tuning
  const midis = useMemo(() => tuning.strings.map((x) => x.midi), [midisKey]);
  const flats = tuning.strings.some((x) => x.name.includes("♭"));
  const std = useMemo(() => stringsOf(standardFor(s.instrument)).map((x) => x.midi), [s.instrument]);
  const changes = midis.length === std.length ? midis.map((m, i) => m - std[i]!) : midis.map(() => 0);
  const bigChange = changes.some((c) => Math.abs(c) >= 3);

  useEffect(() => setLocked(null), [midisKey, s.instrument]);
  const T = useTuner({ midis, a4: s.a4, locked, flats, mode: s.mode, pluckedOnly: s.ignoreVoices });

  // Leaving the tab turns the microphone and any tone off.
  const tabActive = useTabActive();
  useEffect(() => {
    if (!tabActive) {
      T.stop();
      T.stopTone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActive]);

  const r = T.reading;
  const zone = r ? zoneOf(r.cents) : null;
  const shownString = r && r.string >= 0 ? tuning.strings[r.string] : null;
  const listening = T.state !== "off";
  // What the needle is tuning to, with its octave: the heard note (chromatic), or the string.
  const target = r
    ? { midi: r.targetMidi, name: shownString && shownString.midi === r.targetMidi ? shownString.name : midiName(r.targetMidi, flats), octave: midiOctave(r.targetMidi) }
    : locked !== null
      ? { midi: tuning.strings[locked]!.midi, name: tuning.strings[locked]!.name, octave: tuning.strings[locked]!.octave }
      : null;

  const pickInstrument = (id: InstrumentId) => update((v) => ({ ...v, instrument: id }));
  const pickTuning = (id: string) =>
    update((v) => {
      if (id === "custom" && !v.custom[v.instrument]) return { ...v, tuning: { ...v.tuning, [v.instrument]: "custom" }, custom: { ...v.custom, [v.instrument]: [...midis] } };
      return { ...v, tuning: { ...v.tuning, [v.instrument]: id } };
    });
  const editCustom = (i: number, d: number) =>
    update((v) => {
      const cur = [...(v.custom[v.instrument] ?? midis)];
      cur[i] = Math.max(12, Math.min(96, cur[i]! + d));
      return { ...v, custom: { ...v.custom, [v.instrument]: cur } };
    });
  const copyToCustom = () => update((v) => ({ ...v, tuning: { ...v.tuning, [v.instrument]: "custom" }, custom: { ...v.custom, [v.instrument]: [...midis] } }));

  const onString = (i: number) => {
    setLocked((l) => (l === i ? null : i));
    void T.playString(i, s.hold);
  };

  const groups = GROUP_ORDER.map((g) => ({ g, items: tuningsFor(s.instrument).filter((t) => t.group === g) })).filter((x) => x.items.length);
  const favorites = s.instrument === "guitar" ? FAVORITE_TUNINGS.map((id) => tuningById(id)!).filter(Boolean) : [];

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-4" data-testid="tuner">
        {/* Instrument and tuning */}
        <section className="panel space-y-3 p-3 sm:p-4" aria-label="Tuning">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Instrument">
            {INSTRUMENTS.map((i) => (
              <Button
                key={i.id}
                size="sm"
                variant={s.instrument === i.id ? "default" : "secondary"}
                className="h-8 px-3 text-xs"
                role="radio"
                aria-checked={s.instrument === i.id}
                onClick={() => pickInstrument(i.id)}
                data-testid={`tuner-inst-${i.id}`}
              >
                {i.name}
              </Button>
            ))}
          </div>

          {favorites.length ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Popular tunings">
              {favorites.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTuning(t.id)}
                  aria-pressed={tuning.id === t.id}
                  data-testid={`tuner-fav-${t.id}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    tuning.id === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                    t.id === "drop-c" && tuning.id !== t.id && "border-primary/60 text-primary",
                  )}
                >
                  {t.name.replace(/ \(.*\)$/, "")}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-56 flex-1 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Tuning</span>
              <Select value={tuning.id} onValueChange={pickTuning}>
                <SelectTrigger className="h-10" data-testid="tuner-tuning-select" aria-label="Tuning">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {groups.map(({ g, items }) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{g}</SelectLabel>
                      {items.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} <span className="ml-1 font-mono text-xs text-muted-foreground">{octaveName(t)}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Yours</SelectLabel>
                    <SelectItem value="custom">Custom (set each string)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">A4 = {s.a4} <span className="normal-case">Hz</span></span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="secondary" className="h-10 w-9 p-0" disabled={s.a4 <= A4_MIN} onClick={() => update((v) => ({ ...v, a4: v.a4 - 1 }))} aria-label="Lower A4">−</Button>
                <Button size="sm" variant={s.a4 === 440 ? "default" : "secondary"} className="h-10 px-2 text-xs" onClick={() => update((v) => ({ ...v, a4: 440 }))} data-testid="tuner-a4">440</Button>
                <Button size="sm" variant="secondary" className="h-10 w-9 p-0" disabled={s.a4 >= A4_MAX} onClick={() => update((v) => ({ ...v, a4: v.a4 + 1 }))} aria-label="Raise A4">+</Button>
              </div>
            </div>
          </div>

          <div>
            <p className="font-display text-lg font-bold" data-testid="tuner-tuning-name">
              {tuning.name} <span className="ml-1 font-mono text-base text-primary">{tuning.strings.map((x) => `${x.name}${x.octave}`).join(" ")}</span>
            </p>
            {tuning.note ? <p className="text-xs text-muted-foreground">{tuning.note}</p> : null}
          </div>
        </section>

        {/* Meter */}
        <section className="panel flex flex-col items-center gap-2 p-4" aria-label="Tuner" aria-live="polite">
          <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="inline-flex rounded-lg bg-secondary/60 p-0.5" role="radiogroup" aria-label="Tuner mode">
              {(
                [
                  ["chromatic", "Chromatic"],
                  ["strings", "By string"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={s.mode === m}
                  onClick={() => update((v) => ({ ...v, mode: m }))}
                  className={cn("rounded-md px-3 py-1 text-xs font-semibold transition-colors", s.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  data-testid={`tuner-mode-${m}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={s.ignoreVoices} onCheckedChange={(v) => update((x) => ({ ...x, ignoreVoices: v }))} aria-label="Ignore voices and background noise" data-testid="tuner-ignore-voices" />
              Ignore voices &amp; noise
            </label>
            {s.instrument === "other" && s.ignoreVoices ? (
              <p className="w-full text-center text-[11px] text-primary">Tuning a bowed instrument (violin, cello)? Turn off “Ignore voices” — a bowed note doesn't fade like a plucked one.</p>
            ) : null}
          </div>
          <div className="text-center" data-testid="tuner-readout">
            <p className="h-5 text-xs uppercase tracking-widest text-muted-foreground">
              {r
                ? shownString
                  ? `${ordinal(shownString.number)} string${locked !== null ? " (locked)" : ""}`
                  : s.mode === "chromatic"
                    ? "Chromatic"
                    : "Not one of these strings"
                : locked !== null
                  ? `${ordinal(tuning.strings[locked]!.number)} string (locked)`
                  : listening
                    ? "Pluck one string"
                    : " "}
            </p>
            <p className={cn("font-display text-7xl font-black leading-none tabular-nums", zone ? ZONE_TEXT[zone] : "text-muted-foreground/40")} data-testid="tuner-note">
              {target ? target.name : "–"}
              <span className="ml-0.5 text-4xl font-black" data-testid="tuner-octave">
                {target ? target.octave : ""}
              </span>
            </p>
            <p className="mt-1 h-4 text-xs text-muted-foreground" data-testid="tuner-target">
              {target ? `Target ${target.name}${target.octave} · ${midiHz(target.midi, s.a4).toFixed(2)} Hz` : ""}
            </p>
          </div>
          <TunerMeter cents={r ? r.cents : null} active={!!r} />
          <p className={cn("min-h-6 text-center text-base font-semibold", zone ? ZONE_TEXT[zone] : "text-muted-foreground")} data-testid="tuner-advice">
            {r
              ? advice(r.cents)
              : T.toneString !== null
                ? `Reference tone: ${tuning.strings[T.toneString]!.name}${tuning.strings[T.toneString]!.octave}`
                : T.hear === "voice"
                  ? "Ignoring voices and held sounds — pluck a string"
                  : listening
                    ? "Listening… pluck a string"
                    : "Press Start and play a string"}
          </p>
          <p className="h-4 font-mono text-xs text-muted-foreground" data-testid="tuner-hz">
            {r ? `Hearing ${r.note.name}${r.note.octave} · ${r.hz.toFixed(1)} Hz · ${r.cents > 0 ? "+" : ""}${r.cents.toFixed(1)}¢` : ""}
          </p>
          <div className="flex items-center gap-3 pt-1">
            {listening ? (
              <Button size="lg" variant="secondary" className="gap-2" onClick={T.stop} data-testid="tuner-stop">
                <Square className="h-4 w-4 fill-current" /> Stop
              </Button>
            ) : (
              <Button size="lg" className="gap-2" onClick={() => void T.start()} data-testid="tuner-start">
                <Mic className="h-4 w-4" /> Start tuning
              </Button>
            )}
            <div className="h-2 w-24 overflow-hidden rounded-full bg-border" aria-hidden title="Microphone level">
              <div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${Math.min(100, Math.sqrt(T.level) * 260)}%` }} />
            </div>
          </div>
          {T.error ? <p className="max-w-md text-center text-sm text-third">{MIC_HELP[T.error]}</p> : null}
        </section>

        {/* Strings */}
        <section className="panel space-y-3 p-3 sm:p-4" aria-label="Strings">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Strings</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={s.hold} onCheckedChange={(v) => update((x) => ({ ...x, hold: v }))} aria-label="Hold reference tone" />
              Hold tone
            </label>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tuning.strings.length}, minmax(0, 1fr))` }}>
            {tuning.strings.map((x, i) => {
              const active = r?.string === i;
              const done = T.tuned.includes(i);
              const ch = changes[i]!;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onString(i)}
                  aria-pressed={locked === i}
                  aria-label={`${ordinal(x.number)} string ${x.name}${x.octave}${done ? ", in tune" : ""}${locked === i ? ", locked" : ""}`}
                  data-testid={`tuner-string-${x.number}`}
                  className={cn(
                    "relative flex flex-col items-center rounded-lg border px-1 py-2 transition-colors",
                    locked === i ? "border-primary bg-primary/15" : active ? "border-foreground/50 bg-card" : "border-border bg-card/50 hover:border-primary/50",
                    done && "border-extension/70",
                  )}
                >
                  <span className="text-[10px] text-muted-foreground">{x.number}</span>
                  <span className={cn("font-display text-xl font-black leading-tight", done ? "text-extension" : active && zone ? ZONE_TEXT[zone] : "")}>
                    {x.name}
                    <span className="text-sm font-bold">{x.octave}</span>
                  </span>
                  <span className={cn("h-3.5 text-[10px] font-semibold", ch < 0 ? "text-third" : "text-primary")} title={ch ? `${Math.abs(ch)} half step${Math.abs(ch) === 1 ? "" : "s"} ${ch < 0 ? "below" : "above"} standard` : undefined}>
                    {ch ? `${ch < 0 ? "↓" : "↑"}${Math.abs(ch)}` : done ? "✓" : ""}
                  </span>
                  {locked === i ? <Lock className="absolute right-1 top-1 h-3 w-3 text-primary" /> : null}
                  {T.toneString === i ? <Volume2 className="absolute left-1 top-1 h-3 w-3 text-primary" /> : null}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {locked !== null
              ? `Locked to the ${ordinal(tuning.strings[locked]!.number)} string — tap it again to go back to automatic.`
              : s.mode === "chromatic"
                ? "Tap a string to hear it and lock the tuner to it. Otherwise it shows whatever note you play, with its octave."
                : "Tap a string to hear it and lock the tuner to it. Otherwise it picks the string you play."}
            {bigChange && locked === null ? (
              <span className="mt-1 block text-primary">
                Big change from standard (↓/↑ = half steps). Tap each string while you retune it, so the tuner can't mistake it for its neighbour.
              </span>
            ) : null}
          </p>
          {T.tuned.length === tuning.strings.length ? <p className="text-sm font-semibold text-extension" data-testid="tuner-all-done">All strings in tune.</p> : null}
        </section>

        {/* Custom tuning */}
        <section className="panel space-y-2 p-3 sm:p-4" aria-label="Custom tuning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Custom tuning</h2>
            {!tuning.custom ? (
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={copyToCustom} data-testid="tuner-copy-custom">
                Start from {tuning.name.replace(/ \(.*\)$/, "")}
              </Button>
            ) : null}
          </div>
          {tuning.custom ? (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tuning.strings.length}, minmax(0, 1fr))` }}>
              {tuning.strings.map((x, i) => (
                <div key={i} className="flex flex-col items-center gap-1 rounded-lg border border-border p-1">
                  <Button size="sm" variant="secondary" className="h-7 w-full p-0" onClick={() => editCustom(i, 1)} aria-label={`Raise ${ordinal(x.number)} string`}>+</Button>
                  <span className="font-display text-sm font-bold">
                    {midiName(x.midi, flats)}
                    <span className="text-[10px] text-muted-foreground">{midiOctave(x.midi)}</span>
                  </span>
                  <Button size="sm" variant="secondary" className="h-7 w-full p-0" onClick={() => editCustom(i, -1)} aria-label={`Lower ${ordinal(x.number)} string`}>−</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Make your own: start from the tuning above, then raise or lower any string a half step at a time. It's kept on this device.</p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
