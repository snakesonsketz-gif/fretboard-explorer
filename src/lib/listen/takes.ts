/**
 * Develop tab: recorded "takes" for tuning Listen mode on real guitars.
 *
 * A take is a short recording of one chord, labelled with what the player actually did (clean,
 * a wrong note, a muted string, buzz). Takes are analysed with exactly the code Listen uses
 * (ListenSession streaming), measured once, then re-judged instantly with any thresholds — so
 * the scorecard shows straight away whether clean strums come out clean and mistakes get caught.
 * Takes stay on this device (IndexedDB) until exported.
 */
import { bandFloor, detectOnsets, rms, spectrumOf } from "./dsp";
import { judgeStrum, type StrumMeasure, type StrumReport, type TargetChord, type Thresholds } from "./score";
import { ListenSession, type AudioSource } from "./session";

export type TakeLabel = "clean" | "wrong-note" | "muted" | "buzz" | "other";

export const TAKE_LABELS: { id: TakeLabel; name: string; hint: string }[] = [
  { id: "clean", name: "Clean", hint: "Played the chord right — Fretlab should find nothing wrong." },
  { id: "wrong-note", name: "Wrong note", hint: "Fretted a note that isn't in the chord on purpose." },
  { id: "muted", name: "Muted string", hint: "Touched or muted a string so a chord note is missing or dies." },
  { id: "buzz", name: "Buzz", hint: "Pressed lightly or behind the fret so a string buzzes." },
  { id: "other", name: "Other", hint: "Anything else — not counted in the scorecard." },
];

export interface Take {
  id: string;
  at: number;
  target: TargetChord;
  label: TakeLabel;
  /** Free text, e.g. "muted the B string". */
  note: string;
  sampleRate: number;
  /** Mono audio, 16-bit (half the storage of float). */
  pcm: Int16Array;
  source: "mic" | "file";
  /** Where it was recorded (browser/phone), to compare devices. */
  device: string;
  fileName?: string;
  /** Room noise measured on the quiet lead-in before silence was trimmed (see trimSilence). */
  roomFloor?: number;
  /** Length before trimming (seconds). */
  originalSeconds?: number;
  /** Guided recording: which plan step, the tab played, and how many strums were asked for. */
  step?: string;
  tab?: string;
  expected?: number;
  /** Loaded from someone else's export (.zip name), not recorded on this device. */
  imported?: string;
}

export interface TakeStrum {
  time: number;
  measure: StrumMeasure;
}

// ---------------------------------------------------------------- audio helpers

export function toPcm(x: Float32Array): Int16Array {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(x[i]! * 32767)));
  return out;
}

export function toFloat(p: Int16Array): Float32Array {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) out[i] = p[i]! / 32767;
  return out;
}

