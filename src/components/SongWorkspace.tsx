import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  CopyPlus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playChord } from "@/lib/audio";
import { engine } from "@/lib/engine";
import { beatTicks } from "@/lib/timeline";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { CopyPlus as Dup, ListOrdered, X } from "lucide-react";
import {
  ROOTS,
  degreeToSemitones,
  degreesToPitchClasses,
  harmonize,
  identify,
  pretty,
  rootByName,
  type Degree,
} from "@/lib/theory";
import {
  KEY_SCALES,
  SECTION_LABELS,
  analyzeSlot,
  emptySong,
  loadDraft,
  loadSongs,
  newId,
  orderedSections,
  saveDraft,
  saveSongs,
  slotIdOfChord,
  slotLabel,
  slotMidis,
  songToArrangement,
  songToText,
  voicingTab,
  type SlotVoicing,
  type Song,
  type SongSection,
  type SongSlot,
} from "@/lib/song";

interface Props {
  currentRootName: string;
  currentDegrees: Degree[];
  /** The shape picked on the fretboard for the current chord, if any (kept with added chords). */
  currentVoicing?: SlotVoicing;
  onLoadChord: (rootName: string, degrees: Degree[], voicing?: SlotVoicing) => void;
  onPickScale: (id: string, rootName: string) => void;
}

function makeSlot(rootName: string, degrees: Degree[], voicing?: SlotVoicing): SongSlot {
  const det = identify(rootByName(rootName), degreesToPitchClasses(degrees), "chord");
  const suffix = det.known?.kind === "chord" ? (det.known.suffix ?? "") : "custom";
  return { id: newId(), rootName, suffix, degrees: [...degrees], bars: 1, ...(voicing ? { voicing } : {}) };
}

