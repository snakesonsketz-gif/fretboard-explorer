import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, HeartOff, Star, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { analyzeShape, findVoicings, shapeMidis, shapeToTab, type Shape } from "@/lib/voicings";
import { isMarkedImpossible, loadImpossible, markImpossible, type ImpossibleShape } from "@/lib/impossible";
import { useDevMode } from "@/lib/devMode";
import { voicingTab, type SlotVoicing } from "@/lib/song";

/** Identity of a chord independent of how its degrees are ordered (for re-showing a saved shape). */
const chordKey = (rootName: string, degrees: readonly string[]) => `${rootByName(rootName).pc}|${[...degrees].sort().join(",")}`;
const sameShape = (a: Shape, b: Shape) => a.length === b.length && a.every((f, i) => f === b[i]);
import { TUNINGS, degreeMap } from "@/lib/fretboard";
import { NoteEditor } from "@/components/NoteEditor";
import { DegreeAlter } from "@/components/DegreeAlter";
import { ModeFamily } from "@/components/ModeFamily";
import { IdentifierPanel } from "@/components/IdentifierPanel";
import { CircleOfFifths } from "@/components/CircleOfFifths";
import { cagedPositions, visiblePositions, scaleWindow, mapSetInWindow } from "@/lib/caged";
import { pathwayKeys, orderedPathway, type Pathway } from "@/lib/fretboard";
import type { ModeRotation } from "@/lib/modes";
import { moveDegreeInSet, pcOf, togglePc, sortDegrees, CANONICAL } from "@/lib/edit";
import { pluck } from "@/lib/audio";
import type { FretPos } from "@/components/Fretboard";
import { playSequence, playChord } from "@/lib/audio";
import { dedupeFavorites, favoriteKey, loadFavorites, saveFavorites, type Favorite } from "@/lib/favorites";
import { chordTier, scaleTier, arpeggioTier, type Tier } from "@/lib/levels";
import { TierTabs, atOrBelow, inPick, loadTierPick, saveTierPick, type TierPick } from "@/components/TierTabs";
import {
  ARPEGGIO_VARIANTS,
  CHORDS,
  CHORD_FAMILIES,
  ROOTS,
  SCALES,
  SCALE_FAMILIES,
  chordScaleOverlay,
  degreeToSemitones,
  identify,
  degreesToPitchClasses,
  ownChord,
  preferFlatsFor,
  pretty,
  rootByName,
  spellDegree,
  type Degree,
  type OverlayRole,
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
const PREFERRED_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR_MODES = ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

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

  const [arpSrc, setArpSrc] = useState<Degree[] | null>(null);
  const arpSource = arpSrc ?? chord.degrees;
  const baseDegrees: Degree[] = useMemo(() => {
    if (mode === "scale") return scale.degrees;
    if (mode === "arpeggio") return arp.transform(arpSource);
    return chord.degrees;
  }, [mode, scale, arp, chord, arpSource]);

  const degrees = custom ?? baseDegrees;
  const detection = identify(root, degreesToPitchClasses(degrees), mode === "scale" ? "scale" : "chord");

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

  // Chord-to-scale overlay: in scale view the scale is coloured against a chord the user can see —
  // the scale's own chord (default), the chord picked on the Chords tab, or nothing.
  const [overChord, setOverChord] = useState<"own" | "chord" | "off">("own");
  const scaleOwn = useMemo(() => (mode === "scale" ? ownChord(degrees) : null), [mode, degrees]);
  const chordName = (d: Degree[]) => {
    const det = identify(root, degreesToPitchClasses(d), "chord");
    return det.known?.name ?? `${root.name} (${det.formula})`;
  };

  // ---- CAGED / position window / pathways (visual layers over the shared state)
  const [cagedOn, setCagedOn] = useState(false);
  const [cagedLayer, setCagedLayer] = useState<"chord" | "scale" | "arpeggio">("chord");
  const [cagedIdx, setCagedIdx] = useState(0);
  const [posWin, setPosWin] = useState<{ start: number; size: number } | null>(null);
  const [pathway, setPathway] = useState<Pathway>("none");
  const [pathPair, setPathPair] = useState(0);
  // In scale mode the CAGED chord is the overlay chord: the scale's own 1-3-5-7 unless the user chose the Chords-tab chord.
  const cagedChord = mode === "chord" ? degrees : mode === "arpeggio" ? arpSource : overChord === "chord" ? chord.degrees : (scaleOwn ?? chord.degrees);
  const cagedScale = mode === "scale" ? degrees : scale.degrees;
  const cagedArp = mode === "arpeggio" ? degrees : arp.transform(cagedChord);
  const cagedAll = useMemo(() => visiblePositions(cagedPositions(tuning, root.pc), fretFrom, fretTo), [tuning, root.pc, fretFrom, fretTo]);
  const cagedOverview = cagedOn && cagedIdx < 0;
  const cagedPos = cagedOn && !cagedOverview ? cagedAll[Math.min(cagedIdx, cagedAll.length - 1)] : undefined;
  const chordPcSet = new Set(degreesToPitchClasses(cagedChord).map((p) => (p + root.pc) % 12));
  const fbDegrees = !cagedOn
    ? degrees
    : cagedLayer === "chord"
      ? cagedChord
      : cagedLayer === "scale"
        ? sortDegrees([...cagedScale, ...cagedChord.filter((d) => !degreesToPitchClasses(cagedScale).includes(pcOf(d)))])
        : cagedArp;
  const overlayChord: Degree[] | null =
    cagedOn && cagedLayer !== "chord"
      ? cagedChord
      : mode === "scale" && overChord !== "off"
        ? overChord === "chord"
          ? chord.degrees
          : scaleOwn
        : null;
  const overlay = useMemo(() => {
    if (!overlayChord) return undefined;
    const byPc = new Map<number, { role: OverlayRole; label: Degree }>();
    for (const [pc, v] of chordScaleOverlay(fbDegrees, overlayChord)) byPc.set((pc + root.pc) % 12, v);
    return byPc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbDegrees.join(), overlayChord?.join(), root.pc]);
  const overlayGroups = useMemo(() => {
    const g: Record<OverlayRole, string[]> = { chord: [], extension: [], other: [] };
    if (overlay) for (const v of [...overlay.values()].sort((a, b) => degreeToSemitones(a.label) - degreeToSemitones(b.label))) g[v.role].push(v.label);
    return g;
  }, [overlay]);
  const editable = !cagedOn || cagedLayer === mode;
  const cagedScaleWin = cagedPos && cagedLayer !== "chord" ? scaleWindow(cagedPos, fretFrom, fretTo) : null;
  const focus = cagedPos
    ? { from: cagedScaleWin?.from ?? cagedPos.from, to: cagedScaleWin?.to ?? cagedPos.to, label: `${cagedPos.form} shape` }
    : posWin
      ? { from: posWin.start, to: posWin.start + posWin.size - 1, label: `pos ${posWin.start}` }
      : null;
  const neighbors = cagedOverview
    ? cagedAll.map((w) => ({ from: w.from, to: w.to, label: `${w.form}` }))
    : cagedPos
      ? [cagedAll[cagedIdx - 1], cagedAll[cagedIdx + 1]].filter((x): x is NonNullable<typeof x> => !!x).map((w) => ({ from: w.from, to: w.to, label: `${w.form}` }))
      : undefined;
  // Ordered pathway: true degree order from a chosen start degree, wrapping cyclically.
  const [pathStart, setPathStart] = useState<string>("1");
  const startDeg = fbDegrees.includes(pathStart) ? pathStart : (fbDegrees[0] ?? "1");
  // Horizontal uses string pairs, diagonal uses string triples; clamp so switching kinds never points past the top string.
  const pair = Math.min(pathPair, Math.max(0, tuning.strings.length - (pathway === "diagonal" ? 3 : 2)));
  const pathSteps = useMemo(() => {
    if (pathway === "none") return [];
    const pcs = new Set(degreesToPitchClasses(fbDegrees).map((p) => (p + root.pc) % 12));
    const from = focus?.from ?? fretFrom;
    const to = pathway === "diagonal" ? fretTo : (focus?.to ?? (pathway === "vertical" ? Math.min(fretTo, fretFrom + 4) : fretTo));
    return orderedPathway({ kind: pathway, tuning, pcs, startPc: (root.pc + pcOf(startDeg)) % 12, from, to, stringPair: pair, minFret: fretFrom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway, tuning, root.pc, fbDegrees.join(), startDeg, fretFrom, fretTo, focus?.from, focus?.to, pair]);
  const pathKeys = useMemo(
    () => (pathway === "none" ? undefined : new Set(pathSteps.map((p) => `${p.string}-${p.fret}`))),
    [pathway, pathSteps],
  );
  const pathOrder = useMemo(() => new Map(pathSteps.map((p, i) => [`${p.string}-${p.fret}`, i + 1])), [pathSteps]);
  const degOfPc = (pc: number) => fbDegrees.find((d) => (root.pc + pcOf(d)) % 12 === pc) ?? "?";
  void pathwayKeys;
  const pickMode = (m: ModeRotation) => {
    setMode("scale");
    if (m.preset && !custom) {
      setScaleId(m.preset.id);
      setRootName(m.root.name);
      resetEdits();
    } else {
      commit(m.degrees, m.root.name);
    }
    if (soundOnPick) playSequence(m.degrees.map((d) => 60 + m.root.pc + degreeToSemitones(d)), 0.16);
  };

  const midis = degrees.map((d) => 48 + root.pc + degreeToSemitones(d));

  // Search matches names, aliases, families and formulas (e.g. "b3 b7" or "1 3 #5").
  const q = search.toLowerCase().trim();
  const filteredChords = CHORDS.filter((c) =>
    `${c.name} ${c.suffix} ${c.family} ${c.degrees.join(" ")}`.toLowerCase().includes(q),
  );
  const filteredScales = SCALES.filter((s) =>
    `${s.name} ${(s.aliases ?? []).join(" ")} ${s.family} ${s.degrees.join(" ")}`
      .toLowerCase()
      .includes(q),
  );

  // Difficulty sub-tabs for the library: one pick per section, remembered per device.
  const [chordPick, setChordPick] = useState<TierPick>("beginner");
  const [scalePick, setScalePick] = useState<TierPick>("beginner");
  const [arpPick, setArpPick] = useState<TierPick>("beginner");
  useEffect(() => {
    setChordPick(loadTierPick("explore.chord"));
    setScalePick(loadTierPick("explore.scale"));
    setArpPick(loadTierPick("explore.arpeggio"));
  }, []);
  const tierCounts = <T,>(items: readonly T[], tierOf: (x: T) => Tier) => {
    const c = { beginner: 0, intermediate: 0, advanced: 0, expert: 0, all: items.length } as Record<TierPick, number>;
    for (const x of items) c[tierOf(x)]++;
    return c;
  };
  const chordCounts = useMemo(() => tierCounts(CHORDS, (c) => chordTier(c.id)), []);
  const scaleCounts = useMemo(() => tierCounts(SCALES, (s) => scaleTier(s.id)), []);
  const arpCounts = useMemo(() => tierCounts(ARPEGGIO_VARIANTS, (a) => arpeggioTier(a.id)), []);
  // A search looks across every level; otherwise show the chosen level only.
  const searching = q.length > 0;
  const tierChords = searching ? filteredChords : CHORDS.filter((c) => inPick(chordTier(c.id), chordPick));
  const tierScales = searching ? filteredScales : SCALES.filter((s) => inPick(scaleTier(s.id), scalePick));
  const tierArps = searching ? ARPEGGIO_VARIANTS : ARPEGGIO_VARIANTS.filter((a) => inPick(arpeggioTier(a.id), arpPick));
  // Source chords for arpeggios are cumulative (at or below the level), plus the current chord.
  const arpSourceChords = CHORDS.filter((c) => c.id === chordId || atOrBelow(chordTier(c.id), arpPick));

  const pickScale = (id: string, newRoot?: string) => {
    setMode("scale");
    setScaleId(id);
    resetEdits();
    if (newRoot) setRootName(newRoot);
  };

  /** Show a saved shape again: pin it to its chord and make sure the fret range shows it. */
  const restoreShape = (r: string, d: readonly string[], v?: { shape: (number | null)[]; tuningId: string }) => {
    if (!v || v.tuningId !== tuning.id) return setPin(null);
    setPin({ key: chordKey(r, d), shape: [...v.shape], tuningId: v.tuningId });
    const frets = v.shape.filter((f): f is number => f !== null);
    if (frets.length) {
      setFretFrom((f) => Math.min(f, Math.min(...frets)));
      setFretTo((t) => Math.max(t, Math.max(...frets)));
    }
  };

  const loadChord = (r: string, d: Degree[], voicing?: SlotVoicing) => {
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
    restoreShape(r, d, voicing);
  };

  const [bassMode, setBassMode] = useState<"root" | "any">("root");
  const [shapeIdx, setShapeIdx] = useState<number | null>(null);
  const dev = useDevMode();
  // Shapes marked "impossible" in developer mode are never suggested again.
  const [impossible, setImpossible] = useState<ImpossibleShape[]>([]);
  useEffect(() => {
    const load = () => setImpossible(loadImpossible());
    load();
    window.addEventListener("fretlab-impossible", load);
    return () => window.removeEventListener("fretlab-impossible", load);
  }, []);
  const [impNote, setImpNote] = useState<string | null>(null);
  const voicings = useMemo(
    () =>
      (degrees.length <= tuning.strings.length
        ? findVoicings({
            tuning,
            rootPc: root.pc,
            pcs: degreesToPitchClasses(degrees).map((p) => p + root.pc),
            fretFrom,
            fretTo,
            bass: bassMode,
            maxSpan: 3,
            limit: 30,
          }).filter((v) => !isMarkedImpossible(impossible, v.shape, tuning.id)).slice(0, 24)
        : []),
    [tuning, root.pc, degrees, fretFrom, fretTo, bassMode, impossible],
  );
  useEffect(() => setShapeIdx(null), [voicings]);
  // A shape brought back from a saved chord or a song chord stays shown while that chord is on
  // (it needn't be in the list of suggested shapes).
  const [pin, setPin] = useState<{ key: string; shape: Shape; tuningId: string } | null>(null);
  const pinned = pin && mode !== "scale" && pin.tuningId === tuning.id && pin.key === chordKey(root.name, degrees) ? pin.shape : null;
  const shape = pinned ?? (shapeIdx !== null ? voicings[shapeIdx]?.shape : undefined);
  /** The shape picked for the current chord, kept when the chord is saved or added to a song. */
  const currentVoicing = shape && mode !== "scale" ? { shape: [...shape], tuningId: tuning.id, midis: shapeMidis(shape, tuning) } : undefined;

  /** The saved copy of what's on screen, if it's saved (one per chord/scale/arpeggio). */
  const savedNow = favorites.find((f) => favoriteKey(f) === favoriteKey({ mode, rootName: root.name, degrees }));
  /** A short "Saved ✓" / "Removed" message by the button, so it's obvious what happened. */
  const [saveNote, setSaveNote] = useState<{ text: string; saved: boolean; id: number } | null>(null);
  const noteId = useRef(0);
  const sayFav = (text: string, saved: boolean) => {
    const id = ++noteId.current;
    setSaveNote({ text, saved, id });
    window.setTimeout(() => setSaveNote((n) => (n?.id === id ? null : n)), 2600);
  };
  const shapeDiffers = !!savedNow && mode === "chord" && !!currentVoicing && savedNow.shape?.join() !== currentVoicing.shape.join();

  const addFavorite = () => {
    const next: Favorite[] = dedupeFavorites([
      {
        id: `${Date.now()}`,
        label: title,
        mode,
        rootName: root.name,
        degrees,
        createdAt: Date.now(),
        ...(currentVoicing && mode === "chord" ? { shape: currentVoicing.shape, tuningId: currentVoicing.tuningId } : {}),
      },
      ...favorites.filter((f) => favoriteKey(f) !== favoriteKey({ mode, rootName: root.name, degrees })),
    ]).slice(0, 60);
    setFavorites(next);
    saveFavorites(next);
    sayFav(savedNow ? `Updated ${pretty(title)} with this shape` : `Saved ${pretty(title)} ✓`, true);
  };

  const removeFavorite = (id: string) => {
    const gone = favorites.find((f) => f.id === id);
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    saveFavorites(next);
    if (gone) sayFav(`Removed ${pretty(gone.label)} from saved`, false);
  };
  const toggleSaved = () => (savedNow ? removeFavorite(savedNow.id) : addFavorite());

  return (
    <AppShell
      headerRight={
        <Badge variant="outline" className="font-mono text-[11px]">
          {SCALES.length} scales · {CHORDS.length} chords
        </Badge>
      }
    >
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
              <Button
                size="sm"
                variant={savedNow ? "outline" : "default"}
                onClick={toggleSaved}
                aria-pressed={!!savedNow}
                data-testid="save-toggle"
                title={savedNow ? "Saved — tap to remove it from your saved list" : "Save this to your list (one copy per chord)"}
                className={cn("group", savedNow && "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 hover:bg-destructive/15 hover:text-red-300")}
              >
                {savedNow ? (
                  <>
                    <Check className="mr-1 h-4 w-4 group-hover:hidden" /><HeartOff className="mr-1 hidden h-4 w-4 group-hover:block" />
                    <span className="group-hover:hidden">Saved</span><span className="hidden group-hover:inline">Unsave</span>
                  </>
                ) : (
                  <>
                    <Heart className="mr-1 h-4 w-4" /> Save
                  </>
                )}
              </Button>
              {shapeDiffers ? (
                <Button size="sm" variant="secondary" onClick={addFavorite} data-testid="save-shape" title="Keep this chord saved, with the shape you're looking at now">
                  Save this shape
                </Button>
              ) : null}
            </div>
            {saveNote ? (
              <p key={saveNote.id} role="status" data-testid="save-note"
                className={cn("col-span-2 animate-in fade-in-0 slide-in-from-top-1 rounded-md px-2 py-1 text-xs font-semibold sm:order-last sm:w-full", saveNote.saved ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>
                {saveNote.text}
              </p>
            ) : null}
          </div>
          {/* quick controls: everything needed while writing, without scrolling */}
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground">Root</span>
              {PREFERRED_ROOTS.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={rootByName(n).pc === root.pc ? "default" : "secondary"}
                  className="h-7 min-w-9 px-2 font-mono text-xs"
                  onClick={() => {
                    setRootName(n);
                    if (soundOnPick) pluck(48 + rootByName(n).pc);
                  }}
                >
                  {pretty(n)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground">View</span>
              {(["chord", "scale", "arpeggio"] as Mode[]).map((m) => (
                <Button key={m} size="sm" variant={mode === m ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize"
                  onClick={() => { setMode(m); resetEdits(); }}>
                  {m}
                </Button>
              ))}
              <span className="mx-1 h-5 w-px bg-border" />
              {([["note", "Notes"], ["degree", "Degrees"], ["interval", "Intervals"]] as [LabelMode, string][]).map(([v, l]) => (
                <Button key={v} size="sm" variant={labelMode === v ? "default" : "secondary"} className="h-7 px-2 text-xs"
                  onClick={() => setLabelMode(v)}>
                  {l}
                </Button>
              ))}
            </div>
            {mode === "scale" ? (
              <div className="flex flex-wrap items-center gap-1.5" data-testid="over-chord">
                <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground" title="Colour the scale against a chord: chord tones, extensions, other tones">Over</span>
                <Button size="sm" variant={overChord === "own" ? "default" : "secondary"} className="h-7 px-2 text-xs" disabled={!scaleOwn}
                  onClick={() => setOverChord("own")}>
                  {scaleOwn ? `${pretty(chordName(scaleOwn))} · its own chord` : "No 1-3-5 chord in this scale"}
                </Button>
                <Button size="sm" variant={overChord === "chord" ? "default" : "secondary"} className="h-7 px-2 text-xs"
                  onClick={() => setOverChord("chord")}>
                  {pretty(`${root.name}${chord.suffix}`)} · from Chords
                </Button>
                <Button size="sm" variant={overChord === "off" ? "default" : "secondary"} className="h-7 px-2 text-xs"
                  onClick={() => setOverChord("off")}>
                  Off
                </Button>
              </div>
            ) : null}
            {mode === "scale" && MAJOR_MODES.includes(scaleId) ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground" title="Same root, different notes">Parallel</span>
                  {MAJOR_MODES.map((id) => (
                    <Button key={id} size="sm" variant={scaleId === id ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize"
                      onClick={() => pickScale(id)}>
                      {pretty(root.name)} {id}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground" title="Same notes, different root">Relative</span>
                  {MAJOR_MODES.map((id, j) => {
                    const parentPc = (root.pc - MAJOR_STEPS[MAJOR_MODES.indexOf(scaleId)]! + 12) % 12;
                    const names = [7, 2, 9, 4, 11, 6].includes(parentPc) ? SHARP_ROOTS : PREFERRED_ROOTS;
                    const n = names[(parentPc + MAJOR_STEPS[j]!) % 12]!;
                    return (
                      <Button key={id} size="sm" variant={scaleId === id ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize"
                        onClick={() => pickScale(id, n)}>
                        {pretty(n)} {id}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Parallel keeps the root and changes the notes; relative keeps the notes and moves the root.
                </p>
              </>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-14 text-[11px] uppercase tracking-widest text-muted-foreground">Links</span>
              {mode !== "arpeggio" ? (
                <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                  onClick={() => { setArpSrc([...degrees]); setArpId("full"); setMode("arpeggio"); resetEdits(); }}>
                  Arpeggiate these notes
                </Button>
              ) : (
                <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                  onClick={() => loadChord(root.name, arpSource)}>
                  Open source chord
                </Button>
              )}
              {mode === "chord" && !custom
                ? (chord.scales ?? []).map((id) => {
                    const s = SCALES.find((x) => x.id === id);
                    return s ? (
                      <Button key={id} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => pickScale(id)}>
                        {pretty(root.name)} {s.name}
                      </Button>
                    ) : null;
                  })
                : null}
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
            degrees={fbDegrees}
            focus={focus}
            neighbors={neighbors}
            pathKeys={pathKeys}
            pathOrder={pathway === "none" ? undefined : pathOrder}
            fretFrom={fretFrom}
            fretTo={fretTo}
            leftHanded={leftHanded}
            labelMode={labelMode}
            preferFlats={preferFlatsFor(root)}
            showAllNotes={showAllNotes || markMode}
            overlay={overlay}
            altered={custom ? altered : undefined}
            selected={sel}
            onSelect={markMode ? markFret : setSel}
            onShift={markMode || !editable ? undefined : shiftSelected}
          />
          {/* Zoom: the fret range. Fewer frets = bigger frets (the board keeps its width). */}
          <div className="flex items-center gap-3" data-testid="fret-zoom">
            <Label htmlFor="fret-zoom" className="shrink-0 text-xs uppercase tracking-widest">Zoom</Label>
            <Slider
              id="fret-zoom"
              className="min-w-0 flex-1"
              aria-label="Zoom: fret range"
              thumbLabels={["Lowest fret shown", "Highest fret shown"]}
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
            <span className="w-20 shrink-0 text-right font-mono text-xs text-muted-foreground" data-testid="fret-zoom-range">frets {fretFrom}–{fretTo}</span>
          </div>
          {overlay && overlayChord ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" data-testid="overlay-legend">
              <span>
                <span className="uppercase tracking-widest text-muted-foreground">Over</span>{" "}
                <span className="font-semibold">{pretty(chordName(overlayChord))}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-root" />
                <span className="h-3 w-3 rounded-full bg-third" />
                <span className="h-3 w-3 rounded-full bg-fifth" />
                <span className="h-3 w-3 rounded-full bg-seventh" />
                chord tones <span className="font-mono">{overlayGroups.chord.map(pretty).join(" ")}</span>
              </span>
              {overlayGroups.extension.length ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-extension" />
                  extensions <span className="font-mono">{overlayGroups.extension.map(pretty).join(" ")}</span>
                </span>
              ) : null}
              {overlayGroups.other.length ? (
                <span className="flex items-center gap-1" title="A half step above the 3rd or 7th — usually passed through rather than held">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary ring-1 ring-border" />
                  other scale tones <span className="font-mono">{overlayGroups.other.map(pretty).join(" ")}</span>
                  <span className="text-muted-foreground">(half step above a chord tone)</span>
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2 rounded-md border border-border/70 p-2" data-testid="caged-panel">
            <div className="flex flex-wrap items-center gap-1.5">
              <Switch id="caged" checked={cagedOn} onCheckedChange={(v) => { setCagedOn(v); setCagedIdx(0); if (v) setPosWin(null); }} aria-label="CAGED" />
              <Label htmlFor="caged" className="text-xs uppercase tracking-widest">CAGED</Label>
              {cagedOn ? (
                cagedAll.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Needs a 6+ string tuning and a fret range that contains a form.</span>
                ) : (
                  <>
                    <Button size="sm" variant={cagedOverview ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => setCagedIdx(-1)}>All CAGED</Button>
                    <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Previous CAGED position" onClick={() => setCagedIdx((i) => (i <= 0 ? cagedAll.length - 1 : i - 1))}>←</Button>
                    {cagedAll.map((p, i) => (
                      <Button key={`${p.form}-${p.from}`} size="sm" variant={i === cagedIdx ? "default" : "secondary"} className="h-7 px-2 font-mono text-xs"
                        onClick={() => setCagedIdx(i)}>
                        {p.form} {p.from}–{p.to}
                      </Button>
                    ))}
                    <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Next CAGED position" onClick={() => setCagedIdx((i) => (i + 1) % cagedAll.length)}>→</Button>
                    {cagedOverview ? <span className="text-[11px] text-muted-foreground">All {cagedAll.length} positions banded; pick one to focus.</span> : null}
                  </>
                )
              ) : null}
            </div>
            {cagedOn && cagedAll.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px]" data-testid="caged-legend">
                <span className="uppercase tracking-widest text-muted-foreground">Legend</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-root" />root ({pretty(root.name)})</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-third" />3rd</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-fifth" />5th</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-seventh" />7th</span>
                <span className="text-muted-foreground">· shape letter = CAGED chord form, not the key</span>
              </div>
            ) : null}
            {cagedOn && cagedOverview ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Layer</span>
                {(["chord", "scale", "arpeggio"] as const).map((l) => (
                  <Button key={l} size="sm" variant={cagedLayer === l ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize" onClick={() => setCagedLayer(l)}>
                    {l === "chord" ? "Chord tones" : l === "scale" ? `+ ${scale.name}` : `+ ${arp.name}`}
                  </Button>
                ))}
              </div>
            ) : null}
            {cagedOn && cagedPos ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Layer</span>
                  {(["chord", "scale", "arpeggio"] as const).map((l) => (
                    <Button key={l} size="sm" variant={cagedLayer === l ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize" onClick={() => setCagedLayer(l)}>
                      {l === "chord" ? "Chord tones" : l === "scale" ? `+ ${scale.name}` : `+ ${arp.name}`}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setFretFrom(cagedPos.from); setFretTo(Math.max(cagedPos.from + 3, cagedPos.to)); }}>
                    Set fret range to this position
                  </Button>
                </div>
                <p className="font-mono text-xs" data-testid="caged-info">
                  {cagedPos.form} shape · root on {pretty(tuning.strings[cagedPos.rootString]!.note)} string fret {cagedPos.rootFret} · chord tones{" "}
                  {cagedChord.map((d) => `${pretty(d)}=${pretty(spellDegree(root, d))}`).join("  ")}
                  {cagedLayer !== "chord" ? " · green = extensions (9/11/13), small grey = other tones" : ""}
                </p>
                {cagedScaleWin ? (
                  <div className="overflow-x-auto" data-testid="caged-scale-map">
                    <p className="text-[11px] text-muted-foreground">
                      {cagedLayer === "scale" ? scale.name : arp.name} in the {cagedPos.form} shape · frets {cagedScaleWin.from}–{cagedScaleWin.to} (high string first)
                    </p>
                    <table className="font-mono text-[11px]">
                      <tbody>
                        {mapSetInWindow(tuning, new Set(degreesToPitchClasses(fbDegrees).map((p) => (p + root.pc) % 12)), cagedScaleWin.from, cagedScaleWin.to)
                          .map((row, si) => ({ row, si }))
                          .reverse()
                          .map(({ row, si }) => (
                            <tr key={si}>
                              <td className="pr-2 font-semibold">{pretty(tuning.strings[si]!.note)}</td>
                              {row.map((m) => {
                                const d = degOfPc(m.pc);
                                return (
                                  <td key={m.fret} className={cn("px-1", m.pc === root.pc ? "font-bold text-root" : chordPcSet.has(m.pc) ? "text-foreground" : "text-muted-foreground")}>
                                    {m.fret}:{pretty(d)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {!editable ? <p className="text-[11px] text-muted-foreground">Drag editing is off while the overlay layer differs from the current {mode}.</p> : null}
              </>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Position</span>
              {[null, 4, 5].map((n) => (
                <Button key={String(n)} size="sm" variant={(posWin?.size ?? null) === n && !cagedOn ? "default" : "secondary"} className="h-7 px-2 text-xs"
                  onClick={() => { setCagedOn(false); setPosWin(n ? { start: posWin?.start ?? fretFrom, size: n } : null); }}>
                  {n ? `${n}-fret` : "Full neck"}
                </Button>
              ))}
              {posWin && !cagedOn ? (
                <>
                  <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Previous position" onClick={() => setPosWin((w) => w && { ...w, start: Math.max(fretFrom, w.start - 1) })}>←</Button>
                  <span className="font-mono text-xs" data-testid="pos-label">frets {posWin.start}–{posWin.start + posWin.size - 1}</span>
                  <Button size="sm" variant="secondary" className="h-7 px-2" aria-label="Next position" onClick={() => setPosWin((w) => w && { ...w, start: Math.min(fretTo - w.size + 1, w.start + 1) })}>→</Button>
                </>
              ) : null}
              <span className="mx-1 h-5 w-px bg-border" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Pathway</span>
              {(["none", "vertical", "horizontal", "diagonal"] as Pathway[]).map((k) => (
                <Button key={k} size="sm" variant={pathway === k ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize" onClick={() => setPathway(k)}>
                  {k === "diagonal" ? "diagonal (3/string)" : k}
                </Button>
              ))}
              {pathway === "horizontal" || pathway === "diagonal" ? (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPathPair((pair + 1) % Math.max(1, tuning.strings.length - (pathway === "diagonal" ? 2 : 1)))}>
                  Strings {pretty(tuning.strings[pair]!.note)}+{pretty(tuning.strings[pair + 1]?.note ?? "")}
                  {pathway === "diagonal" ? `+${pretty(tuning.strings[pair + 2]?.note ?? "")}` : ""} ↻
                </Button>
              ) : null}
            </div>
            {pathway !== "none" ? (
              <div className="space-y-1" data-testid="pathway-panel">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Start on</span>
                  {fbDegrees.map((d) => (
                    <Button key={d} size="sm" variant={d === startDeg ? "default" : "secondary"} className="h-7 min-w-8 px-1.5 font-mono text-xs" onClick={() => setPathStart(d)}>
                      {pretty(d)}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={!pathSteps.length} onClick={() => playSequence(pathSteps.map((p) => p.midi), 0.22)}>
                    ▶ Play pathway
                  </Button>
                </div>
                <p className="font-mono text-[11px]" data-testid="pathway-order">
                  {pathSteps.length
                    ? pathSteps.map((p) => pretty(degOfPc(p.pc))).join("–")
                    : `No ${pretty(startDeg)} inside this window.`}
                  {pathSteps.length ? <span className="text-muted-foreground"> · {pathSteps.length} notes · frets {Math.min(...pathSteps.map((x) => x.fret))}–{Math.max(...pathSteps.map((x) => x.fret))}{pathway === "diagonal" ? " · 3 notes per string" : ""}</span> : null}
                  {pathway === "diagonal" && focus && pathSteps.length > 0 && (pathSteps[0]!.fret < focus.from || pathSteps[0]!.fret > focus.to) ? (
                    <span className="block text-muted-foreground" data-testid="pathway-moved">
                      No {pretty(startDeg)} on the {pretty(tuning.strings[pair]!.note)} string inside frets {focus.from}–{focus.to}, so this is the nearest full shape.
                    </span>
                  ) : null}
                  {pathway === "diagonal" && pathSteps.length > 0 && pathSteps.length < 9 ? (
                    <span className="block text-muted-foreground" data-testid="pathway-cut">
                      The full 9-note shape runs off frets {fretFrom}–{fretTo}; widen the fret range to see the rest.
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
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
                {shape ? <Button size="sm" variant="ghost" onClick={() => { setShapeIdx(null); setPin(null); }}>Show all notes</Button> : null}
                {dev && shape ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border-2 font-bold hover:bg-red-500/15"
                    style={{ borderColor: "#ef4444", color: "#fca5a5" }}
                    data-testid="impossible-chord"
                    title="Developer mode: this shape can't actually be played — never suggest it again (listed in Develop)"
                    onClick={() => {
                      markImpossible(shape, tuning.id, title);
                      setImpNote(`Marked ${shapeToTab(shape)} (${pretty(title)}) as impossible — it won't be suggested again. It's listed in the Develop tab.`);
                      window.setTimeout(() => setImpNote(null), 4000);
                      setShapeIdx(null);
                      setPin(null);
                    }}
                  >
                    Impossible chord
                  </Button>
                ) : null}
              </div>
              {impNote ? <p role="status" className="rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300" data-testid="impossible-note">{impNote}</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {voicings.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No 4-finger shape found here — widen the fret range or allow inversions.</span>
                ) : (
                  voicings.map((v, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={(pinned ? sameShape(v.shape, pinned) : i === shapeIdx) ? "default" : "secondary"}
                      className="font-mono"
                      onClick={() => {
                        setPin(null);
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
          <DegreeAlter root={root} degrees={degrees} original={baseDegrees} onChange={(d) => commit(d)} />
          {mode === "scale" ? (
            <div className="rounded-md border border-border/70 p-2">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Modal family</p>
              <ModeFamily root={root} degrees={degrees} onPick={pickMode} />
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

          <div className="grid gap-4 sm:grid-cols-3">
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Switch id="soundpick" checked={soundOnPick} onCheckedChange={setSoundOnPick} />
                  <Label htmlFor="soundpick" className="text-xs text-muted-foreground">Sound on select</Label>
                </div>
                <InstrumentPicker />
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
              <TierTabs
                value={chordPick}
                onChange={(v) => { setChordPick(v); saveTierPick("explore.chord", v); }}
                counts={chordCounts}
                noun="chords"
                searching={searching}
              />
              {CHORD_FAMILIES.map((fam) => {
                const items = tierChords.filter((c) => c.family === fam);
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
              <TierTabs
                value={scalePick}
                onChange={(v) => { setScalePick(v); saveTierPick("explore.scale", v); }}
                counts={scaleCounts}
                noun="scales"
                searching={searching}
              />
              {SCALE_FAMILIES.map((fam) => {
                const items = tierScales.filter((s) => s.family === fam);
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
              <TierTabs
                value={arpPick}
                onChange={(v) => { setArpPick(v); saveTierPick("explore.arpeggio", v); }}
                counts={arpCounts}
                noun="arpeggios"
                searching={searching}
              />
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Source chord
                </p>
                <Select
                  value={chordId}
                  onValueChange={(v) => {
                    setChordId(v);
                    setArpSrc(null);
                    resetEdits();
                  }}
                >
                  <SelectTrigger className="sm:max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {arpSourceChords.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {`${root.name}${c.suffix} — ${c.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Source set:</span>
                  <span className="font-mono">{arpSource.map(pretty).join(" ")}</span>
                  <span className="text-muted-foreground">
                    ({arpSrc ? identify(root, degreesToPitchClasses(arpSrc), "chord").known?.name ?? "custom set" : `${pretty(root.name)}${pretty(chord.suffix)}`})
                  </span>
                  {custom ? (
                    <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                      onClick={() => { setArpSrc([...degrees]); setArpId("full"); resetEdits(); }}>
                      Use current edited notes as source
                    </Button>
                  ) : null}
                  {arpSrc ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setArpSrc(null); resetEdits(); }}>
                      Back to preset source
                    </Button>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Variants — result formula and change from the source
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {tierArps.map((a) => {
                    const out = a.transform(arpSource);
                    const removed = arpSource.filter((d) => !out.includes(d));
                    const added = out.filter((d) => !arpSource.includes(d));
                    const midis = out.map((d) => 48 + root.pc + degreeToSemitones(d));
                    const active = a.id === arpId && !custom;
                    return (
                      <div key={a.id} className={`rounded-md border px-2 py-1.5 text-xs ${active ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
                        <button type="button" className="block w-full text-left"
                          onClick={() => {
                            setArpId(a.id);
                            resetEdits();
                            if (soundOnPick) playSequence(midis, 0.16);
                          }}>
                          <span className="font-semibold">{a.name}</span>
                          <span className="block font-mono">{out.map(pretty).join(" ")}</span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {removed.length ? `− ${removed.map(pretty).join(" ")} ` : ""}
                            {added.length ? `+ ${added.map(pretty).join(" ")}` : ""}
                            {!removed.length && !added.length ? "unchanged" : ""}
                          </span>
                        </button>
                        <div className="mt-1 flex gap-2 text-[10px]">
                          <button type="button" className="text-primary" onClick={() => playSequence(midis, 0.16)}>Ascending</button>
                          <button type="button" className="text-primary" onClick={() => playChord(midis)}>Together</button>
                        </div>
                      </div>
                    );
                  })}
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
                tension={mode === "scale" && overlayChord ? { set: degrees, chord: overlayChord, label: chordName(overlayChord) } : undefined}
              />
            </div>
          </section>
        </div>

        <section>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">Identify notes</h3>
          <IdentifierPanel
            currentPcs={degreesToPitchClasses(degrees).map((p) => (p + root.pc) % 12)}
            shapePcs={userShape.flatMap((f, i) => (f === null ? [] : [(tuning.strings[i]!.pc + f) % 12]))}
            onLoad={(r) => (r.kind === "chord" ? loadChord(r.root.name, r.degrees) : pickScale(r.def.id, r.root.name))}
            onLoadScale={(r, id) => pickScale(id, r.name)}
            onLoadMode={pickMode}
          />
        </section>

        <section>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">Circle of fifths / fourths</h3>
          <CircleOfFifths rootPc={root.pc} onPickKey={(r, id) => pickScale(id, r)} onLoadChord={loadChord} />
        </section>

        {/* ------------------------------------------------ favorites */}
        <section className="panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
              Saved on this device <span className="font-mono text-xs text-muted-foreground">({favorites.length})</span>
            </h3>
            {saveNote ? (
              <span key={saveNote.id} role="status" className={cn("animate-in fade-in-0 rounded-md px-2 py-0.5 text-xs font-semibold", saveNote.saved ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>
                {saveNote.text}
              </span>
            ) : null}
          </div>
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
                      restoreShape(f.rootName, f.degrees, f.shape && f.tuningId ? { shape: f.shape, tuningId: f.tuningId } : undefined);
                    }}
                    title={f.shape ? "Opens with the shape you saved" : undefined}
                  >
                    <Star className="h-3 w-3 text-primary" />
                    {pretty(f.label)}
                    {f.shape ? <span className="text-primary" data-testid="favorite-shape">{voicingTab({ shape: f.shape })}</span> : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Unsave ${f.label}`}
                    title="Unsave"
                    className="ml-0.5 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-red-500/20 hover:text-red-300"
                    onClick={() => removeFavorite(f.id)}
                    data-testid="unsave"
                  >
                    <X className="h-3.5 w-3.5" />
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
            {...(currentVoicing ? { currentVoicing } : {})}
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
          <span className="mt-1 block">Piano sound: Salamander Grand Piano by Alexander Holm (CC BY 3.0).</span>
        </p>
      </main>
    </AppShell>
  );
}