/** A 16-bit mono WAV file. */
export function encodeWav(pcm: Int16Array, sampleRate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

// ---------------------------------------------------------------- silence trimming

const PRE_ROLL = 0.15; // s kept before each strum (onset detection needs a little quiet before it)
const TAIL = 0.25; // s kept after a strum has rung out
const QUIET_HOLD = 0.3; // s the level must stay down for a strum to count as rung out

/**
 * Keep only the sound: each strum from just before it starts until it has fully rung out (back
 * down near the room's noise), joined end to end. The room-noise reading the buzz measure needs
 * is taken from the quiet lead-in *before* that silence is cut, and returned with the audio.
 * Returns null if no strum was found.
 */
export function trimSilence(x: Float32Array, sr: number): { audio: Float32Array; roomFloor?: number; strums: number } | null {
  const onsets = detectOnsets(x, sr);
  if (!onsets.length) return null;
  const hop = Math.round(0.01 * sr);
  const env: number[] = [];
  for (let i = 0; i + hop <= x.length; i += hop) env.push(rms(x, i, i + hop));
  // Room level: the lead-in before the first strum (or, without one, the quietest tenth).
  const leadFrames = Math.floor((onsets[0]! - 0.05 * sr) / hop);
  const ref = (leadFrames >= 20 ? env.slice(0, leadFrames) : [...env]).sort((a, b) => a - b);
  const room = Math.max(1e-5, ref[Math.floor(ref.length * (leadFrames >= 20 ? 0.5 : 0.1))] ?? 1e-5);
  const quietLevel = room * 2; // ~6 dB above the room: "rung out"
  // Spectral room reference for the buzz measure: quietest 16384-sample stretch of the lead-in.
  let roomFloor: number | undefined;
  const leadEnd = onsets[0]! - Math.round(0.05 * sr);
  if (leadEnd >= 16384) {
    let best = -1, bestRms = Infinity;
    for (let from = 0; from + 16384 <= leadEnd; from += 4096) {
      const r = rms(x, from, from + 16384);
      if (r < bestRms) {
        bestRms = r;
        best = from;
      }
    }
    const w = new Float32Array(16384);
    w.set(x.subarray(best, best + 16384));
    roomFloor = bandFloor(spectrumOf(w, sr));
  }
  // One stretch per strum: pre-roll .. rung out (level held near the room) + tail.
  const hold = Math.round(QUIET_HOLD / 0.01);
  const spans = onsets.map((o) => {
    let k = Math.floor((o + 0.3 * sr) / hop);
    let run = 0;
    for (; k < env.length; k++) {
      run = env[k]! < quietLevel ? run + 1 : 0;
      if (run >= hold) break;
    }
    const end = k >= env.length ? x.length : (k - hold + 1) * hop + Math.round(TAIL * sr);
    return [Math.max(0, o - Math.round(PRE_ROLL * sr)), Math.min(x.length, end)] as [number, number];
  });
  // Merge stretches that touch (a strum played before the last one rang out keeps its overlap).
  const merged: [number, number][] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp[0] <= last[1] + Math.round(0.05 * sr)) last[1] = Math.max(last[1], sp[1]);
    else merged.push([...sp]);
  }
  // Join with a 5 ms crossfade so the seams are silent.
  const fade = Math.round(0.005 * sr);
  const total = merged.reduce((a, [s, e]) => a + (e - s), 0) - fade * (merged.length - 1);
  const out = new Float32Array(Math.max(0, total));
  let pos = 0;
  merged.forEach(([s, e], i) => {
    for (let j = 0; j < e - s; j++) {
      const v = x[s + j]!;
      if (i > 0 && j < fade) out[pos + j]! += v * (j / fade);
      else if (i < merged.length - 1 && j >= e - s - fade) out[pos + j] = v * ((e - s - j) / fade);
      else out[pos + j] = v;
    }
    pos += e - s - fade;
  });
  return { audio: out, ...(roomFloor !== undefined ? { roomFloor } : {}), strums: onsets.length };
}

// ---------------------------------------------------------------- analysis

/**
 * Find and measure every strum in a take, exactly as Listen would hear it live: the audio is
 * fed in 2048-sample blocks through a ListenSession (onsets, room reference, ring-out until the
 * next strum). Thresholds don't affect the measurements, so this runs once per take.
 */
export function analyseTake(take: Pick<Take, "pcm" | "sampleRate" | "target" | "roomFloor">): TakeStrum[] {
  const audio = toFloat(take.pcm);
  let n = 0;
  const src: AudioSource = {
    sampleRate: take.sampleRate,
    get endFrame() {
      return n;
    },
    firstFrame: 0,
    read: (a, b) => (a < 0 || b > n || b <= a ? null : audio.slice(a, b)),
  };
  const session = new ListenSession(src, () => ({ target: take.target }));
  if (take.roomFloor !== undefined) {
    session.roomFloor = take.roomFloor; // measured before the silence was trimmed
    session.lockRoom = true;
  }
  for (n = 2048; n <= audio.length; n += 2048) if ((n / 2048) % 2 === 0) session.tick();
  n = audio.length;
  session.tick(true); // recording over: finish the last strum's ring-out with the audio there is
  return session.strums.filter((s) => s.measure).map((s) => ({ time: s.frame / take.sampleRate, measure: s.measure! }));
}

export const judgeTake = (strums: TakeStrum[], target: TargetChord, T: Thresholds): StrumReport[] => strums.map((s) => judgeStrum(s.measure, target, T));

// ---------------------------------------------------------------- scorecard

