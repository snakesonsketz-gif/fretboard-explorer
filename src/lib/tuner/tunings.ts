/**
 * Tunings for the Tuner tab. Each tuning lists its strings from the thickest (lowest) to the
 * thinnest, spelled the way players name them (E♭ standard is E♭ A♭ D♭ G♭ B♭ E♭, not D♯ …).
 */

export type InstrumentId = "guitar" | "guitar7" | "guitar8" | "bass" | "bass5" | "ukulele" | "other";

export interface Instrument {
  id: InstrumentId;
  name: string;
  strings: number | null;
}

export const INSTRUMENTS: Instrument[] = [
  { id: "guitar", name: "Guitar", strings: 6 },
  { id: "guitar7", name: "7-string", strings: 7 },
  { id: "guitar8", name: "8-string", strings: 8 },
  { id: "bass", name: "Bass", strings: 4 },
  { id: "bass5", name: "5-string bass", strings: 5 },
  { id: "ukulele", name: "Ukulele", strings: 4 },
  { id: "other", name: "Other", strings: null },
];

export type TuningGroup = "Standard" | "Lowered" | "Drop" | "Open" | "Alternate";

export interface Tuning {
  id: string;
  instrument: InstrumentId;
  name: string;
  group: TuningGroup;
  /** Low to high, e.g. "C2 G2 C3 F3 A3 D4". */
  notes: string;
  /** Short line on who uses it / why. */
  note?: string | undefined;
}

const T = (instrument: InstrumentId, id: string, group: TuningGroup, name: string, notes: string, note?: string): Tuning => ({ id, instrument, group, name, notes, note });

export const TUNINGS: Tuning[] = [
  // ---- 6-string guitar
  T("guitar", "standard", "Standard", "Standard", "E2 A2 D3 G3 B3 E4", "The default for almost everything."),
  T("guitar", "eb-standard", "Lowered", "E♭ standard (half step down)", "Eb2 Ab2 Db3 Gb3 Bb3 Eb4", "Hendrix, SRV, Guns N' Roses, Van Halen — slinkier strings, a darker sound."),
  T("guitar", "d-standard", "Lowered", "D standard (whole step down)", "D2 G2 C3 F3 A3 D4", "Heavier rock and grunge."),
  T("guitar", "csharp-standard", "Lowered", "C♯ standard", "C#2 F#2 B2 E3 G#3 C#4", "Metal and hard rock."),
  T("guitar", "c-standard", "Lowered", "C standard", "C2 F2 Bb2 Eb3 G3 C4", "Very low; heavier strings help."),
  T("guitar", "b-standard", "Lowered", "B standard (baritone)", "B1 E2 A2 D3 F#3 B3", "Baritone guitars and low metal."),
  T("guitar", "drop-d", "Drop", "Drop D", "D2 A2 D3 G3 B3 E4", "Only the low E goes down a whole step: one-finger power chords."),
  T("guitar", "drop-csharp", "Drop", "Drop C♯", "C#2 G#2 C#3 F#3 A#3 D#4", "Drop D, all a half step lower."),
  T("guitar", "drop-c", "Drop", "Drop C", "C2 G2 C3 F3 A3 D4", "D standard with the low string dropped to C: one-finger power chords, big and heavy. A favourite for metal and heavy rock."),
  T("guitar", "drop-b", "Drop", "Drop B", "B1 F#2 B2 E3 G#3 C#4", "Drop C a half step lower; modern metal."),
  T("guitar", "drop-asharp", "Drop", "Drop A♯ (B♭)", "Bb1 F2 Bb2 Eb3 G3 C4"),
  T("guitar", "drop-a", "Drop", "Drop A", "A1 E2 A2 D3 F#3 B3", "Very low; usually a baritone or heavy strings."),
  T("guitar", "double-drop-d", "Drop", "Double drop D", "D2 A2 D3 G3 B3 D4", "Both E strings down to D. Neil Young."),
  T("guitar", "open-g", "Open", "Open G", "D2 G2 D3 G3 B3 D4", "Strum open for a G chord. Keith Richards, slide."),
  T("guitar", "open-d", "Open", "Open D", "D2 A2 D3 F#3 A3 D4", "Strum open for a D chord. Slide and folk."),
  T("guitar", "open-e", "Open", "Open E", "E2 B2 E3 G#3 B3 E4", "Open D a step higher; slide guitar."),
  T("guitar", "open-a", "Open", "Open A", "E2 A2 E3 A3 C#4 E4", "Open G a step higher."),
  T("guitar", "open-c", "Open", "Open C", "C2 G2 C3 G3 C4 E4", "Big, ringing open C chord."),
  T("guitar", "open-dm", "Open", "Open D minor", "D2 A2 D3 F3 A3 D4", "Skip James blues; dark and open."),
  T("guitar", "open-em", "Open", "Open E minor", "E2 B2 E3 G3 B3 E4"),
  T("guitar", "open-gm", "Open", "Open G minor", "D2 G2 D3 G3 Bb3 D4"),
  T("guitar", "dadgad", "Alternate", "DADGAD", "D2 A2 D3 G3 A3 D4", "Celtic and acoustic; Led Zeppelin's Kashmir."),
  T("guitar", "cgcgcd", "Alternate", "CGCGCD", "C2 G2 C3 G3 C4 D4", "Deep, open, droning."),
  T("guitar", "all-fourths", "Alternate", "All fourths", "E2 A2 D3 G3 C4 F4", "Every string a fourth apart: the same shape everywhere."),
  T("guitar", "nashville", "Alternate", "Nashville (high strung)", "E3 A3 D4 G4 B3 E4", "The four low strings an octave up (12-string's light strings)."),
  T("guitar", "new-standard", "Alternate", "New standard (Fripp)", "C2 G2 D3 A3 E4 G4", "Robert Fripp's fifths tuning."),
  T("guitar", "a-baritone", "Lowered", "A standard (baritone)", "A1 D2 G2 C3 E3 A3"),

  // ---- 7-string
  T("guitar7", "7-standard", "Standard", "Standard (B)", "B1 E2 A2 D3 G3 B3 E4"),
  T("guitar7", "7-drop-a", "Drop", "Drop A", "A1 E2 A2 D3 G3 B3 E4"),
  T("guitar7", "7-a-standard", "Lowered", "A standard", "A1 D2 G2 C3 F3 A3 D4"),
  T("guitar7", "7-drop-g", "Drop", "Drop G", "G1 D2 G2 C3 F3 A3 D4"),
  T("guitar7", "7-bb-standard", "Lowered", "B♭ standard", "Bb1 Eb2 Ab2 Db3 Gb3 Bb3 Eb4"),

  // ---- 8-string
  T("guitar8", "8-standard", "Standard", "Standard (F♯)", "F#1 B1 E2 A2 D3 G3 B3 E4"),
  T("guitar8", "8-drop-e", "Drop", "Drop E", "E1 B1 E2 A2 D3 G3 B3 E4"),
  T("guitar8", "8-e-standard", "Lowered", "E standard", "E1 A1 D2 G2 C3 F3 A3 D4"),

  // ---- bass
  T("bass", "bass-standard", "Standard", "Standard", "E1 A1 D2 G2"),
  T("bass", "bass-eb", "Lowered", "E♭ standard", "Eb1 Ab1 Db2 Gb2"),
  T("bass", "bass-d-standard", "Lowered", "D standard", "D1 G1 C2 F2"),
  T("bass", "bass-drop-d", "Drop", "Drop D", "D1 A1 D2 G2"),
  T("bass", "bass-drop-c", "Drop", "Drop C", "C1 G1 C2 F2", "Matches a guitar in Drop C."),
  T("bass5", "bass5-standard", "Standard", "Standard (low B)", "B0 E1 A1 D2 G2"),
  T("bass5", "bass5-high-c", "Alternate", "High C", "E1 A1 D2 G2 C3"),
  T("bass5", "bass5-drop-a", "Drop", "Drop A", "A0 E1 A1 D2 G2"),

  // ---- ukulele
  T("ukulele", "uke-standard", "Standard", "Standard (high G)", "G4 C4 E4 A4", "Re-entrant: the G string is the high one."),
  T("ukulele", "uke-low-g", "Alternate", "Low G", "G3 C4 E4 A4"),
  T("ukulele", "uke-d", "Alternate", "D tuning", "A4 D4 F#4 B4"),
  T("ukulele", "uke-baritone", "Standard", "Baritone", "D3 G3 B3 E4"),

  // ---- other
  T("other", "banjo-open-g", "Open", "Banjo — open G", "G4 D3 G3 B3 D4", "The short 5th string is the high G."),
  T("other", "mandolin", "Standard", "Mandolin", "G3 D4 A4 E5"),
  T("other", "violin", "Standard", "Violin", "G3 D4 A4 E5"),
  T("other", "cello", "Standard", "Cello", "C2 G2 D3 A3"),
];

