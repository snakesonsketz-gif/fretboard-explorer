/**
 * A small reader for standard MIDI files (.mid / .midi, formats 0, 1 and 2). It pulls out every
 * note with its start, length, velocity, channel and track, the tempo map, the time signature,
 * track names and instruments — all that's needed to turn a file into tab.
 */

export interface MidiNote {
  midi: number;
  /** Start and length in ticks and seconds. */
  ticks: number;
  durTicks: number;
  time: number;
  dur: number;
  velocity: number;
  channel: number;
}

export interface MidiTrack {
  /** Index in the list of tracks shown to the player. */
  index: number;
  name: string;
  channel: number;
  program: number;
  instrument: string;
  isDrums: boolean;
  notes: MidiNote[];
}

export interface MidiFile {
  format: number;
  /** Ticks per quarter note. */
  ppq: number;
  tracks: MidiTrack[];
  tempos: { ticks: number; bpm: number }[];
  timeSig: { num: number; den: number };
  /** Length in seconds. */
  duration: number;
  bpm: number;
}

const FAMILIES = ["Piano", "Chromatic percussion", "Organ", "Guitar", "Bass", "Strings", "Ensemble", "Brass", "Reed", "Pipe", "Synth lead", "Synth pad", "Synth effects", "Ethnic", "Percussive", "Sound effects"];
const GUITARS = ["Nylon guitar", "Steel guitar", "Jazz guitar", "Clean guitar", "Muted guitar", "Overdriven guitar", "Distortion guitar", "Guitar harmonics"];
const BASSES = ["Acoustic bass", "Finger bass", "Pick bass", "Fretless bass", "Slap bass 1", "Slap bass 2", "Synth bass 1", "Synth bass 2"];

export function instrumentName(program: number, drums: boolean): string {
  if (drums) return "Drums";
  if (program >= 24 && program < 32) return GUITARS[program - 24]!;
  if (program >= 32 && program < 40) return BASSES[program - 32]!;
  if (program === 0) return "Piano";
  return FAMILIES[Math.floor(program / 8)] ?? "Instrument";
}

export class MidiError extends Error {}

