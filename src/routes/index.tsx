import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Music2, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fretboard, type LabelMode } from "@/components/Fretboard";
import { ChordLab } from "@/components/ChordLab";
import { AdvancedTheory } from "@/components/TheoryPanels";
import { SongWorkspace } from "@/components/SongWorkspace";
import { analyzeShape, findVoicings, shapeMidis, shapeToTab } from "@/lib/voicings";
import { TUNINGS, degreeMap } from "@/lib/fretboard";
import { NoteEditor } from "@/components/NoteEditor";
import { moveDegreeInSet, pcOf, togglePc, sortDegrees, CANONICAL } from "@/lib/edit";
import { pluck } from "@/lib/audio";
import type { FretPos } from "@/components/Fretboard";
import { playSequence, playChord } from "@/lib/audio";
import { loadFavorites, saveFavorites, type Favorite } from "@/lib/favorites";
import {
  ARPEGGIO_VARIANTS,
  CHORDS,
  CHORD_FAMILIES,
  ROOTS,
  SCALES,
  SCALE_FAMILIES,
  classifyAgainstChord,
  degreeToSemitones,
  identify,
  degreesToPitchClasses,
  preferFlatsFor,
  pretty,
  rootByName,
  spellDegree,
  type Degree,
} from "@/lib/theory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fretlab — Guitar Theory Workstation" },
      {
        name: "description",
        content:
          "Interactive guitar fretboard for exploring chords, scales, modes and arpeggios with live interval formulas, chord naming, harmonisation and modal analysis.",
      },
      { property: "og:title", content: "Fretlab — Guitar Theory Workstation" },
      {
        property: "og:description",
        content:
          "Visualise chords, scales, modes and arpeggios on the fretboard with deep interval and harmony analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workstation,
});

type Mode = "chord" | "scale" | "arpeggio";