export function SongWorkspace({ currentRootName, currentDegrees, currentVoicing, onLoadChord, onPickScale }: Props) {
  const [song, setSong] = useState<Song>(() => emptySong());
  const [saved, setSaved] = useState<Song[]>([]);
  const [activeSec, setActiveSec] = useState<string | null>(null);
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [palette7, setPalette7] = useState(true);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  // Play-through and section audition run on the shared engine (one audio clock for chords and
  // click, the chosen instrument, the picked voicings).
  const [playing, setPlaying] = useState<null | "all" | { section: string }>(null);
  const [playChords, setPlayChords] = useState(true);
  const [clickOn, setClickOn] = useState(true);
  const [follow, setFollow] = useState(false);
  const [beat, setBeat] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => {
    setSaved(loadSongs());
    const d = loadDraft();
    if (d) setSong(d);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveDraft(song);
  }, [song, ready]);

  const sectionId = activeSec && song.sections.some((s) => s.id === activeSec)
    ? activeSec
    : song.sections[0]?.id;

  const update = (fn: (s: Song) => Song) => setSong((s) => ({ ...fn(s), updatedAt: Date.now() }));
  const updateSection = (id: string, fn: (s: SongSection) => SongSection) =>
    update((s) => ({ ...s, sections: s.sections.map((x) => (x.id === id ? fn(x) : x)) }));
  const updateSlot = (id: string, fn: (s: SongSlot) => SongSlot) =>
    update((s) => ({
      ...s,
      sections: s.sections.map((sec) => ({
        ...sec,
        slots: sec.slots.map((x) => (x.id === id ? fn(x) : x)),
      })),
    }));

  const addSlot = (slot: SongSlot, secId = sectionId) => {
    if (!secId) return;
    updateSection(secId, (sec) => ({ ...sec, slots: [...sec.slots, slot] }));
    setSelSlot(slot.id);
  };

  const moveSlot = (secId: string, i: number, dir: -1 | 1) =>
    updateSection(secId, (sec) => {
      const next = [...sec.slots];
      const j = i + dir;
      if (j < 0 || j >= next.length) return sec;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return { ...sec, slots: next };
    });

  const moveSection = (i: number, dir: -1 | 1) =>
    update((s) => {
      const next = [...s.sections];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return { ...s, sections: next };
    });

  const keyRoot = rootByName(song.keyRoot);
  const keyScale = KEY_SCALES.find((s) => s.id === song.keyScaleId) ?? KEY_SCALES[0]!;
  const palette = useMemo(() => harmonize(keyRoot, keyScale, palette7), [keyRoot, keyScale, palette7]);

  // Flattened playback order honouring section repeats and bar lengths (for the bar count).
  const timeline = useMemo(() => {
    const out: SongSlot[] = [];
    for (const sec of orderedSections(song))
      for (let r = 0; r < Math.max(1, sec.repeats); r++)
        for (const sl of sec.slots) for (let b = 0; b < Math.max(1, sl.bars); b++) out.push(sl);
    return out;
  }, [song]);

  // Latest values for the engine's callbacks (they outlive renders).
  const live = useRef({ song, follow, onLoadChord });
  live.current = { song, follow, onLoadChord };
  const lastFollowed = useRef<string | null>(null);

  const stopPlayback = () => {
    engine.stop();
    engine.setListener({});
    engine.setChordsMuted(false);
    setPlaying(null);
    setPlayingId(null);
  };
  const start = (which: "all" | { section: string }) => {
    const sectionId = which === "all" ? undefined : which.section;
    const a = songToArrangement(song, { ...(sectionId ? { sectionId } : {}), click: which === "all" ? clickOn : false });
    lastFollowed.current = null;
    engine.setListener({
      onChord: (id) => {
        const slotId = id ? slotIdOfChord(id) : null;
        setPlayingId(slotId);
        if (!slotId || !live.current.follow || slotId === lastFollowed.current) return;
        lastFollowed.current = slotId;
        const sl = live.current.song.sections.flatMap((x) => x.slots).find((x) => x.id === slotId);
        if (sl) live.current.onLoadChord(sl.rootName, sl.degrees, sl.voicing);
      },
      onEnded: () => {
        engine.setListener({});
        setPlaying(null);
        setPlayingId(null);
      },
    });
    engine.setChordsMuted(which === "all" && !playChords);
    void engine.play(a);
    setPlaying(which);
  };

  // Edits, tempo and switches are heard on the next pass while the whole song plays.
  useEffect(() => {
    if (playing !== "all") return;
    engine.setChordsMuted(!playChords);
    void engine.load(songToArrangement(song, { click: clickOn }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, playChords, clickOn]);

  // Beat lights follow the audible beat.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const bt = beatTicks({ beats: song.beatsPerBar, unit: 4 });
    const loop = () => {
      const b = Math.max(0, Math.floor(engine.positionTicks() / bt));
      setBeat((old) => (old === b ? old : b));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, song.beatsPerBar]);

  // Leaving the page stops the music.
  useEffect(() => () => {
    if (engine.playing) stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = playing === "all";
  const auditioning = playing && playing !== "all" ? playing.section : null;
  /** Plays a section's chords in order once, at the song tempo. */
  const auditionSection = (sec: SongSection) => {
    if (sec.slots.length) start({ section: sec.id });
  };
  const stopAudition = stopPlayback;

  const persist = () => {
    const next = [song, ...saved.filter((s) => s.id !== song.id)].slice(0, 50);
    setSaved(next);
    saveSongs(next);
  };
  const removeSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    saveSongs(next);
  };
  const copyChart = async () => {
    try {
      await navigator.clipboard.writeText(songToText(song));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const selected = song.sections.flatMap((s) => s.slots).find((s) => s.id === selSlot) ?? null;
  const selAnalysis = selected ? analyzeSlot(song, selected) : null;
  const totalBars = timeline.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your song, your chords — nothing is written for you. Set the key, add chords from the
        fretboard or the key palette, arrange sections, and practise against the click. Work is
        kept automatically on this device.
      </p>

      {/* ---------------------------------------------- song header */}
      <div className="panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,12rem)_7rem_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest">Song / idea</Label>
            <Input
              value={song.name}
              onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
              aria-label="Song name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest">Key</Label>
            <Select value={song.keyRoot} onValueChange={(v) => update((s) => ({ ...s, keyRoot: v }))}>
              <SelectTrigger aria-label="Key root">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOTS.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {pretty(r.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest">Mode</Label>
            <Select
              value={song.keyScaleId}
              onValueChange={(v) => update((s) => ({ ...s, keyScaleId: v }))}
            >
              <SelectTrigger aria-label="Key mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEY_SCALES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest">Time sig.</Label>
            <Input
              value={song.timeSig ?? `${song.beatsPerBar}/4`}
              onChange={(e) => update((s) => ({ ...s, timeSig: e.target.value }))}
              aria-label="Time signature"
              className="w-28"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPickScale(keyScale.id, keyRoot.name)}
            >
              Show key
            </Button>
            <Button size="sm" onClick={persist}>
              Save song
            </Button>
          </div>
        </div>

        {/* key palette */}
        {palette.length ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Chords in {pretty(keyRoot.name)} {keyScale.name} — tap to hear & view, + to add
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">7ths</Label>
                <Switch checked={palette7} onCheckedChange={setPalette7} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {palette.map((h) => {
                const rootName = h.notes[0]!;
                const chordDegrees = relDegrees(h.degrees, keyRoot.name, rootName);
                return (
                  <span
                    key={h.roman}
                    className="flex items-stretch overflow-hidden rounded-md border border-border bg-secondary"
                  >
                    <button
                      type="button"
                      className="px-2 py-1 text-left"
                      onClick={() => {
                        playChord(slotMidis({ rootName, degrees: chordDegrees }));
                        onLoadChord(rootName, chordDegrees);
                      }}
                    >
                      <span className="block font-mono text-[10px] text-primary">{pretty(h.roman)}</span>
                      <span className="font-display text-sm font-bold">{pretty(h.name)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Add ${h.name}`}
                      className="border-l border-border px-1.5 hover:bg-primary hover:text-primary-foreground"
                      onClick={() => addSlot(makeSlot(rootName, chordDegrees))}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------- sections */}
      <div className="space-y-3">
        {song.sections.map((sec, si) => {
          const isActive = sec.id === sectionId;
          return (
            <div
              key={sec.id}
              className={"panel space-y-2 p-3 " + (isActive ? "ring-1 ring-primary" : "")}
              onClick={() => setActiveSec(sec.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  list="section-labels"
                  value={sec.label}
                  onChange={(e) => updateSection(sec.id, (x) => ({ ...x, label: e.target.value }))}
                  className="h-8 w-36"
                  aria-label="Section label"
                />
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">×</Label>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={sec.repeats}
                    onChange={(e) =>
                      updateSection(sec.id, (x) => ({
                        ...x,
                        repeats: Math.max(1, Math.min(16, Number(e.target.value) || 1)),
                      }))
                    }
                    className="h-8 w-16"
                    aria-label="Section repeats"
                  />
                </div>
                <div className="ml-auto flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Play ${sec.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (auditioning === sec.id) stopAudition();
                      else auditionSection(sec);
                    }}
                  >
                    {auditioning === sec.id ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                    {auditioning === sec.id ? "Stop" : "Play section"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Add ${sec.label} to arrangement`}
                    onClick={() => update((s) => ({ ...s, arrangement: [...(s.arrangement ?? []), sec.id] }))}
                  >
                    <ListOrdered className="mr-1 h-3.5 w-3.5" /> To order
                  </Button>
                  <Button
                    size="sm"
                    variant={isActive ? "default" : "secondary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      addSlot(makeSlot(currentRootName, currentDegrees, currentVoicing), sec.id);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Fretboard chord
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move section up" onClick={() => moveSection(si, -1)}>
                    <ArrowLeft className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move section down" onClick={() => moveSection(si, 1)}>
                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Duplicate section"
                    onClick={() =>
                      update((s) => {
                        const copy: SongSection = {
                          ...sec,
                          id: newId(),
                          slots: sec.slots.map((x) => ({ ...x, id: newId() })),
                        };
                        const next = [...s.sections];
                        next.splice(si + 1, 0, copy);
                        return { ...s, sections: next };
                      })
                    }
                  >
                    <CopyPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Delete section"
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        sections: s.sections.filter((x) => x.id !== sec.id),
                        arrangement: (s.arrangement ?? []).filter((x) => x !== sec.id),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {sec.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Empty — add the chord on the fretboard or tap + on a key chord.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sec.slots.map((s, i) => {
                    const a = analyzeSlot(song, s);
                    const isSel = s.id === selSlot;
                    const isPlaying = s.id === playingId;
                    return (
                      <div
                        key={s.id}
                        className={
                          "min-w-[7rem] rounded-lg border bg-secondary p-2 " +
                          (isPlaying
                            ? "border-primary bg-primary/15"
                            : isSel
                              ? "border-foreground"
                              : "border-border")
                        }
                      >
                        <button
                          type="button"
                          className="block w-full text-left"
                          onClick={() => {
                            setSelSlot(s.id);
                            playChord(slotMidis(s));
                          }}
                        >
                          <span className={"block font-mono text-[11px] " + (a.inKey ? "text-primary" : "text-tension")}>
                            {pretty(a.roman)}
                            {a.inKey ? "" : " · outside"}
                          </span>
                          <span className="font-display text-base font-bold">{pretty(slotLabel(s))}</span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {a.tones.map(pretty).join(" ")}
                            {s.bars > 1 ? ` · ${s.bars} bars` : ""}
                          </span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {pretty(s.degrees.join(" "))}
                          </span>
                          {s.voicing ? (
                            <span className="block font-mono text-[10px] text-primary" title="The shape you picked on the fretboard (low string first)" data-testid="slot-shape">
                              {voicingTab(s.voicing)}
                            </span>
                          ) : null}
                          <span className="block text-[10px] text-muted-foreground">
                            {a.keyMode
                              ? `${pretty(s.rootName)} ${a.keyMode.name}`
                              : a.fits[0]
                                ? `fits ${pretty(s.rootName)} ${a.fits[0].name}`
                                : "no common parent scale"}
                          </span>
                        </button>
                        <div className="mt-1 flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Move left" onClick={() => moveSlot(sec.id, i, -1)}>
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Move right" onClick={() => moveSlot(sec.id, i, 1)}>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label="Duplicate chord"
                            onClick={() =>
                              updateSection(sec.id, (x) => {
                                const next = [...x.slots];
                                next.splice(i + 1, 0, { ...s, id: newId() });
                                return { ...x, slots: next };
                              })
                            }
                          >
                            <Dup className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label="Show on fretboard"
                            onClick={() => onLoadChord(s.rootName, s.degrees, s.voicing)}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label="Delete chord"
                            onClick={() =>
                              updateSection(sec.id, (x) => ({
                                ...x,
                                slots: x.slots.filter((y) => y.id !== s.id),
                              }))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Textarea
                value={sec.notes ?? ""}
                onChange={(e) => updateSection(sec.id, (x) => ({ ...x, notes: e.target.value }))}
                placeholder="Section notes (feel, dynamics, voicing reminders…)"
                rows={1}
                aria-label={`${sec.label} notes`}
                className="min-h-8 text-sm"
              />
            </div>
          );
        })}
        <datalist id="section-labels">
          {SECTION_LABELS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const id = newId();
            const used = new Set(song.sections.map((s) => s.label));
            const label = SECTION_LABELS.find((l) => !used.has(l)) ?? "Section";
            update((s) => ({ ...s, sections: [...s.sections, { id, label, repeats: 1, slots: [] }] }));
            setActiveSec(id);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add section
        </Button>
      </div>

      {/* ---------------------------------------------- arrangement */}
      <div className="panel space-y-2 p-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Arrangement order {song.arrangement?.length ? "" : "— empty: sections play in listed order"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5" data-testid="arrangement">
          {(song.arrangement ?? []).map((id, i) => {
            const sec = song.sections.find((x) => x.id === id);
            if (!sec) return null;
            const move = (dir: -1 | 1) =>
              update((s) => {
                const next = [...(s.arrangement ?? [])];
                const j = i + dir;
                if (j < 0 || j >= next.length) return s;
                [next[i], next[j]] = [next[j]!, next[i]!];
                return { ...s, arrangement: next };
              });
            return (
              <span key={`${id}-${i}`} className="flex items-center gap-0.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-xs">
                <button type="button" aria-label="Earlier" onClick={() => move(-1)}><ArrowLeft className="h-3 w-3" /></button>
                <span className="px-1 font-semibold">{sec.label}</span>
                <button type="button" aria-label="Later" onClick={() => move(1)}><ArrowRight className="h-3 w-3" /></button>
                <button
                  type="button"
                  aria-label={`Remove ${sec.label} from order`}
                  onClick={() => update((s) => ({ ...s, arrangement: (s.arrangement ?? []).filter((_, k) => k !== i) }))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {song.arrangement?.length ? (
            <Button size="sm" variant="ghost" onClick={() => update((s) => ({ ...s, arrangement: [] }))}>Clear order</Button>
          ) : null}
        </div>
      </div>

      {/* ---------------------------------------------- selected chord detail */}
      {selected && selAnalysis ? (
        <div className="panel space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-lg font-bold">
              {pretty(slotLabel(selected))}{" "}
              <span className="font-mono text-sm text-primary">{pretty(selAnalysis.roman)}</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => onLoadChord(selected.rootName, selected.degrees, selected.voicing)}>
                Edit on fretboard
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const fresh = makeSlot(currentRootName, currentDegrees, currentVoicing);
                  updateSlot(selected.id, (x) => ({ ...fresh, id: x.id, bars: x.bars, ...(x.note ? { note: x.note } : {}) }));
                }}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Replace with fretboard chord
              </Button>
            </div>
          </div>
          <p className="font-mono text-sm">
            Tones: {selAnalysis.tones.map(pretty).join(" · ")}{" "}
            <span className="text-muted-foreground">({pretty(selected.degrees.join(" "))})</span>
          </p>
          <p className="text-sm">
            {selAnalysis.inKey ? (
              <span className="text-primary">All tones belong to {pretty(keyRoot.name)} {keyScale.name}.</span>
            ) : (
              <span className="text-tension">
                Outside {pretty(keyRoot.name)} {keyScale.name}: {selAnalysis.outside.map(pretty).join(", ")} — borrowed,
                secondary or chromatic colour.
              </span>
            )}
          </p>
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Scales containing every chord tone — tap to view on the fretboard
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selAnalysis.keyMode ? (
                <Button size="sm" onClick={() => onPickScale(selAnalysis.keyMode!.id, selected.rootName)}>
                  {pretty(selected.rootName)} {selAnalysis.keyMode.name} (from the key)
                </Button>
              ) : null}
              {selAnalysis.fits.map((s) => (
                <Button key={s.id} size="sm" variant="secondary" onClick={() => onPickScale(s.id, selected.rootName)}>
                  {pretty(selected.rootName)} {s.name}
                </Button>
              ))}
              {!selAnalysis.keyMode && selAnalysis.fits.length === 0 ? (
                <span className="text-sm text-muted-foreground">No common scale holds all of these notes.</span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Bars</Label>
              <Input
                type="number"
                min={1}
                max={32}
                value={selected.bars}
                onChange={(e) =>
                  updateSlot(selected.id, (x) => ({
                    ...x,
                    bars: Math.max(1, Math.min(32, Number(e.target.value) || 1)),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Your note on this chord</Label>
              <Input
                value={selected.note ?? ""}
                placeholder="voicing, strum, feel…"
                onChange={(e) => updateSlot(selected.id, (x) => ({ ...x, note: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------- transport */}
      <div className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">
            Play-through & metronome
          </h4>
          <Button size="sm" onClick={() => (running ? stopPlayback() : start("all"))} data-testid="song-play">
            {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {running ? "Stop" : totalBars ? `Play (${totalBars} bars)` : "Start click"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 font-mono text-lg text-primary">{song.bpm} bpm</span>
          <Slider
            value={[song.bpm]}
            min={40}
            max={220}
            step={1}
            onValueChange={(v) => update((s) => ({ ...s, bpm: v[0] ?? 90 }))}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Beats/bar</Label>
            <Select
              value={String(song.beatsPerBar)}
              onValueChange={(v) => update((s) => ({ ...s, beatsPerBar: Number(v) }))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={playChords} onCheckedChange={setPlayChords} />
            <Label className="text-xs">Sound chords</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={clickOn} onCheckedChange={setClickOn} />
            <Label className="text-xs">Click</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={follow} onCheckedChange={setFollow} />
            <Label className="text-xs">Follow on fretboard</Label>
          </div>
          <InstrumentPicker />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: song.beatsPerBar }, (_, i) => (
            <span
              key={i}
              className={
                "h-2.5 w-8 rounded-full " +
                (playing && beat % song.beatsPerBar === i ? "bg-primary" : "bg-muted")
              }
            />
          ))}
        </div>
      </div>

      {/* ---------------------------------------------- notes + library */}
      <div className="panel space-y-2 p-4">
        <Label className="text-xs uppercase tracking-widest">Song notes</Label>
        <Textarea
          value={song.notes}
          onChange={(e) => update((s) => ({ ...s, notes: e.target.value }))}
          placeholder="Your own reminders: capo, tuning, feel, ideas to try…"
          rows={3}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={copyChart}>
            <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? "Copied" : "Copy chart as text"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSong(emptySong());
              setSelSlot(null);
            }}
          >
            New song
          </Button>
        </div>
      </div>

      {saved.length > 0 ? (
        <div className="panel space-y-2 p-4">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest">Saved songs</h4>
          {saved.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border p-2"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {pretty(p.keyRoot)} {KEY_SCALES.find((k) => k.id === p.keyScaleId)?.name} · {p.bpm} bpm ·{" "}
                  {p.sections.map((s) => s.label).join(" / ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSong(p);
                    setSelSlot(null);
                  }}
                >
                  Load
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => removeSaved(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Re-express key-relative degrees (from harmonize) relative to the chord's own root. */
function relDegrees(keyDegrees: Degree[], keyRootName: string, chordRootName: string): Degree[] {
  const kr = rootByName(keyRootName);
  const cr = rootByName(chordRootName);
  const rel = keyDegrees.map((d) => (((kr.pc + degreeToSemitones(d) - cr.pc) % 12) + 12) % 12);
  const det = identify(cr, rel, "chord");
  if (det.known?.kind === "chord") return det.known.def.degrees;
  const names = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  return [...new Set(rel)].sort((a, b) => a - b).map((p) => names[p]!);
}