/** The quick-pick chips at the top of the tuner. */
export const FAVORITE_TUNINGS = ["standard", "drop-d", "drop-c", "eb-standard", "d-standard", "drop-b", "open-g", "dadgad"];
export const DEFAULT_TUNING = "standard";

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#2" → 37, "Eb4" → 63 (MIDI numbers, C4 = 60). */
export function parseNote(s: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s.trim());
  if (!m) throw new Error(`bad note ${s}`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]!]! + acc;
}

export interface TuningString {
  /** 1 = thinnest, as guitarists count. */
  number: number;
  midi: number;
  /** As spelled in the tuning, with ♯/♭: "C♯", "E♭". */
  name: string;
  octave: number;
}

export const prettyAcc = (s: string) => s.replace("#", "♯").replace(/(?<=[A-G])b/, "♭");

/** The strings of a tuning, low to high. */
export function stringsOf(t: Pick<Tuning, "notes">): TuningString[] {
  const parts = t.notes.trim().split(/\s+/);
  return parts.map((p, i) => {
    const m = /^([A-G][#b]?)(-?\d)$/.exec(p)!;
    return { number: parts.length - i, midi: parseNote(p), name: prettyAcc(m[1]!), octave: Number(m[2]) };
  });
}

export const tuningById = (id: string) => TUNINGS.find((t) => t.id === id);
export const tuningsFor = (instrument: InstrumentId) => TUNINGS.filter((t) => t.instrument === instrument);
export const GROUP_ORDER: TuningGroup[] = ["Standard", "Drop", "Lowered", "Open", "Alternate"];

/** Pitch of a MIDI note for a given A4 (440 by default), with an optional cents offset. */
export const midiHz = (midi: number, a4 = 440, cents = 0) => a4 * 2 ** ((midi - 69 + cents / 100) / 12);

const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
/** Name of a MIDI note, sharps or flats. */
export const midiName = (midi: number, flats = false) => (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12]!;
export const midiOctave = (midi: number) => Math.floor(midi / 12) - 1;

/** Plain notes text for a list of MIDI notes ("C2 G2 …"), for custom tunings. */
export function notesText(midis: number[], flats = false): string {
  return midis.map((m) => `${midiName(m, flats).replace("♯", "#").replace("♭", "b")}${midiOctave(m)}`).join(" ");
}

/** "C G C F A D" — the usual short way to write a tuning. */
export const shortName = (t: Pick<Tuning, "notes">) => stringsOf(t).map((s) => s.name).join(" ");