export interface ScoreLine {
  label: TakeLabel;
  takes: number;
  strums: number;
  /** clean: strums with nothing flagged; others: strums where the mistake was caught. */
  good: number;
  /** clean: strums flagged by mistake; others: mistakes missed. */
  bad: number;
  /** Strums Fretlab couldn't judge (too quiet, too noisy). */
  unsure: number;
  /** wrong-note: caught only as "maybe". */
  maybe: number;
  /** clean: what raised the false alarms. */
  why: Record<string, number>;
}

/** Did the report catch what the label says happened? */
export function verdictFor(label: TakeLabel, r: StrumReport): { result: "good" | "bad" | "unsure" | "maybe"; why?: string } {
  if (r.level.tooQuiet) return { result: "unsure", why: "too quiet" };
  switch (label) {
    case "clean": {
      const why = [
        r.accuracy.extras.some((e) => e.status === "wrong") ? "extra note" : "",
        r.accuracy.notes.some((n) => n.status === "missing") ? "missing note" : "",
        r.clarity.buzz === "some" || r.clarity.buzz === "strong" ? "buzz" : "",
        r.clarity.dead.length ? "dead note" : "",
        r.ringOut.verdict === "fix" && !r.clarity.dead.length ? "short ring" : "",
      ].filter(Boolean);
      if (why.length) return { result: "bad", why: why.join(" + ") };
      return r.accuracy.verdict === "unsure" && r.clarity.verdict === "unsure" ? { result: "unsure" } : { result: "good" };
    }
    case "wrong-note":
      if (r.accuracy.extras.some((e) => e.status === "wrong")) return { result: "good" };
      if (r.accuracy.extras.some((e) => e.status === "maybe")) return { result: "maybe" };
      return r.accuracy.verdict === "unsure" ? { result: "unsure" } : { result: "bad" };
    case "muted":
      if (r.accuracy.notes.some((n) => n.status === "missing") || r.clarity.dead.length) return { result: "good" };
      // A muted note can sit exactly on another note's overtone (a muted 5th under the root's
      // 3rd partial): Fretlab says "can't tell" — unsure, not a miss.
      if (r.accuracy.verdict === "unsure" || r.accuracy.notes.some((n) => n.status === "hidden" || n.status === "overtone" || n.status === "faint"))
        return { result: "unsure", why: "muted note hidden by overtones" };
      return { result: "bad" };
    case "buzz":
      if (r.clarity.buzz === "some" || r.clarity.buzz === "strong") return { result: "good" };
      return r.clarity.buzz === "unknown" ? { result: "unsure", why: "room too noisy" } : { result: "bad" };
    default:
      return { result: "unsure" };
  }
}

/** Strum detection on guided steps: strums found vs strums the step asked for. */
export function strumDetection(takes: Take[], measured: Map<string, TakeStrum[]>) {
  const asked = takes.filter((t) => t.expected && measured.has(t.id));
  const found = asked.reduce((a, t) => a + measured.get(t.id)!.length, 0);
  const expected = asked.reduce((a, t) => a + t.expected!, 0);
  return { steps: asked.length, exact: asked.filter((t) => measured.get(t.id)!.length === t.expected).length, found, expected };
}

export function scorecard(takes: { label: TakeLabel; reports: StrumReport[] }[]): ScoreLine[] {
  return TAKE_LABELS.filter((l) => l.id !== "other").map(({ id }) => {
    const mine = takes.filter((t) => t.label === id);
    const line: ScoreLine = { label: id, takes: mine.length, strums: 0, good: 0, bad: 0, unsure: 0, maybe: 0, why: {} };
    for (const t of mine)
      for (const r of t.reports) {
        line.strums++;
        const v = verdictFor(id, r);
        line[v.result]++;
        if (v.result === "bad" && v.why) for (const w of v.why.split(" + ")) line.why[w] = (line.why[w] ?? 0) + 1;
      }
    return line;
  });
}

// ---------------------------------------------------------------- zip (stored, no compression)

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(d: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A .zip of the given files (stored: WAV barely compresses, and this keeps it tiny and exact). */
export function makeZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint32(14, crc, true);
    lv.setUint32(18, f.data.length, true);
    lv.setUint32(22, f.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, f.data.length, true);
    cv.setUint32(24, f.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    parts.push(local, f.data);
    central.push(cen);
    offset += local.length + f.data.length;
  }
  const cenSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cenSize, true);
  ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of all) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Everything needed to re-tune the defaults: WAVs, labels, what Fretlab measured, thresholds. */