function Workstation() {
  const [mode, setMode] = useState<Mode>("chord");
  const [rootName, setRootName] = useState("C");
  const [chordId, setChordId] = useState("maj7");
  const [scaleId, setScaleId] = useState("ionian");
  const [arpId, setArpId] = useState("full");
  const [custom, setCustom] = useState<Degree[] | null>(null);
  const [search, setSearch] = useState("");

  const [tuningId, setTuningId] = useState("standard");
  const [fretFrom, setFretFrom] = useState(0);
  const [fretTo, setFretTo] = useState(15);
  const [leftHanded, setLeftHanded] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>("degree");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [seventh, setSeventh] = useState(true);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  useEffect(() => setFavorites(loadFavorites()), []);

  const root = rootByName(rootName);
  const tuning = TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0]!;
  const chord = CHORDS.find((c) => c.id === chordId) ?? CHORDS[0]!;
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0]!;
  const arp = ARPEGGIO_VARIANTS.find((a) => a.id === arpId) ?? ARPEGGIO_VARIANTS[0]!;

  const baseDegrees: Degree[] = useMemo(() => {
    if (mode === "scale") return scale.degrees;
    if (mode === "arpeggio") return arp.transform(chord.degrees);
    return chord.degrees;
  }, [mode, scale, arp, chord]);

  const degrees = custom ?? baseDegrees;
  const detection = identify(root, degreesToPitchClasses(degrees));

  const title = detection.known
    ? detection.known.name
    : `${root.name} custom (${detection.formula})`;

  const [history, setHistory] = useState<{ rootName: string; custom: Degree[] | null }[]>([]);
  const [sel, setSel] = useState<FretPos | null>(null);
  const commit = (next: Degree[], nextRoot = rootName) => {
    setHistory((h) => [...h.slice(-49), { rootName, custom }]);
    setCustom(next);
    if (nextRoot !== rootName) setRootName(nextRoot);
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setCustom(last.custom);
    setRootName(last.rootName);
  };
  const revert = () => {
    const first = history[0];
    if (first) setRootName(first.rootName);
    setCustom(null);
    setHistory([]);
  };
  /** Choosing a preset starts a fresh edit session; Revert returns to that preset. */
  const resetEdits = () => {
    setCustom(null);
    setHistory([]);
  };
  const [soundOnPick, setSoundOnPick] = useState(true);
  const [markMode, setMarkMode] = useState(false);
  const [userShape, setUserShape] = useState<(number | null)[]>([]);
  useEffect(() => setUserShape(Array(tuning.strings.length).fill(null)), [tuning]);
  const shapeRead = useMemo(() => (markMode ? analyzeShape(userShape, tuning) : null), [markMode, userShape, tuning]);
  const markFret = (pos: FretPos) => {
    setSel(pos);
    setUserShape((s) => {
      const next = Array.from({ length: tuning.strings.length }, (_, i) => s[i] ?? null);
      next[pos.string] = next[pos.string] === pos.fret ? null : pos.fret;
      return next;
    });
  };
  const altered = useMemo(() => {
    const base = new Set(baseDegrees);
    return new Set(degrees.filter((d) => !base.has(d)));
  }, [degrees, baseDegrees]);
  const selInfo = useMemo(() => {
    if (!sel) return null;
    const os = tuning.strings[sel.string];
    if (!os) return null;
    const pc = (os.pc + sel.fret) % 12;
    const hit = degreeMap(root, degrees).get(pc);
    const semis = (pc - root.pc + 12) % 12;
    return {
      stringLabel: os.note,
      fret: sel.fret,
      midi: os.pc + (os.octave + 1) * 12 + sel.fret,
      noteName: hit ? hit.note : spellDegree(root, CANONICAL[semis]!),
      degree: hit?.degree,
      semis,
    };
  }, [sel, tuning, root, degrees]);
  const shiftSelected = (delta: number) => {
    if (!sel || !selInfo?.degree) return;
    if (selInfo.semis === 0) {
      const npc = (root.pc + delta + 12) % 12;
      const nr = ROOTS.find((r) => r.pc === npc);
      if (nr) commit(degrees, nr.name);
    } else {
      commit(moveDegreeInSet(degrees, selInfo.degree, delta));
    }
    setSel({ string: sel.string, fret: Math.min(fretTo, Math.max(fretFrom, sel.fret + delta)) });
    pluck(selInfo.midi + delta);
  };

  const roles = useMemo(() => {
    if (mode !== "scale") return undefined;
    const map: Record<string, "chord tone" | "tension" | "avoid"> = {};
    for (const r of classifyAgainstChord(degrees, chord.degrees)) map[r.degree] = r.role;
    return map;
  }, [mode, degrees, chord]);

  const midis = degrees.map((d) => 48 + root.pc + degreeToSemitones(d));

  const filteredChords = CHORDS.filter((c) =>
    `${c.name} ${c.suffix} ${c.family}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredScales = SCALES.filter((s) =>
    `${s.name} ${(s.aliases ?? []).join(" ")} ${s.family}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const pickScale = (id: string, newRoot?: string) => {
    setMode("scale");
    setScaleId(id);
    resetEdits();
    if (newRoot) setRootName(newRoot);
  };

  const loadChord = (r: string, d: Degree[]) => {
    const key = [...d].sort().join(",");
    const match = CHORDS.find((c) => [...c.degrees].sort().join(",") === key);
    setMode("chord");
    setRootName(r);
    if (match) {
      setChordId(match.id);
      setCustom(null);
    } else setCustom([...d]);
    setHistory([]);
    setSel(null);
  };

  const [bassMode, setBassMode] = useState<"root" | "any">("root");
  const [shapeIdx, setShapeIdx] = useState<number | null>(null);
  const voicings = useMemo(
    () =>
      degrees.length <= tuning.strings.length
        ? findVoicings({
            tuning,
            rootPc: root.pc,
            pcs: degreesToPitchClasses(degrees).map((p) => p + root.pc),
            fretFrom,
            fretTo,
            bass: bassMode,
            maxSpan: 3,
            limit: 24,
          })
        : [],
    [tuning, root.pc, degrees, fretFrom, fretTo, bassMode],
  );
  useEffect(() => setShapeIdx(null), [voicings]);
  const shape = shapeIdx !== null ? voicings[shapeIdx]?.shape : undefined;

  const addFavorite = () => {
    const next: Favorite[] = [
      {
        id: `${Date.now()}`,
        label: title,
        mode,
        rootName: root.name,
        degrees,
        createdAt: Date.now(),
      },
      ...favorites,
    ].slice(0, 60);
    setFavorites(next);
    saveFavorites(next);
  };

  const removeFavorite = (id: string) => {
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    saveFavorites(next);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/40">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black tracking-tight sm:text-xl">
                Fretlab
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                You create · it analyses · you decide
              </p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
            {SCALES.length} scales · {CHORDS.length} chords
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4">
        {/* ------------------------------------------------ current selection */}
        <section className="panel p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {custom ? "Modified set" : mode}
              </p>
              <h2 className="font-display text-2xl font-black sm:text-3xl">{pretty(title)}</h2>
              <p className="mt-1 font-mono text-sm text-primary">
                {pretty(degrees.join("  ")) || "—"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {degrees.map((d) => pretty(spellDegree(root, d))).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button size="sm" variant="secondary" onClick={() => playChord(midis)}>
                Play together
              </Button>
              <Button size="sm" variant="secondary" onClick={() => playSequence(midis)}>
                Play ascending
              </Button>
              <Button size="sm" onClick={addFavorite}>
                <Heart className="mr-1 h-4 w-4" /> Save
              </Button>
            </div>
          </div>
          {custom ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={revert}
            >
              Back to the unmodified {mode}
            </Button>
          ) : null}
        </section>

        {/* ------------------------------------------------ fretboard */}
        <section id="fretboard" className="panel space-y-3 p-3 sm:p-4">
          <Fretboard
            shape={markMode ? userShape : shape}
            tuning={tuning}
            root={root}
            degrees={degrees}
            fretFrom={fretFrom}
            fretTo={fretTo}
            leftHanded={leftHanded}
            labelMode={labelMode}
            preferFlats={preferFlatsFor(root)}
            showAllNotes={showAllNotes || markMode}
            roles={roles}
            altered={custom ? altered : undefined}
            selected={sel}
            onSelect={markMode ? markFret : setSel}
            onShift={markMode ? undefined : shiftSelected}
          />
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 p-2">
            <div className="flex items-center gap-2">
              <Switch id="markmode" checked={markMode} onCheckedChange={setMarkMode} aria-label="Mark a shape" />
              <Label htmlFor="markmode" className="text-xs uppercase tracking-widest">Mark a shape</Label>
            </div>
            {markMode ? (
              <>
                <span className="text-xs text-muted-foreground">One fret per string · tap again to unmark</span>
                <span className="font-mono text-sm">{shapeToTab(userShape.map((f) => f ?? null))}</span>
                {shapeRead ? (
                  <>
                    <span className="font-display text-sm font-bold" data-testid="shape-name">
                      {pretty(shapeRead.primary.det.known?.kind === "chord" ? shapeRead.primary.det.known.name : `${shapeRead.bassName} (${shapeRead.primary.det.formula})`)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {shapeRead.notes.map(pretty).join(" ")}
                    </span>
                    {shapeRead.alternatives.map((a) => (
                      <span key={a.root.name} className="font-mono text-xs text-primary">
                        also {pretty(`${a.det.known!.name}/${shapeRead.bassName}`)}
                      </span>
                    ))}
                    <Button size="sm" variant="secondary" onClick={() => playSequence(shapeRead.midis, 0.05)}>Strum</Button>
                    <Button size="sm" variant="secondary" onClick={() => playChord(shapeRead.midis)}>Together</Button>
                    <Button size="sm" onClick={() => { loadChord(shapeRead.bassName, shapeRead.primary.degrees); setMarkMode(false); }}>
                      Use as current structure
                    </Button>
                  </>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setUserShape(Array(tuning.strings.length).fill(null))}>Clear</Button>
              </>
            ) : null}
          </div>
          {mode !== "scale" ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Playable shapes in frets {fretFrom}–{fretTo} ({voicings.length})
                </p>
                <Button size="sm" variant={bassMode === "root" ? "default" : "secondary"} onClick={() => setBassMode("root")}>Root in bass</Button>
                <Button size="sm" variant={bassMode === "any" ? "default" : "secondary"} onClick={() => setBassMode("any")}>Inversions too</Button>
                {shape ? <Button size="sm" variant="ghost" onClick={() => setShapeIdx(null)}>Show all notes</Button> : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {voicings.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No 4-finger shape found here — widen the fret range or allow inversions.</span>
                ) : (
                  voicings.map((v, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={i === shapeIdx ? "default" : "secondary"}
                      className="font-mono"
                      onClick={() => {
                        setShapeIdx(i);
                        playSequence(shapeMidis(v.shape, tuning), 0.05);
                      }}
                    >
                      {shapeToTab(v.shape)}
                      {v.omitted.length ? " (no 5)" : ""}
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <NoteEditor
            root={root}
            degrees={degrees}
            selected={selInfo}
            canUndo={history.length > 0}
            modified={!!custom || history.length > 0}
            onShift={shiftSelected}
            onAddSelected={() => selInfo && commit(togglePc(degrees, selInfo.semis))}
            onRemoveSelected={() => selInfo && commit(togglePc(degrees, selInfo.semis))}
            onClearSelection={() => setSel(null)}
            onTogglePc={(pc) => commit(togglePc(degrees, pc))}
            onUndo={undo}
            onReset={revert}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Tuning</Label>
              <Select value={tuningId} onValueChange={setTuningId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TUNINGS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Labels</Label>
              <Select value={labelMode} onValueChange={(v) => setLabelMode(v as LabelMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note names</SelectItem>
                  <SelectItem value="degree">Scale degrees</SelectItem>
                  <SelectItem value="interval">Intervals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">
                Frets {fretFrom}–{fretTo}
              </Label>
              <Slider
                value={[fretFrom, fretTo]}
                min={0}
                max={24}
                step={1}
                onValueChange={(v) => {
                  const a = v[0] ?? 0;
                  const b = v[1] ?? 24;
                  if (b - a >= 3) {
                    setFretFrom(a);
                    setFretTo(b);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-widest">Left handed</Label>
                <Switch checked={leftHanded} onCheckedChange={setLeftHanded} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-widest">Ghost all notes</Label>
                <Switch checked={showAllNotes} onCheckedChange={setShowAllNotes} />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ selectors */}
        <section className="panel p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest">Root</Label>
              <Select
                value={rootName}
                onValueChange={(v) => {
                  setRootName(v);
                }}
              >
                <SelectTrigger>
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
              <Label className="text-xs uppercase tracking-widest">Search structures</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="maj7, dorian, altered, pentatonic…"
              />
              <div className="flex items-center gap-2 pt-1">
                <Switch id="soundpick" checked={soundOnPick} onCheckedChange={setSoundOnPick} />
                <Label htmlFor="soundpick" className="text-xs text-muted-foreground">Sound on select</Label>
              </div>
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as Mode);
              resetEdits();
            }}
            className="mt-4"
          >
            <TabsList className="w-full">
              <TabsTrigger value="chord" className="flex-1">
                Chords
              </TabsTrigger>
              <TabsTrigger value="scale" className="flex-1">
                Scales
              </TabsTrigger>
              <TabsTrigger value="arpeggio" className="flex-1">
                Arpeggios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chord" className="mt-3 space-y-4">
              {CHORD_FAMILIES.map((fam) => {
                const items = filteredChords.filter((c) => c.family === fam);
                if (items.length === 0) return null;
                return (
                  <div key={fam}>
                    <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {fam}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((c) => (
                        <Button
                          key={c.id}
                          size="sm"
                          variant={c.id === chordId && !custom ? "default" : "secondary"}
                          onClick={() => {
                            setChordId(c.id);
                            resetEdits();
                            if (soundOnPick) playChord(c.degrees.map((d) => 48 + root.pc + degreeToSemitones(d)));
                          }}
                        >
                          {pretty(`${root.name}${c.suffix}`) || root.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-sm text-muted-foreground">{chord.theory}</p>
            </TabsContent>

            <TabsContent value="scale" className="mt-3 space-y-4">
              {SCALE_FAMILIES.map((fam) => {
                const items = filteredScales.filter((s) => s.family === fam);
                if (items.length === 0) return null;
                return (
                  <div key={fam}>
                    <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {fam}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant={s.id === scaleId && !custom ? "default" : "secondary"}
                          onClick={() => {
                            setScaleId(s.id);
                            resetEdits();
                            if (soundOnPick) playSequence(s.degrees.map((d) => 60 + root.pc + degreeToSemitones(d)), 0.16);
                          }}
                        >
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-sm text-muted-foreground">{scale.theory}</p>
              {scale.characteristic ? (
                <p className="text-sm text-primary">
                  Characteristic: {scale.characteristic}
                </p>
              ) : null}
              {scale.chordScale ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Diatonic qualities: {scale.chordScale}
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="arpeggio" className="mt-3 space-y-4">
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Source chord
                </p>
                <Select
                  value={chordId}
                  onValueChange={(v) => {
                    setChordId(v);
                    resetEdits();
                  }}
                >
                  <SelectTrigger className="sm:max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHORDS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {`${root.name}${c.suffix} — ${c.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Variant
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ARPEGGIO_VARIANTS.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant={a.id === arpId && !custom ? "default" : "secondary"}
                      onClick={() => {
                        setArpId(a.id);
                        resetEdits();
                        if (soundOnPick) playSequence(a.transform(chord.degrees).map((d) => 48 + root.pc + degreeToSemitones(d)), 0.16);
                      }}
                    >
                      {a.name}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{arp.theory}</p>
            </TabsContent>
          </Tabs>
        </section>

        {/* ------------------------------------------------ lab + theory */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">
              Interval lab (edits any chord, scale or arpeggio)
            </h3>
            <ChordLab
              root={root}
              degrees={degrees}
              onChange={(d) => commit(d)}
              onReset={revert}
            />
          </section>

          <section>
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">
              Advanced theory
            </h3>
            <div className="panel px-4 py-1">
              <AdvancedTheory
                root={root}
                degrees={degrees}
                scale={scale}
                chord={chord}
                seventh={seventh}
                onToggleSeventh={() => setSeventh((s) => !s)}
                onPickScale={pickScale}
                onPickDegrees={(d) => commit(d)}
              />
            </div>
          </section>
        </div>

        {/* ------------------------------------------------ favorites */}
        <section className="panel p-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
            Saved on this device
          </h3>
          {favorites.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing saved yet. Use Save to keep a chord, scale or arpeggio you are working on.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {favorites.map((f) => (
                <span
                  key={f.id}
                  className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs"
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 font-mono"
                    onClick={() => {
                      setRootName(f.rootName);
                      setMode(f.mode);
                      setCustom(f.degrees as Degree[]);
                      setHistory([]);
                      setSel(null);
                    }}
                  >
                    <Star className="h-3 w-3 text-primary" />
                    {pretty(f.label)}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${f.label}`}
                    onClick={() => removeFavorite(f.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------ progression */}
        <section>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">
            Song / idea workspace
          </h3>
          <SongWorkspace
            currentRootName={root.name}
            currentDegrees={degrees}
            onLoadChord={loadChord}
            onPickScale={(id, r) => {
              pickScale(id, r);
              setHistory([]);
              document.getElementById("fretboard")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </section>

        <p className="pb-8 text-xs text-muted-foreground">
          Fretlab never writes music for you. It names, spells and maps what you choose so you can
          judge it yourself.
        </p>
      </main>
    </div>
  );
}