export function parseMidi(input: ArrayBuffer | Uint8Array): MidiFile {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  const need = (n: number) => {
    if (p + n > b.length) throw new MidiError("The file ends too early — it may be damaged.");
  };
  const u8 = () => {
    need(1);
    return b[p++]!;
  };
  const u16 = () => {
    need(2);
    return (b[p++]! << 8) | b[p++]!;
  };
  const u32 = () => {
    need(4);
    return ((b[p++]! << 24) >>> 0) + (b[p++]! << 16) + (b[p++]! << 8) + b[p++]!;
  };
  const str = (n: number) => {
    need(n);
    return String.fromCharCode(...b.subarray(p, (p += n)));
  };
  const vlq = () => {
    let v = 0;
    for (let k = 0; k < 4; k++) {
      const c = u8();
      v = (v << 7) | (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    return v;
  };

  // Some files carry a RIFF wrapper (.rmi).
  if (b.length < 14) throw new MidiError("Not a MIDI file.");
  if (str(4) === "RIFF") {
    const at = indexOf(b, "MThd");
    if (at < 0) throw new MidiError("Not a MIDI file.");
    p = at + 4;
  } else {
    p = 0;
    if (str(4) !== "MThd") throw new MidiError("Not a MIDI file (no MThd header).");
  }
  const hlen = u32();
  const hstart = p;
  const format = u16();
  const ntrks = u16();
  const division = u16();
  p = hstart + hlen;
  // SMPTE timing is rare; treat it as 480 ticks per beat at its frame rate.
  const ppq = division & 0x8000 ? 480 : division || 480;

  type Raw = { ticks: number; type: "on" | "off"; ch: number; key: number; vel: number };
  const rawTracks: { name: string; events: Raw[]; programs: Map<number, number> }[] = [];
  const tempos: { ticks: number; uspq: number }[] = [];
  let timeSig = { num: 4, den: 4 };
  let sigSet = false;

  for (let t = 0; t < ntrks && p < b.length; t++) {
    // Skip unknown chunks.
    let id = str(4);
    let len = u32();
    while (id !== "MTrk") {
      p += len;
      if (p + 8 > b.length) break;
      id = str(4);
      len = u32();
    }
    if (id !== "MTrk") break;
    const end = Math.min(b.length, p + len);
    let ticks = 0;
    let status = 0;
    let name = "";
    const events: Raw[] = [];
    const programs = new Map<number, number>();
    while (p < end) {
      ticks += vlq();
      let s = b[p]!;
      if (s & 0x80) p++;
      else s = status; // running status
      if (s === 0xff) {
        const type = u8();
        const l = vlq();
        const data = b.subarray(p, p + l);
        p += l;
        if (type === 0x03 && !name) name = String.fromCharCode(...data).trim();
        else if (type === 0x51 && l === 3) tempos.push({ ticks, uspq: (data[0]! << 16) | (data[1]! << 8) | data[2]! });
        else if (type === 0x58 && l >= 2 && !sigSet) {
          timeSig = { num: data[0]!, den: 2 ** data[1]! };
          sigSet = true;
        } else if (type === 0x2f) break;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) {
        p += vlq();
        continue;
      }
      status = s;
      const kind = s & 0xf0;
      const ch = s & 0x0f;
      if (kind === 0x80 || kind === 0x90) {
        const key = u8();
        const vel = u8();
        events.push({ ticks, type: kind === 0x90 && vel > 0 ? "on" : "off", ch, key, vel });
      } else if (kind === 0xc0) {
        const prog = u8();
        if (!programs.has(ch)) programs.set(ch, prog);
      } else if (kind === 0xd0) p += 1;
      else if (kind === 0xa0 || kind === 0xb0 || kind === 0xe0) p += 2;
      else p += 1; // unknown status: skip a byte and resync
    }
    p = end;
    rawTracks.push({ name, events, programs });
  }

  // Tempo map → seconds.
  tempos.sort((x, y) => x.ticks - y.ticks);
  if (!tempos.length || tempos[0]!.ticks > 0) tempos.unshift({ ticks: 0, uspq: 500000 });
  const segs: { ticks: number; sec: number; spt: number }[] = [];
  let sec = 0;
  tempos.forEach((tm, i) => {
    if (i > 0) {
      const prev = segs[segs.length - 1]!;
      sec = prev.sec + (tm.ticks - prev.ticks) * prev.spt;
    }
    segs.push({ ticks: tm.ticks, sec, spt: tm.uspq / 1e6 / ppq });
  });
  const toSec = (tk: number) => {
    let s = segs[0]!;
    for (const g of segs) if (g.ticks <= tk) s = g;
    return s.sec + (tk - s.ticks) * s.spt;
  };

  // Pair note-ons with note-offs, splitting a multi-channel track into one track per channel.
  const tracks: MidiTrack[] = [];
  for (const rt of rawTracks) {
    const byCh = new Map<number, MidiNote[]>();
    const open = new Map<string, { ticks: number; vel: number }[]>();
    for (const e of rt.events) {
      const k = `${e.ch}:${e.key}`;
      if (e.type === "on") {
        if (!open.has(k)) open.set(k, []);
        open.get(k)!.push({ ticks: e.ticks, vel: e.vel });
      } else {
        const st = open.get(k)?.shift();
        if (!st) continue;
        if (!byCh.has(e.ch)) byCh.set(e.ch, []);
        byCh.get(e.ch)!.push({ midi: e.key, ticks: st.ticks, durTicks: Math.max(1, e.ticks - st.ticks), time: 0, dur: 0, velocity: st.vel / 127, channel: e.ch });
      }
    }
    // Notes never switched off last a beat.
    for (const [k, list] of open)
      for (const st of list) {
        const [ch, key] = k.split(":").map(Number) as [number, number];
        if (!byCh.has(ch)) byCh.set(ch, []);
        byCh.get(ch)!.push({ midi: key, ticks: st.ticks, durTicks: ppq, time: 0, dur: 0, velocity: st.vel / 127, channel: ch });
      }
    for (const [ch, notes] of [...byCh.entries()].sort((x, y) => x[0] - y[0])) {
      notes.sort((x, y) => x.ticks - y.ticks || x.midi - y.midi);
      for (const n of notes) {
        n.time = toSec(n.ticks);
        n.dur = toSec(n.ticks + n.durTicks) - n.time;
      }
      const program = rt.programs.get(ch) ?? 0;
      const isDrums = ch === 9;
      tracks.push({
        index: tracks.length,
        name: rt.name || `Track ${tracks.length + 1}`,
        channel: ch,
        program,
        instrument: instrumentName(program, isDrums),
        isDrums,
        notes,
      });
    }
  }
  const duration = Math.max(0, ...tracks.flatMap((t) => t.notes.map((n) => n.time + n.dur)));
  const bpm = Math.round(60e6 / (tempos.find((t) => t.ticks === 0)?.uspq ?? tempos[0]!.uspq));
  return { format, ppq, tracks, tempos: tempos.map((t) => ({ ticks: t.ticks, bpm: 60e6 / t.uspq })), timeSig, duration, bpm };
}

function indexOf(b: Uint8Array, s: string) {
  outer: for (let i = 0; i + s.length <= b.length; i++) {
    for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) continue outer;
    return i;
  }
  return -1;
}

/** The track most likely to be the guitar part: a guitar program, then most notes in guitar range. */
export function bestTrack(f: MidiFile): number {
  const scored = f.tracks
    .filter((t) => !t.isDrums && t.notes.length)
    .map((t) => {
      const inRange = t.notes.filter((n) => n.midi >= 40 && n.midi <= 88).length / t.notes.length;
      return { t, s: (t.program >= 24 && t.program < 32 ? 1000 : 0) + inRange * 100 + Math.min(t.notes.length, 500) / 10 };
    })
    .sort((a, b) => b.s - a.s);
  return scored[0]?.t.index ?? 0;
}

/** Write a simple type-1 MIDI file (used by tests and to save a tab as MIDI later). */
export function writeMidi(tracks: { name?: string; program?: number; channel?: number; notes: { midi: number; ticks: number; durTicks: number; velocity?: number }[] }[], opts: { ppq?: number; bpm?: number; timeSig?: [number, number] } = {}): Uint8Array {
  const ppq = opts.ppq ?? 480;
  const out: number[] = [];
  const push32 = (v: number) => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const vlq = (v: number, arr: number[]) => {
    const bytes = [v & 0x7f];
    while ((v >>= 7)) bytes.unshift((v & 0x7f) | 0x80);
    arr.push(...bytes);
  };
  out.push(..."MThd".split("").map((c) => c.charCodeAt(0)));
  push32(6);
  out.push(0, 1, 0, tracks.length + 1, (ppq >> 8) & 255, ppq & 255);
  const chunk = (data: number[]) => {
    out.push(..."MTrk".split("").map((c) => c.charCodeAt(0)));
    push32(data.length);
    out.push(...data);
  };
  const meta: number[] = [];
  const uspq = Math.round(60e6 / (opts.bpm ?? 120));
  meta.push(0, 0xff, 0x51, 3, (uspq >> 16) & 255, (uspq >> 8) & 255, uspq & 255);
  const [num, den] = opts.timeSig ?? [4, 4];
  meta.push(0, 0xff, 0x58, 4, num, Math.log2(den), 24, 8, 0, 0xff, 0x2f, 0);
  chunk(meta);
  for (const tr of tracks) {
    const ch = tr.channel ?? 0;
    const evs: { t: number; d: number[] }[] = [];
    for (const n of tr.notes) {
      evs.push({ t: n.ticks, d: [0x90 | ch, n.midi, Math.round((n.velocity ?? 0.8) * 127)] });
      evs.push({ t: n.ticks + n.durTicks, d: [0x80 | ch, n.midi, 0] });
    }
    evs.sort((a, b) => a.t - b.t || (a.d[0]! & 0xf0) - (b.d[0]! & 0xf0));
    const data: number[] = [];
    if (tr.name) {
      data.push(0, 0xff, 0x03, tr.name.length, ...tr.name.split("").map((c) => c.charCodeAt(0)));
    }
    data.push(0, 0xc0 | ch, tr.program ?? 25);
    let last = 0;
    for (const e of evs) {
      vlq(e.t - last, data);
      data.push(...e.d);
      last = e.t;
    }
    data.push(0, 0xff, 0x2f, 0);
    chunk(data);
  }
  return new Uint8Array(out);
}