export function exportTakes(takes: Take[], measured: Map<string, TakeStrum[]>, thresholds: Thresholds): Uint8Array {
  const slug = (s: string) => s.replace(/[^a-z0-9#]+/gi, "-").replace(/#/g, "sharp").replace(/^-|-$/g, "");
  const files: { name: string; data: Uint8Array }[] = [];
  const meta = takes.map((t, i) => {
    const file = `takes/${String(i + 1).padStart(2, "0")}-${t.label}-${slug(t.target.label)}.wav`;
    files.push({ name: file, data: encodeWav(t.pcm, t.sampleRate) });
    return {
      file,
      recorded: new Date(t.at).toISOString(),
      label: t.label,
      note: t.note,
      target: t.target,
      sampleRate: t.sampleRate,
      seconds: +(t.pcm.length / t.sampleRate).toFixed(2),
      source: t.source,
      device: t.device,
      ...(t.fileName ? { fileName: t.fileName } : {}),
      ...(t.step ? { step: t.step, tab: t.tab, strumsAsked: t.expected } : {}),
      strumsFound: (measured.get(t.id) ?? []).length,
      ...(t.originalSeconds !== undefined ? { secondsBeforeTrim: t.originalSeconds } : {}),
      roomFloorFromLeadIn: t.roomFloor ?? null,
      ...(t.imported ? { importedFrom: t.imported } : {}),
      strums: (measured.get(t.id) ?? []).map((s) => ({
        time: +s.time.toFixed(3),
        peakDb: +s.measure.peakDb.toFixed(1),
        notes: s.measure.chord.target.map((n) => ({ pc: n.pc, strength: +n.strength.toFixed(3) })),
        extras: s.measure.chord.extras.map((e) => ({ pc: e.pc, strength: +e.strength.toFixed(3) })),
        bandFloor: s.measure.bandFloor,
        roomFloor: s.measure.roomFloor ?? null,
        noiseRelDb: +s.measure.noiseRelDb.toFixed(1),
        ringSeconds: +s.measure.ring.seconds.toFixed(2),
        noteRing: s.measure.ring.notes.filter((n) => n.separable).map((n) => ({ midi: n.midi, seconds: +n.seconds.toFixed(2), early: +n.early.toFixed(4), stillRinging: n.stillRinging })),
      })),
    };
  });
  const json = (o: unknown) => new TextEncoder().encode(JSON.stringify(o, null, 2));
  files.push({ name: "takes.json", data: json(meta) }, { name: "thresholds.json", data: json(thresholds) });
  return makeZip(files);
}

// ---------------------------------------------------------------- import (someone else's export)

/** Files in a .zip — stored or deflated entries (a zip re-packed by an email or drive app). */
export async function readZip(bytes: Uint8Array): Promise<{ name: string; data: Uint8Array }[]> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("not a zip file");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: { name: string; data: Uint8Array }[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("damaged zip directory");
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    if (method === 0) out.push({ name, data: raw });
    else if (method === 8 && typeof DecompressionStream !== "undefined")
      out.push({ name, data: new Uint8Array(await new Response(new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()) });
  }
  return out;
}

/** 16-bit PCM WAV (as exported) → mono samples. Null for any other kind of audio. */
export function readWav(bytes: Uint8Array): { pcm: Int16Array; sampleRate: number } | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  let channels = 1, rate = 0, bits = 0, format = 0;
  for (let p = 12; p + 8 <= bytes.length; ) {
    const id = tag(p), size = v.getUint32(p + 4, true);
    if (id === "fmt ") {
      format = v.getUint16(p + 8, true);
      channels = v.getUint16(p + 10, true);
      rate = v.getUint32(p + 12, true);
      bits = v.getUint16(p + 22, true);
    } else if (id === "data") {
      if (format !== 1 || bits !== 16 || !rate) return null;
      const frames = Math.floor(Math.min(size, bytes.length - p - 8) / (2 * channels));
      const pcm = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += v.getInt16(p + 8 + 2 * (i * channels + c), true);
        pcm[i] = Math.round(sum / channels);
      }
      return { pcm, sampleRate: rate };
    }
    p += 8 + size + (size % 2);
  }
  return null;
}

