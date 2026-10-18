/** What the tuner remembers on this device: instrument, tuning per instrument, A4, custom tunings. */
import { DEFAULT_TUNING, INSTRUMENTS, notesText, stringsOf, tuningById, tuningsFor, type InstrumentId, type TuningString } from "./tunings";

export interface TunerSettings {
  instrument: InstrumentId;
  /** Chosen tuning id per instrument ("custom" for the instrument's custom tuning). */
  tuning: Partial<Record<InstrumentId, string>>;
  /** Concert pitch: A4 in Hz. */
  a4: number;
  /** Custom tunings per instrument, as MIDI notes low → high. */
  custom: Partial<Record<InstrumentId, number[]>>;
  /** Reference tone keeps sounding until tapped again. */
  hold: boolean;
}

export const A4_MIN = 415;
export const A4_MAX = 466;
const KEY = "fretlab.tuner.v1";

export const DEFAULT_SETTINGS: TunerSettings = { instrument: "guitar", tuning: { guitar: DEFAULT_TUNING }, a4: 440, custom: {}, hold: false };

export function sanitizeSettings(s: Partial<TunerSettings> | null | undefined): TunerSettings {
  const out: TunerSettings = { ...DEFAULT_SETTINGS, tuning: { ...DEFAULT_SETTINGS.tuning }, custom: {} };
  if (!s || typeof s !== "object") return out;
  if (INSTRUMENTS.some((i) => i.id === s.instrument)) out.instrument = s.instrument!;
  if (typeof s.a4 === "number" && Number.isFinite(s.a4)) out.a4 = Math.round(Math.min(A4_MAX, Math.max(A4_MIN, s.a4)));
  out.hold = !!s.hold;
  for (const inst of INSTRUMENTS) {
    const c = s.custom?.[inst.id];
    if (Array.isArray(c) && c.length >= 1 && c.length <= 12 && c.every((m) => Number.isInteger(m) && m >= 12 && m <= 96)) out.custom[inst.id] = [...c];
    const id = s.tuning?.[inst.id];
    if (id === "custom" ? !!out.custom[inst.id] : !!id && tuningById(id)?.instrument === inst.id) out.tuning[inst.id] = id!;
  }
  return out;
}

export function loadSettings(): TunerSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    return sanitizeSettings(raw ? (JSON.parse(raw) as Partial<TunerSettings>) : null);
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(s: TunerSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sanitizeSettings(s)));
  } catch {
    /* storage unavailable */
  }
}

export interface ActiveTuning {
  id: string;
  name: string;
  strings: TuningString[];
  note?: string | undefined;
  custom: boolean;
}

/** The instrument's standard tuning (first "Standard" listed). */
export const standardFor = (instrument: InstrumentId) => tuningsFor(instrument).find((t) => t.group === "Standard") ?? tuningsFor(instrument)[0]!;

/** The tuning currently chosen for the settings' instrument. */
export function activeTuning(s: TunerSettings): ActiveTuning {
  const inst = s.instrument;
  const id = s.tuning[inst];
  const custom = s.custom[inst];
  if (id === "custom" && custom) return { id: "custom", name: "Custom", strings: stringsOf({ notes: notesText(custom) }), custom: true };
  const t = (id && tuningById(id)) || standardFor(inst);
  return { id: t.id, name: t.name, strings: stringsOf(t), note: t.note, custom: false };
}