/** Same recording already here? (recorded time, label, chord and length) */
const takeKey = (t: Pick<Take, "at" | "label" | "target" | "pcm" | "sampleRate">) => `${t.at}|${t.label}|${t.target.label}|${(t.pcm.length / t.sampleRate).toFixed(2)}`;

/**
 * Takes from a Fretlab export (.zip from "Export all" / "Export & send"), ready to save on this
 * device. Recordings already here are skipped.
 */
export async function importTakes(bytes: Uint8Array, zipName: string, existing: Take[]): Promise<{ takes: Take[]; skipped: number; thresholds?: Partial<Thresholds> }> {
  const files = await readZip(bytes);
  const byName = new Map(files.map((f) => [f.name, f.data]));
  const metaFile = byName.get("takes.json");
  if (!metaFile) throw new Error("this zip has no takes.json — it isn't a Fretlab export");
  type Meta = { file: string; recorded: string; label: TakeLabel; note?: string; target: TargetChord; source?: "mic" | "file"; device?: string; fileName?: string; step?: string; tab?: string; strumsAsked?: number; secondsBeforeTrim?: number; roomFloorFromLeadIn?: number | null; importedFrom?: string };
  const meta = JSON.parse(new TextDecoder().decode(metaFile)) as Meta[];
  const have = new Set(existing.map(takeKey));
  const takes: Take[] = [];
  let skipped = 0;
  for (const m of meta) {
    const wav = byName.get(m.file);
    const audio = wav ? readWav(wav) : null;
    if (!audio || !m.target?.rootName || !Array.isArray(m.target.degrees)) {
      skipped++;
      continue;
    }
    const t: Take = {
      id: newTakeId(),
      at: Date.parse(m.recorded) || Date.now(),
      target: { rootName: m.target.rootName, degrees: m.target.degrees, label: m.target.label ?? m.target.rootName },
      label: TAKE_LABELS.some((l) => l.id === m.label) ? m.label : "other",
      note: m.note ?? "",
      sampleRate: audio.sampleRate,
      pcm: audio.pcm,
      source: m.source === "file" ? "file" : "mic",
      device: m.device ?? "unknown",
      ...(m.fileName ? { fileName: m.fileName } : {}),
      ...(typeof m.roomFloorFromLeadIn === "number" ? { roomFloor: m.roomFloorFromLeadIn } : {}),
      ...(typeof m.secondsBeforeTrim === "number" ? { originalSeconds: m.secondsBeforeTrim } : {}),
      ...(m.step ? { step: m.step, ...(m.tab ? { tab: m.tab } : {}), ...(m.strumsAsked ? { expected: m.strumsAsked } : {}) } : {}),
      imported: m.importedFrom ?? zipName,
    };
    if (have.has(takeKey(t))) {
      skipped++;
      continue;
    }
    have.add(takeKey(t));
    takes.push(t);
  }
  const th = byName.get("thresholds.json");
  let thresholds: Partial<Thresholds> | undefined;
  try {
    thresholds = th ? (JSON.parse(new TextDecoder().decode(th)) as Partial<Thresholds>) : undefined;
  } catch {
    thresholds = undefined;
  }
  return { takes, skipped, ...(thresholds ? { thresholds } : {}) };
}

// ---------------------------------------------------------------- storage (IndexedDB, this device)

const DB = "fretlab-develop";
const STORE = "takes";

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function saveTake(t: Take): Promise<boolean> {
  return (await run("readwrite", (s) => s.put(t))) !== null;
}
export async function listTakes(): Promise<Take[]> {
  return ((await run<Take[]>("readonly", (s) => s.getAll())) ?? []).sort((a, b) => b.at - a.at);
}
export async function deleteTake(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}
export async function clearTakes(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}

export const newTakeId = () => Math.random().toString(36).slice(2, 10);

/** Short description of this browser/phone for the export (no personal data). */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "other";
  const br = /CriOS|Chrome/.test(ua) && !/Edg/.test(ua) ? "Chrome" : /Edg/.test(ua) ? "Edge" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "browser";
  const app = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ? " (Android app)" : "";
  return `${os} · ${br}${app}`;
}
