/**
 * Describe-to-tab: turns plain English ("3rd fret on the A string, hammer on to the 5th, then
 * strum a G chord twice, palm muted") into tab columns. It runs entirely on the device — no
 * internet, no AI service — using a vocabulary of the words guitarists actually use:
 *
 *  • notes:       "5th fret on the G string", "low E open", "A string 3 5 7", "5-7-8 on the B"
 *  • inline tab:  "5h7p5 on the G", "7b9r7 on the B", "12~ on high e", "x x x on the low E"
 *  • techniques:  hammer-on, pull-off, slide up/down, bend (half / whole / 1½, release),
 *                 vibrato, harmonic, ghost note, tap, dead/muted notes, palm mute, let ring
 *  • chords:      "strum G", "Am7 chord", "E minor", "F#m at the 9th fret", "G/B",
 *                 "power chord on the A string at fret 5", "strum G down down up"
 *  • arpeggios:   "arpeggiate a C chord", "pick through Am"
 *  • scales:      "A minor pentatonic at the 5th fret", "E blues up and down", "G major scale"
 *  • note names:  "the notes C D E on the B string", "notes E G A"
 *  • structure:   "rest for a beat", "new bar", "twice", "repeat that 3 times", "repeat the last bar"
 *  • rhythm:      "quarter notes", "eighth notes", "sixteenths", "triplets", "slowly", "at 90 bpm"
 *
 * Every phrase is reported back ("what I understood") so the player can see and fix it.
 */
import { SCALES, ROOTS, degreeToSemitones } from "@/lib/theory";
import { chordShape, parseChordName, powerChord, type ChordName } from "./chords";
import { barCol, cellText, cloneCols, FX, type Fx, DEFAULT_BEATS, MAX_FRET, noteCol, restCol, type Cell, type Column, type Link, type TabTuning } from "./model";
import { placeMelody, placeNote } from "./place";

export interface DescribeLine {
  /** The phrase as the player wrote it. */
  text: string;
  ok: boolean;
  /** What it became, in words. */
  said: string;
}

export interface DescribeResult {
  /** The whole tab after the description was applied (prior columns, possibly edited, + new ones). */
  cols: Column[];
  /** How many columns were added. */
  added: number;
  lines: DescribeLine[];
  bpm?: number | undefined;
}

/* ------------------------------------------------------------------ words → numbers */

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const ORD = ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];

function wordsToDigits(t: string): string {
  let s = t;
  s = s.replace(/\btwenty[- ](one|two|three|four)\b/g, (_, w: string) => String(20 + ONES.indexOf(w)));
  s = s.replace(/\btwenty[- ](first|second|third|fourth)\b/g, (_, w: string) => `${20 + ORD.indexOf(w)}th`);
  ORD.forEach((w, i) => (s = s.replace(new RegExp(`\\b${w}\\b`, "g"), `${i}th`)));
  ONES.forEach((w, i) => (s = s.replace(new RegExp(`\\b${w}\\b`, "g"), String(i))));
  return s;
}

const COUNT_WORDS: Record<string, number> = { once: 1, twice: 2, thrice: 3 };

/* ------------------------------------------------------------------ strings */

const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const LOW_Q = /^(low|lower|bottom|thick|thicker|thickest|fat|fatter|big|bigger|heavy|heavier|bass)$/;
const HIGH_Q = /^(high|higher|top|thin|thinner|thinnest|little|small|skinny|treble)$/;

interface StringHit {
  s: number;
  /** The matched words, removed before reading frets. */
  match: string;
}

function accPc(acc: string | undefined): number {
  if (!acc) return 0;
  const a = acc.trim();
  return a === "#" || a === "♯" || a === "sharp" ? 1 : a === "b" || a === "♭" || a === "flat" ? -1 : 0;
}

/** Strings whose open note has this pitch class (low → high). */
function stringsWithPc(tuning: TabTuning, pc: number): number[] {
  return tuning.midis.map((m, i) => (((m % 12) + 12) % 12 === pc ? i : -1)).filter((i) => i >= 0);
}

export function stringLabel(tuning: TabTuning, s: number): string {
  const name = tuning.names[s] ?? "?";
  const same = tuning.names.filter((n) => n === name).length > 1;
  if (!same) return `${name} string`;
  return `${s === tuning.names.indexOf(name) ? "low" : "high"} ${s === tuning.names.indexOf(name) ? name : name.toLowerCase()} string`;
}

/** Find the string a phrase talks about. `t` is lower case. */
function findString(t: string, tuning: TabTuning, noteContext: boolean): StringHit | null {
  const n = tuning.midis.length;
  const pick = (cands: number[], q: string | undefined) => {
    if (!cands.length) return -1;
    if (q && HIGH_Q.test(q)) return cands[cands.length - 1]!;
    return cands[0]!;
  };
  // "low E string", "B string", "Eb string", "G-string", "high e"
  let m = /\b(?:(?:on|of|along|using|at)\s+)?(?:the\s+)?(?:(\w+)\s+)?([a-g])(\s?#|♯|♭|b(?=[\s-])|\s+sharp|\s+flat)?\s*-?\s*strings?\b/.exec(t);
  if (m) {
    const s = pick(stringsWithPc(tuning, (LETTER_PC[m[2]!]! + accPc(m[3]) + 12) % 12), m[1]);
    if (s >= 0) return { s, match: m[0] };
  }
  // "6th string", "string 6", "1st string"
  m = /\b(?:(?:on|of|along|using|at)\s+)?(?:the\s+)?(\d)(?:st|nd|rd|th)?\s+string\b/.exec(t) ?? /\b(?:(?:on|of|along|using|at)\s+)?(?:the\s+)?string\s+(?:number\s+)?(\d)\b/.exec(t);
  if (m) {
    const k = Number(m[1]);
    if (k >= 1 && k <= n) return { s: n - k, match: m[0] };
  }
  m = /\b(?:(?:on|of|along|using|at)\s+)?(?:the\s+)?(thickest|lowest|thinnest|highest|low|high|bottom|top|thick|thin|fat|big|little|skinny)(?:\s+string)\b|\b(?:(?:on|of|along|at)\s+)?(?:the\s+)?(thickest|lowest|thinnest|highest)\b/.exec(t);
  if (m) {
    const w = (m[1] ?? m[2])!;
    return { s: /thick|low|bottom|fat|big/.test(w) ? 0 : n - 1, match: m[0] };
  }
  // "low E", "high e" (no word "string")
  m = /\b(?:(?:on|of|along|at)\s+)?(?:the\s+)?(low|high|thin|thick)\s+([a-g])(#|♯|♭)?\b(?!\s*(?:chord|major|minor|maj|min|m\b|7|5))/.exec(t);
  if (m) {
    const s = pick(stringsWithPc(tuning, (LETTER_PC[m[2]!]! + accPc(m[3]) + 12) % 12), m[1]);
    if (s >= 0) return { s, match: m[0] };
  }
  if (noteContext) {
    // "on the G", "on G", "of the A"
    m = /\b(?:on|of)\s+(?:the\s+)?([a-g])(#|♯|♭)?\b(?!\s*(?:chord|major|minor|maj|min|m\b))/.exec(t);
    if (m) {
      const s = pick(stringsWithPc(tuning, (LETTER_PC[m[1]!]! + accPc(m[2]) + 12) % 12), undefined);
      if (s >= 0) return { s, match: m[0] };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ inline tab tokens */

/** Bend amount from words: quarter = 0.5, half = 1, whole/full = 2, 1½ = 3, two steps = 4. */
const amt = (w: string | undefined) =>
  !w ? 2 : /quarter|1\/4|¼|curl/.test(w) ? 0.5 : /1\s?½|1\.5|one and a half|step and a half/.test(w) ? 3 : /two\s+(?:whole\s+)?steps|2\s+(?:whole\s+)?steps|double/.test(w) ? 4 : /half|1\/2|½|semi/.test(w) ? 1 : 2;
const AMT = "(quarter(?:[- ]tone)?|1\\/4|¼|curl|half|whole|full|1\\/2|½|1\\s?½|1\\.5|one and a half|step and a half|semitone|tone|2 whole steps|2 steps|double)";
const bendTok = (a: string, w: string | undefined, pre = false) => {
  const k = amt(w);
  return ` ${a}${pre ? "pb" : "b"}${k === 0.5 ? "q" : Number(a) + k} `;
};

/**
 * Words for techniques → compact tab syntax, so one token reader handles both. Uppercase letters
 * are internal markers (the text is lower-cased first, so they can't clash with what was typed):
 *   H7 hammer-on from nowhere · I7 / J7 slide into 7 from below / above · S7 slide from the last note
 *   U / D slide out up / down · B2 bend the last note · P2 pre-bend the last note · R release
 *   V vibrato · W wide vibrato · Q quarter-tone curl on the last note
 */
function techWordsToSyntax(t: string): string {
  let s = ` ${t} `;
  // pre-bends (before plain bends)
  s = s.replace(new RegExp(`\\bpre[- ]?bend(?:ing)?\\s+(?:the\\s+)?(\\d+)(?:th|st|nd|rd)?(?:\\s+fret)?\\s+(?:up\\s+)?to\\s+(?:the\\s+)?(\\d+)`, "g"), " $1pb$2 ");
  s = s.replace(new RegExp(`\\bpre[- ]?bend(?:ing)?\\s+(?:the\\s+)?(\\d+)(?:th|st|nd|rd)?(?:\\s+fret)?(?:\\s+up)?(?:\\s+(?:a|by|an?))?\\s*${AMT}?(?:\\s+(?:step|steps|tone))?`, "g"), (_, a: string, w?: string) => bendTok(a, w, true));
  s = s.replace(new RegExp(`\\bpre[- ]?bend(?:\\s+it|\\s+that)?(?:\\s+(?:a|by))?\\s*${AMT}?(?:\\s+(?:step|steps|tone))?`, "g"), (_, w?: string) => ` P${amt(w) === 0.5 ? "q" : amt(w)} `);
  // unison bends are handled by the phrase reader; drop the word so the bend reads normally
  s = s.replace(/\bunison\s+/g, " ");
  // hammer-on from nowhere / legato taps with the fretting hand
  s = s.replace(/\bhammer(?:ing)?[- ]?(?:on)?\s+from\s+nowhere\s+(?:at\s+|on\s+|to\s+)?(?:the\s+)?(\d+)/g, " H$1 ");
  s = s.replace(/(\d+)\s+hammer(?:ed)?[- ]?(?:on)?\s+from\s+nowhere/g, " H$1 ");
  // trills
  s = s.replace(/\btrill(?:ing|s)?\s+(?:between\s+|from\s+)?(?:the\s+)?(\d+)(?:th|st|nd|rd)?\s+(?:and|to|with)\s+(?:the\s+)?(\d+)/g, " $1tr$2 ");
  s = s.replace(/(\d+)\s+trill(?:ed)?\s+(?:to|with)\s+(\d+)/g, " $1tr$2 ");
  // slides in and out
  s = s.replace(/\bslid(?:e|ing)\s+(?:up\s+)?in(?:to)?\s+(?:the\s+)?(\d+)(?:th|st|nd|rd)?(?:\s+fret)?\s+from\s+above/g, " J$1 ");
  s = s.replace(/\bslid(?:e|ing)\s+down\s+in(?:to)?\s+(?:the\s+)?(\d+)/g, " J$1 ");
  s = s.replace(/\bslid(?:e|ing)\s+(?:up\s+)?in(?:to)?\s+(?:the\s+)?(\d+)(?:th|st|nd|rd)?(?:\s+fret)?(?:\s+from\s+below)?/g, " I$1 ");
  s = s.replace(/(\d+)\s+(?:and\s+)?(?:then\s+)?slide\s+(?:off|out)(?:\s+(up|down))?/g, (_, a: string, d?: string) => ` ${a}${d === "up" ? "U" : "D"} `);
  s = s.replace(/\b(?:and\s+)?(?:slide|fall)\s+(?:off|out)(?:\s+(up|down))?(?:\s+(?:of\s+)?it)?/g, (_, d?: string) => ` ${d === "up" ? "U" : "D"} `);
  s = s.replace(/\bfall[- ]?off\b/g, " D ");
  // hammer, pull, slide between two named frets
  s = s.replace(/\bhammer(?:ing)?[- ]?(?:on|ons)?\s+(?:from\s+)?(\d+)\s+(?:up\s+)?to\s+(?:the\s+)?(\d+)(?:th|st|nd|rd)?/g, " $1h$2 ");
  s = s.replace(/\bpull(?:ing)?[- ]?(?:off|offs)?\s+(?:from\s+)?(\d+)\s+(?:back\s+)?(?:down\s+)?to\s+(?:the\s+)?(\d+)(?:th|st|nd|rd)?/g, " $1p$2 ");
  s = s.replace(/\bslid(?:e|ing)?\s+(?:up\s+|down\s+)?(?:from\s+)?(\d+)\s+(?:up\s+|down\s+)?to\s+(?:the\s+)?(\d+)(?:th|st|nd|rd)?/g, (_, a: string, b: string) => ` ${a}${Number(b) >= Number(a) ? "/" : "\\"}${b} `);
  s = s.replace(/(\d+)\s+(?:then\s+)?hammer(?:[- ]?on)?\s+(?:to\s+)?(\d+)/g, " $1h$2 ");
  s = s.replace(/(\d+)\s+(?:then\s+)?pull(?:[- ]?off)?\s+(?:to\s+)?(\d+)/g, " $1p$2 ");
  s = s.replace(/(\d+)\s+(?:then\s+)?slide\s+(?:up\s+|down\s+)?(?:to\s+)?(\d+)/g, (_, a: string, b: string) => ` ${a}${Number(b) >= Number(a) ? "/" : "\\"}${b} `);
  // bends with a target fret, or an amount
  s = s.replace(/\bbend(?:ing)?\s+(?:at\s+|on\s+)?(?:the\s+)?(\d+)(?:th|st|nd|rd)?\s+(?:fret\s+)?(?:up\s+)?to\s+(?:the\s+)?(?:pitch of\s+)?(\d+)/g, " $1b$2 ");
  s = s.replace(new RegExp(`\\bbend(?:ing)?\\s+(?:at\\s+|on\\s+)?(?:the\\s+)?(\\d+)(?:th|st|nd|rd)?(?:\\s+fret)?(?:\\s+up)?(?:\\s+(?:a|by|an?))?\\s*${AMT}?(?:\\s+(?:step|steps|tone|bend))?`, "g"), (_, a: string, w?: string) => bendTok(a, w));
  s = s.replace(new RegExp(`(\\d+)\\s+bend(?:ed)?\\s+(?:up\\s+)?(?:to\\s+)?(?:a\\s+)?${AMT}?(?:\\s+step)?`, "g"), (_, a: string, w?: string) => bendTok(a, w));
  s = s.replace(new RegExp(`\\b(?:quarter[- ]tone\\s+bend|curl)(?:\\s+(?:it|that|the note))?`, "g"), " Q ");
  s = s.replace(new RegExp(`\\bbend(?:ing)?\\s+(?:it|that|the note|up)?\\s*(?:up\\s+)?(?:a|by)?\\s*${AMT}?(?:\\s+(?:step|steps|tone))?`, "g"), (_, w?: string) => ` B${amt(w) === 0.5 ? "q" : amt(w)} `);
  s = s.replace(/(b\d+|bq|pb\d+|pbq|B\w|P\w)\s+(?:and\s+)?(?:then\s+)?release(?:\s+it)?/g, "$1R ");
  s = s.replace(/\b(?:and\s+)?release(?:\s+it)?\b/g, " R ");
  // hammer / pull / slide "to N" from the previous note
  s = s.replace(/\bhammer(?:ing)?[- ]?(?:on)?\s+(?:up\s+)?to\s+(?:the\s+)?(\d+)/g, " h$1 ");
  s = s.replace(/\bpull(?:ing)?[- ]?(?:off)?\s+(?:back\s+)?(?:down\s+)?to\s+(?:the\s+)?(\d+)/g, " p$1 ");
  s = s.replace(/\bslide\s+(up|down)?\s*to\s+(?:the\s+)?(\d+)/g, (_, d: string | undefined, b: string) => ` ${d === "down" ? "\\" : d === "up" ? "/" : "S"}${b} `);
  // harmonics: pinch / artificial, tapped, natural
  s = s.replace(/\b(?:pinch(?:ed)?|artificial|false|squeal(?:ing|s)?)\s+(?:harmonics?\s+)?(?:at|on|over)?\s*(?:the\s+)?(\d+)/g, " [$1] ");
  s = s.replace(/(\d+)\s+(?:as\s+a\s+)?(?:pinch(?:ed)?|artificial)\s+harmonics?/g, " [$1] ");
  s = s.replace(/\btap(?:ped)?\s+harmonics?\s+(?:at|on|over)?\s*(?:the\s+)?(\d+)/g, " t<$1> ");
  s = s.replace(/\b(?:natural\s+)?harmonics?\s+(?:at|on|over)?\s*(?:the\s+)?(\d+)/g, " <$1> ");
  s = s.replace(/(\d+)\s+(?:natural\s+)?harmonics?/g, " <$1> ");
  s = s.replace(/\bghost(?:ed)?\s+(?:note\s+)?(?:at\s+)?(\d+)/g, " ($1) ");
  s = s.replace(/\btap(?:ped|ping)?\s+(?:at\s+|the\s+)?(\d+)/g, " t$1 ");
  s = s.replace(/\b(?:dead|muted|mute|scratch|scratched|ghost)\s+notes?\b|\bdeadnote\b|\brakes?\b(?=\s+\d)/g, " x ");
  s = s.replace(/\bopen\b/g, " 0 ");
  // vibrato on the last number
  s = s.replace(/(\d+|>|\]|\))\s+(?:with\s+)?(?:some\s+)?(?:wide|heavy|big)\s+(?:vibrato|vib)\b/g, "$1~~ ");
  s = s.replace(/(\d+|>|\]|\))\s+(?:with\s+)?(?:some\s+)?(?:vibrato|vib|shake|wiggle)\b/g, "$1~ ");
  s = s.replace(/\b(?:with\s+|add\s+)?(?:some\s+)?(?:wide|heavy|big)\s+(?:vibrato|vib)\b/g, " W ");
  s = s.replace(/\b(?:with\s+|add\s+)?(?:some\s+)?(?:vibrato|vib)\b/g, " V ");
  return s;
}

const TOKEN =
  /(?<![a-z])(?<lead>[hp/\\SHIJ])?(?<head>t?<\d{1,2}>|\[\d{1,2}\]|\(\d{1,2}\)|t\d{1,2}|\d{1,2}|x(?![a-z]))(?<tail>(?:[hp/\\]\d{1,2}|pb(?:\d{1,2}|q)|b(?:\d{1,2}|q)|r\d{1,2}|R|tr\d{1,2}|~~|~|U|D)*)|(?<mod>B(?:\d|q)|P(?:\d|q)|Q|R|V|W|U|D)/g;

interface Note {
  fret: number | "x";
  cell: Omit<Cell, "fret">;
  link?: Link | undefined;
  leadLink?: Link | "S" | undefined;
}
type Op = { kind: "note"; note: Note } | { kind: "mod"; bend?: number; prebend?: boolean; release?: boolean; vibrato?: boolean; wide?: boolean; out?: "/" | "\\" };

/** Read frets and techniques written in tab shorthand ("5h7p5", "7b9r7", "<12>", "[5]", "x", "12~~", "5tr7", "/7"). */
function readTokens(src: string): Op[] {
  const ops: Op[] = [];
  for (const m of src.matchAll(TOKEN)) {
    const g = m.groups!;
    if (g["mod"]) {
      const mod = g["mod"];
      const k = (v: string) => (v === "q" ? 0.5 : Number(v));
      if (mod.startsWith("B")) ops.push({ kind: "mod", bend: k(mod.slice(1)) });
      else if (mod.startsWith("P")) ops.push({ kind: "mod", bend: k(mod.slice(1)), prebend: true });
      else if (mod === "Q") ops.push({ kind: "mod", bend: 0.5 });
      else if (mod === "R") ops.push({ kind: "mod", release: true });
      else if (mod === "V") ops.push({ kind: "mod", vibrato: true });
      else if (mod === "W") ops.push({ kind: "mod", vibrato: true, wide: true });
      else ops.push({ kind: "mod", out: mod === "U" ? "/" : "\\" });
      continue;
    }
    const head = g["head"]!;
    const base: Omit<Cell, "fret"> = {};
    let fret: number | "x";
    const h = head.startsWith("t") && head.length > 1 && head[1] === "<" ? ((base.tap = true), head.slice(1)) : head;
    if (h === "x") fret = "x";
    else if (h.startsWith("<")) {
      fret = Number(h.slice(1, -1));
      base.harmonic = true;
    } else if (h.startsWith("[")) {
      fret = Number(h.slice(1, -1));
      base.pinch = true;
    } else if (h.startsWith("(")) {
      fret = Number(h.slice(1, -1));
      base.ghost = true;
    } else if (h.startsWith("t")) {
      fret = Number(h.slice(1));
      base.tap = true;
    } else fret = Number(h);
    if (typeof fret === "number" && fret > MAX_FRET) continue;
    const lead = g["lead"];
    if (lead === "H") base.into = "h";
    else if (lead === "I") base.into = "/";
    else if (lead === "J") base.into = "\\";
    let cur: Note = { fret, cell: base, leadLink: lead && "hp/\\S".includes(lead) ? (lead as Note["leadLink"]) : undefined };
    const tail = g["tail"] ?? "";
    for (const t of tail.matchAll(/([hp/\\])(\d{1,2})|(pb|b)(\d{1,2}|q)|r(\d{1,2})|(R)|tr(\d{1,2})|(~~)|(~)|([UD])/g)) {
      if (t[1]) {
        cur.link = t[1] as Link;
        ops.push({ kind: "note", note: cur });
        cur = { fret: Number(t[2]), cell: {} };
      } else if (t[3]) {
        if (typeof cur.fret === "number") cur.cell.bend = t[4] === "q" ? 0.5 : Math.max(1, Number(t[4]) - cur.fret);
        if (t[3] === "pb") cur.cell.prebend = true;
      } else if (t[5] || t[6]) cur.cell.release = true;
      else if (t[7]) cur.cell.trill = Number(t[7]);
      else if (t[8]) {
        cur.cell.vibrato = true;
        cur.cell.wide = true;
      } else if (t[9]) cur.cell.vibrato = true;
      else if (t[10]) cur.cell.out = t[10] === "U" ? "/" : "\\";
    }
    ops.push({ kind: "note", note: cur });
  }
  return ops;
}

/* ------------------------------------------------------------------ scales */

const SCALE_WORDS: { re: RegExp; id: string }[] = [
  { re: /\b(?:minor\s+pentatonic|pentatonic\s+minor|minor\s+penta|pentatonic)\b/, id: "minor-pentatonic" },
  { re: /\b(?:major\s+pentatonic|pentatonic\s+major|major\s+penta)\b/, id: "major-pentatonic" },
  { re: /\bmajor\s+blues\b/, id: "major-blues" },
  { re: /\b(?:minor\s+)?blues(?:\s+scale)?\b/, id: "blues" },
  { re: /\bharmonic\s+minor\b/, id: "harmonic-minor" },
  { re: /\bmelodic\s+minor\b/, id: "melodic-minor" },
  { re: /\b(?:natural\s+minor|aeolian|minor\s+scale)\b/, id: "aeolian" },
  { re: /\b(?:major\s+scale|ionian)\b/, id: "ionian" },
  { re: /\bdorian\b/, id: "dorian" },
  { re: /\bphrygian\s+dominant\b/, id: "phrygian-dominant" },
  { re: /\bphrygian\b/, id: "phrygian" },
  { re: /\blydian\b/, id: "lydian" },
  { re: /\bmixolydian\b/, id: "mixolydian" },
  { re: /\blocrian\b/, id: "locrian" },
  { re: /\bwhole[- ]tone\b/, id: "whole-tone" },
  { re: /\bchromatic(?:\s+scale)?\b/, id: "chromatic" },
];

function scaleNotes(rootPc: number, degrees: string[], tuning: TabTuning, start: number | null): { s: number; fret: number }[] {
  const pcs = new Set(degrees.map((d) => (rootPc + degreeToSemitones(d)) % 12));
  const low = tuning.midis[0]!;
  const f0 = start ?? (((rootPc - low) % 12) + 12) % 12;
  const lo = Math.max(0, f0 - (start === null ? 0 : 1));
  const hi = f0 + (degrees.length > 6 ? 4 : 3);
  const rootMidi = low + f0 - ((((low + f0 - rootPc) % 12) + 12) % 12);
  const out: { s: number; fret: number }[] = [];
  tuning.midis.forEach((open, s) => {
    for (let f = lo; f <= hi; f++) {
      const m = open + f;
      if (!pcs.has(((m % 12) + 12) % 12) || m < rootMidi) continue;
      // Each pitch once: if the next string plays it within the box, leave it to that string.
      const next = tuning.midis[s + 1];
      if (next !== undefined && m - next >= lo && m - next <= hi && m - next >= 0 && f > hi - 1) continue;
      if (out.some((o) => tuning.midis[o.s]! + o.fret === m)) continue;
      out.push({ s, fret: f });
    }
  });
  return out.sort((a, b) => tuning.midis[a.s]! + a.fret - (tuning.midis[b.s]! + b.fret));
}

/* ------------------------------------------------------------------ clauses */

const VERB_AFTER_AND = /\s+and\s+(?=(?:then\s+)?(?:play|strum|hammer|pull|slide|bend|repeat|rest|palm|let|mute|tap|pick|arpeggiate|end|finish|go|move|hit)\b)/gi;

/** Split a description into phrases: sentences, then "then"/"after that", then commas. */
function splitPhrases(text: string): string[][] {
  const out: string[][] = [];
  for (const sentence of text.split(/[.;!\n]+|\s\|\s/)) {
    const parts = sentence
      .replace(VERB_AFTER_AND, " , ")
      .split(/\s*(?:,\s*(?:and\s+)?then\b|\band\s+then\b|\bthen\b|\bafter\s+that\b|\bfollowed\s+by\b|,)\s*/i)
      .map((p) => p.trim())
      .filter(Boolean);
    // A piece that is only frets ("5", "7 and 8") belongs with the piece that names the string.
    const merged: string[] = [];
    let carry = "";
    const modOnly = (p: string | undefined) => !!p && /^(?:(?:and\s+)?(?:all\s+)?(?:palm[- ]?mut\w*|let\s+(?:it\s+|them\s+)?ring|twice|\d+\s+times|(?:with\s+|add\s+)?(?:wide\s+)?vibrato|chug\w*|(?:whammy\s+|bar\s+)?(?:dip|dive\w*|flutter|scoop)|rake|(?:volume\s+)?swell|accent\w*|staccato|tremolo\s+pick\w*|alternate\s+pick\w*|legato|slide\s+off(?:\s+(?:up|down))?)\s*)+$/i.test(p.trim());
    parts.forEach((p, i) => {
      const bare = /^(?:(?:and|the|fret|frets|play|then|open|at)\s*|[\dxhpb/\\~<>()]+\s*(?:st|nd|rd|th)?\s*)+$/i.test(p) && !/string/i.test(p);
      if (bare && i < parts.length - 1 && !(modOnly(parts[i + 1]) && merged.length)) carry += `${p} `;
      else if (bare && merged.length && !carry) merged[merged.length - 1] += ` ${p}`;
      else {
        merged.push(`${carry}${p}`.trim());
        carry = "";
      }
    });
    if (carry.trim()) merged.push(carry.trim());
    const kept = merged.filter((p) => p.replace(/\W/g, "").length);
    if (kept.length) out.push(kept);
  }
  return out;
}

const CHORD_SYMBOL = /(?<![A-Za-z#])([A-G](?:#|b|♯|♭)?(?:maj13|maj9|maj7|maj|min7|min|m7b5|m\(maj7\)|mmaj7|m7|m9|m6|m11|madd9|m|dim7|dim|aug|sus2|sus4|7sus4|sus|add9|add11|6\/9|69|13|11|9|7b9|7#9|7#5|7b5|7|6|5|\+|°|ø)?(?:\/[A-G](?:#|b)?)?)(?![A-Za-z#♯♭\d])/g;

function chordsIn(original: string): { name: ChordName; at: number; len: number }[] {
  const out: { name: ChordName; at: number; len: number }[] = [];
  // "E minor", "C major 7", "a minor chord", "g chord"
  const wordy = /\b([A-Ga-g])(#|b|♯|♭|\s+sharp|\s+flat)?\s+(major|minor|dominant|diminished|augmented|power)(?:\s+(7|seventh|7th|9|ninth))?(?:\s+chord)?\b|\b([A-Ga-g])(#|♯|♭)?\s+chords?\b/gi;
  for (const m of original.matchAll(wordy)) {
    const letter = (m[1] ?? m[5])!.toUpperCase();
    const acc = (m[2] ?? m[6] ?? "").trim().replace(/sharp/i, "#").replace(/flat/i, "b");
    const q = (m[3] ?? "").toLowerCase();
    const sev = m[4] ? (/9|ninth/.test(m[4]) ? "9" : "7") : "";
    const suffix = q === "minor" ? `m${sev}` : q === "major" ? (sev ? `maj${sev}` : "") : q === "dominant" ? sev || "7" : q === "diminished" ? (sev ? "dim7" : "dim") : q === "augmented" ? "aug" : q === "power" ? "5" : "";
    const name = parseChordName(`${letter}${acc}${suffix}`);
    if (name) out.push({ name, at: m.index ?? 0, len: m[0].length });
  }
  for (const m of original.matchAll(CHORD_SYMBOL)) {
    const at = m.index ?? 0;
    if (out.some((o) => at >= o.at && at < o.at + o.len)) continue;
    // "A string", "the B", a lone capital at the start of a sentence like "A" (article) are not chords.
    const after = original.slice(at + m[0].length);
    if (/^\s*-?\s*strings?\b/i.test(after)) continue;
    if (m[0] === "A" && /^\s+[a-z]/.test(after) && !/^\s+(?:chord|and|then|twice|x\d|\d)/i.test(after)) continue;
    const name = parseChordName(m[0]);
    if (name) out.push({ name, at, len: m[0].length });
  }
  return out.sort((a, b) => a.at - b.at);
}

interface State {
  tuning: TabTuning;
  n: number;
  all: Column[];
  beats: number;
  string: number | null;
  /** Fret the hand is around, for placing note names. */
  hand: number;
  /** Start index (in `all`) of each phrase's columns, for "repeat that". */
  phraseStarts: number[];
  bpm?: number | undefined;
  /** Carries through a sentence: "power chord on the A at 5, then 3" / "arpeggiate Am then F". */
  mode: { kind: "power"; s: number } | { kind: "arp" } | null;
  /** Where the current sentence's columns start. */
  sentenceStart: number;
}

const shapeText = (shape: (number | null)[]) => {
  const wide = shape.some((f) => f !== null && f > 9);
  return shape.map((f) => (f === null ? "x" : String(f))).join(wide ? "-" : "");
};

/** The last note column, and its note on string s (or any string). */
function lastNote(st: State, s?: number): { col: Column; s: number; cell: Cell } | null {
  for (let i = st.all.length - 1; i >= 0; i--) {
    const c = st.all[i]!;
    if (c.kind !== "notes") continue;
    for (let k = st.n - 1; k >= 0; k--) {
      if (s !== undefined && k !== s) continue;
      const cell = c.cells[k];
      if (cell) return { col: c, s: k, cell };
    }
    if (s === undefined) return null;
  }
  return null;
}

function countIn(t: string): { n: number; rest: string } {
  let n = 1;
  const rest = t
    .replace(/\b(once|twice|thrice)\b/, (w) => ((n = COUNT_WORDS[w]!), " "))
    .replace(/\b(\d+)\s*(?:times|x)\b|\bx\s*(\d+)\b|×\s*(\d+)/, (_, a?: string, b?: string, c?: string) => ((n = Number(a ?? b ?? c)), " "));
  return { n: Math.max(1, Math.min(64, n)), rest };
}

const DURATIONS: [RegExp, number, string][] = [
  [/\bwhole[- ]notes?\b/, 4, "whole notes"],
  [/\bhalf[- ]notes?\b/, 2, "half notes"],
  [/\bquarter(?:[- ]notes?|s)\b|\bslow(?:ly)?\b/, 1, "quarter notes"],
  [/\b(?:eighth|8th)(?:[- ]notes?|s)\b/, 0.5, "eighth notes"],
  [/\btriplets?\b/, 1 / 3, "triplets"],
  [/\b(?:sixteenth|16th)(?:[- ]notes?|s)\b|\bfast\b|\bquick(?:ly)?\b/, 0.25, "sixteenth notes"],
];

/** Soloing effects marked above the tab. Order matters: whammy vibrato before plain vibrato. */
const FX_WORDS: [RegExp, Fx][] = [
  [/\b(?:whammy|bar|trem(?:olo)?\s+(?:arm|bar))\s+vibrato\b|\bbar\s+vib\b/g, "barvib"],
  [/\b(?:whammy|bar|trem(?:olo)?\s+(?:arm|bar))[- ]?dips?\b|\bdip(?:ped)?\s+(?:the\s+)?(?:bar|whammy)\b|\bdip\b/g, "dip"],
  [/\bdive[- ]?bomb(?:s|ed|ing)?\b|\b(?:whammy|bar)\s+dive\b|\bdive\b/g, "dive"],
  [/\b(?:whammy\s+|bar\s+)?flutter(?:s|ed|ing)?\b|\bgargle\b/g, "flutter"],
  [/\b(?:whammy\s+|bar\s+)?scoop(?:s|ed)?\b/g, "scoop"],
  [/\btremolo[- ]?pick(?:ed|ing|s)?\b|\btrem[- ]?pick(?:ed|ing)?\b|\bt\.p\.(?=\s|$)/g, "trem"],
  [/\brak(?:e|ed|ing)\b(?!\s+\d)/g, "rake"],
  [/\b(?:volume\s+)?swell(?:s|ed|ing)?\b/g, "swell"],
  [/\baccent(?:ed|s|uated)?\b/g, "accent"],
  [/\bstaccato\b|\bshort\s+and\s+choppy\b/g, "staccato"],
];
/** Effects that belong to the note they're played on (the last note), not to the whole phrase. */
const FX_LAST = new Set<Fx>(["dip", "dive", "flutter", "scoop", "barvib", "swell"]);

function applyPhrase(original: string, st: State): DescribeLine {
  const fail = (said: string): DescribeLine => ({ text: original, ok: false, said });
  let t = wordsToDigits(original.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim());
  const start = st.all.length;
  const notes: string[] = [];

  // Global and sticky settings
  t = t.replace(/\b(?:at\s+|tempo\s+(?:of\s+)?)?(\d{2,3})\s*(?:bpm|beats per minute)\b|\btempo\s+(?:of\s+)?(\d{2,3})\b/, (_, a?: string, b?: string) => {
    st.bpm = Math.max(30, Math.min(300, Number(a ?? b)));
    notes.push(`tempo ${st.bpm} bpm`);
    return " ";
  });
  for (const [re, beats, name] of DURATIONS)
    if (re.test(t)) {
      st.beats = beats;
      notes.push(name);
      t = t.replace(re, " ");
      break;
    }
  let pm = false;
  t = t.replace(/\bpalm[- ]?mut(?:e|ed|ing|es)?\b|\bchugs?\b|\bchugging\b|\bp\.?m\.?(?=\s|$)/g, () => ((pm = true), " "));
  let ring = false;
  t = t.replace(/\blet\s+(?:it\s+|them\s+|everything\s+)?ring(?:\s+out)?\b/g, () => ((ring = true), " "));
  const fx: Fx[] = [];
  for (const [re, f] of FX_WORDS) t = t.replace(re, () => (fx.includes(f) || fx.push(f), " "));
  let pick: "alt" | "down" | "up" | null = null;
  t = t.replace(/\balternate[- ]?pick(?:ed|ing|s)?\b|\balternate\s+strokes?\b/g, () => ((pick = "alt"), " "));
  t = t.replace(/\b(?:all\s+)?down[- ]?(?:strokes?|picks?|picked|picking)\b/g, () => ((pick = "down"), " "));
  t = t.replace(/\b(?:all\s+)?up[- ]?(?:strokes?|picks?|picked|picking)\b/g, () => ((pick = "up"), " "));
  let legato = false;
  t = t.replace(/\blegato\b/g, () => ((legato = true), " "));
  let sweep = false;
  t = t.replace(/\bsweep(?:[- ]?pick(?:ed|ing)?)?\b|\bsweeping\b/g, () => ((sweep = true), " "));
  /** Marks (palm mute, effects, picking, legato) on the columns a phrase added. */
  const decorate = (from: number) => {
    const cols = st.all.slice(from).filter((c) => c.kind === "notes");
    cols.forEach((c, k) => {
      if (pm) c.pm = true;
      if (ring) c.ring = true;
      for (const f of fx) {
        if (FX_LAST.has(f) && k !== cols.length - 1) continue;
        if (f === "rake" && k !== 0) continue;
        c.fx = [...(c.fx ?? []).filter((x) => x !== f), f];
      }
      if (pick) c.strum = pick === "alt" ? (k % 2 ? "up" : "down") : pick;
    });
    if (legato)
      for (let k = 0; k < cols.length - 1; k++) {
        const a = cols[k]!.cells.findIndex((x) => !!x);
        const b = cols[k + 1]!.cells.findIndex((x) => !!x);
        const ca = cols[k]!.cells[a];
        const cb = cols[k + 1]!.cells[b];
        if (a < 0 || a !== b || !ca || !cb || ca.link || typeof ca.fret !== "number" || typeof cb.fret !== "number" || ca.fret === cb.fret) continue;
        ca.link = cb.fret > ca.fret ? "h" : "p";
      }
  };
  const extras = () => [pm ? "palm muted" : "", ring ? "let ring" : "", ...fx.map((f) => FX[f].name), pick === "alt" ? "alternate picking" : pick ? `${pick}strokes` : "", legato ? "legato" : "", ...notes].filter(Boolean);
  const finish = (said: string): DescribeLine => {
    decorate(start);
    if (st.all.length > start) st.phraseStarts.push(start);
    const extra = extras().join(", ");
    return { text: original, ok: true, said: extra ? `${said}${said ? " · " : ""}${extra}` : said };
  };

  // Bar lines and rests
  if (/^\s*(?:new|next|another|start\s+a\s+new)\s+(?:bar|measure)\b|\bbar\s*-?\s*line\b|^\s*\|\s*$|^\s*(?:bar|measure)\s*$/.test(t)) {
    st.all.push(barCol(st.n));
    return { text: original, ok: true, said: "bar line" };
  }
  const rest = /\b(rest|pause|wait|silence|stop)\b(?:\s+for)?(?:\s+(?:a|an|1|one))?\s*(?:(\d+(?:\.\d+)?)\s*)?(beats?|bars?|measures?|half\s+beat)?/.exec(t);
  if (rest && !/\b\d+(?:st|nd|rd|th)?\s*fret|string|chord/.test(t)) {
    const k = rest[2] ? Number(rest[2]) : 1;
    const unit = rest[3] ?? "";
    const beats = /bar|measure/.test(unit) ? 4 * k : /half/.test(unit) ? 0.5 : unit ? k : st.beats * k;
    st.all.push(restCol(st.n, beats));
    return finish(`rest ${beats === 1 ? "1 beat" : `${+beats.toFixed(2)} beats`}`);
  }

  // Repeat
  const rep = /^\s*(?:and\s+)?(?:repeat|again|play\s+(?:that|it)\s+again|do\s+(?:that|it)\s+again)\b(.*)$/.exec(t);
  if (rep) {
    const { n, rest: what } = countIn(rep[1] ?? "");
    let from: number;
    let label: string;
    const lastN = /\blast\s+(\d+)\s+(?:notes?|columns?|beats?)\b/.exec(what);
    if (lastN) {
      const want = Number(lastN[1]);
      let k = st.all.length;
      let got = 0;
      while (k > 0 && got < want) {
        k--;
        if (st.all[k]!.kind === "notes") got++;
      }
      from = k;
      label = `the last ${want} notes`;
    } else if (/\b(?:bar|measure)\b/.test(what)) {
      let k = st.all.length - 1;
      while (k >= 0 && st.all[k]!.kind === "bar") k--;
      while (k > 0 && st.all[k - 1]!.kind !== "bar") k--;
      from = Math.max(0, k);
      label = "the last bar";
    } else if (/\b(?:everything|all|whole|it all|from the (?:start|top|beginning))\b/.test(what)) {
      from = 0;
      label = "everything so far";
    } else {
      from = st.phraseStarts[st.phraseStarts.length - 1] ?? -1;
      label = "the last phrase";
    }
    if (from < 0 || from >= st.all.length) return fail("Nothing to repeat yet.");
    const chunk = st.all.slice(from).filter((c, i, a) => !(c.kind === "bar" && i === a.length - 1));
    for (let i = 0; i < n; i++) st.all.push(...cloneCols(chunk));
    return finish(`repeat ${label} ${n === 1 ? "once more" : `${n} more times`}`);
  }

  const { n: times, rest: t2 } = countIn(t);
  t = t2;
  let vib = false;
  let wideVib = false;
  const bare = t
    .replace(/\b(?:with|add|some|on|the|last|note|it)\b/g, " ")
    .replace(/\b(?:wide|heavy|big)\s+(?:vibrato|vib)\b/g, () => ((vib = true), (wideVib = true), " "))
    .replace(/\b(?:vibrato|vib)\b/g, () => ((vib = true), " "));
  if (!bare.replace(/\b(?:the|it|them|that|this|all|and|then|play|everything|whole|thing|notes?|those|these|part|riff|phrase)\b/g, "").replace(/[^a-z0-9]/g, "").length) {
    // Only a modifier: it applies to what came before in this sentence.
    const from = st.sentenceStart < st.all.length ? st.sentenceStart : (st.phraseStarts[st.phraseStarts.length - 1] ?? st.all.length);
    if (from >= st.all.length) return fail("That needs some notes before it.");
    decorate(from);
    if (vib) {
      const prev = lastNote(st);
      if (prev) {
        prev.cell.vibrato = true;
        if (wideVib) prev.cell.wide = true;
      }
    }
    if (times > 1) {
      const lastStart = st.phraseStarts[st.phraseStarts.length - 1] ?? from;
      const chunk = st.all.slice(lastStart);
      for (let i = 1; i < times; i++) st.all.push(...cloneCols(chunk));
    }
    const said = [...extras(), vib ? `${wideVib ? "wide " : ""}vibrato on the last note` : "", times > 1 ? `play that ×${times}` : ""].filter(Boolean).join(", ");
    return { text: original, ok: true, said: said || "(nothing to change)" };
  }
  const repeatPhrase = () => {
    if (times > 1) {
      const chunk = st.all.slice(start);
      for (let i = 1; i < times; i++) st.all.push(...cloneCols(chunk));
    }
    return times > 1 ? ` ×${times}` : "";
  };

  // Scales
  for (const sw of SCALE_WORDS) {
    const m = sw.re.exec(t);
    if (!m) continue;
    const def = SCALES.find((s) => s.id === sw.id);
    if (!def) break;
    const before = t.slice(0, m.index);
    const rm = /\b([a-g])(#|♯|b|♭|\s+sharp|\s+flat)?\s*(?:the\s+)?$/.exec(before.trim()) ?? /\b(?:in|of|key of)\s+([a-g])(#|♯|b|♭)?\b/.exec(t);
    if (!rm) return fail(`Which key? e.g. "A ${m[0]}".`);
    const pc = (LETTER_PC[rm[1]!]! + accPc(rm[2]) + 12) % 12;
    const pos = /\b(?:at|in|from)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s*(?:fret|position)\b|\bposition\s+(\d+)\b/.exec(t);
    let pts = scaleNotes(pc, def.degrees, st.tuning, pos ? Number(pos[1] ?? pos[2]) : null);
    if (!pts.length) return fail("That scale doesn't fit on this tuning there.");
    const down = /\b(?:down|descend(?:ing)?|backwards?)\b/.test(t) && !/\bup\s+and\s+down\b/.test(t);
    if (/\bup\s+and\s+down\b|\bthere\s+and\s+back\b/.test(t)) pts = [...pts, ...pts.slice(0, -1).reverse()];
    else if (down) pts = [...pts].reverse();
    for (const p of pts) st.all.push(noteCol(st.n, [{ s: p.s, cell: { fret: p.fret } }], { beats: st.beats }));
    st.hand = pts[0]!.fret;
    const rootName = PC_NAMES[pc]!;
    const frets = pts.map((p) => p.fret);
    return finish(`${rootName} ${def.name.replace(/\s*\(.*\)/, "").replace(/\s+scale$/i, "")} scale${down ? " (down)" : ""}, frets ${Math.min(...frets)}–${Math.max(...frets)}${repeatPhrase()}`);
  }

  // Power chord rooted on a named string
  const hit = findString(t, st.tuning, true);
  const powerWords = /\bpower\s*chords?\b|\bfifths?\s+chord\b/.test(t);
  const powerS = powerWords && hit ? hit.s : !hit && st.mode?.kind === "power" && /\d|\bopen\b/.test(t) && !chordsIn(original).length ? st.mode.s : null;
  if (powerS !== null) {
    const rest2 = (hit ? t.replace(hit.match, " ") : t).replace(/\bpower\s*chords?\b/, " ").replace(/\bopen\b/g, " 0 ");
    const frets = [...rest2.matchAll(/(\d+)/g)].map((m) => Number(m[1])).filter((f) => f <= MAX_FRET);
    if (!frets.length) frets.push(0);
    st.mode = { kind: "power", s: powerS };
    const strum = strumDirs(t);
    const said: string[] = [];
    for (const fret of frets) {
      const shape = powerChord(st.tuning, powerS, fret);
      const label = `${noteNameAt(st.tuning, powerS, fret)}5`;
      pushChord(st, shape, label, strum);
      if (fret > 0) st.hand = fret;
      said.push(`${label} at fret ${fret} (${shapeText(shape)})`);
    }
    return finish(`power chord${frets.length > 1 ? "s" : ""} on the ${stringLabel(st.tuning, powerS)}: ${said.join(", ")}${strum.length > 1 ? ` ${strum.map(arrow).join("")}` : ""}${repeatPhrase()}`);
  }

  // Notes on a named string (or the string we were already on)
  const syntax = techWordsToSyntax(hit ? t.replace(hit.match, " ") : t);
  const hasNoteWords = /\bnotes?\b/.test(t);
  const chords = hit ? [] : chordsIn(original.replace(/\b(?:the\s+)?(?:low|high)\s+[A-Ga-g]\b/g, " "));

  // Double stops: two or more strings at once ("5 on the G and 5 on the B together")
  if (/\b(?:double[- ]?stops?|together|(?:at\s+)?the\s+same\s+time|dyads?|at\s+once)\b/.test(t)) {
    const notesAt: { s: number; cell: Cell }[] = [];
    for (const seg of t.replace(/\b(?:double[- ]?stops?|together|(?:at\s+)?the\s+same\s+time|dyads?|at\s+once)\b/g, " ").split(/\s*(?:\band\b|\bwith\b|\+|&|,)\s*/)) {
      const h = findString(seg, st.tuning, true);
      if (!h) continue;
      const op = readTokens(techWordsToSyntax(seg.replace(h.match, " ")).replace(/\b(\d+)(?:st|nd|rd|th)\b/g, "$1").replace(/\bfrets?\b/g, " ")).find((o) => o.kind === "note");
      if (op?.kind === "note") notesAt.push({ s: h.s, cell: { fret: op.note.fret, ...op.note.cell } });
    }
    if (notesAt.length >= 2) {
      st.all.push(noteCol(st.n, notesAt, { beats: st.beats }));
      st.string = notesAt[notesAt.length - 1]!.s;
      return finish(`double stop ${notesAt.map((x) => `${st.tuning.names[x.s]}${cellText(x.cell)}`).join(" + ")}${repeatPhrase()}`);
    }
  }

  // Note names: "the notes C D E on the B string", "note G#"
  if (hasNoteWords && !/\d/.test(syntax.replace(/\b[a-g][#b]?\d\b/g, ""))) {
    const names = [...(hit ? t.replace(hit.match, " ") : t).matchAll(/\b([a-g])(#|♯|♭|b(?![a-z]))?(\d)?\b/g)].filter((m) => !/^(a|b)$/.test(m[0]) || /\bnotes?\b/.test(t));
    const midis: number[] = [];
    for (const m of names) {
      const pc = (LETTER_PC[m[1]!]! + accPc(m[2]) + 12) % 12;
      if (m[3]) midis.push(12 * (Number(m[3]) + 1) + pc);
      else {
        // Nearest octave to the previous note (or the middle of the neck).
        const ref = midis[midis.length - 1] ?? (hit ? st.tuning.midis[hit.s]! + 5 : st.tuning.midis[0]! + 5);
        let best = pc;
        while (best < ref - 6) best += 12;
        midis.push(best);
      }
    }
    // Drop a leading article "a" read as the note A ("play a C") when more notes follow.
    if (names.length > 1 && names[0]![0] === "a" && /\bplay\s+a\s/.test(t)) midis.shift();
    if (!midis.length) return fail("Which notes? e.g. \"the notes E G A on the D string\".");
    const placed = hit ? midis.map((m) => placeNote(m, st.tuning, st.hand, hit.s)) : placeMelody(midis, st.tuning, st.hand);
    const said: string[] = [];
    placed.forEach((p, i) => {
      if (!p) {
        said.push(`${names[i]?.[0] ?? "?"}: out of reach`);
        return;
      }
      st.all.push(noteCol(st.n, [{ s: p.s, cell: { fret: p.fret } }], { beats: st.beats }));
      if (p.fret > 0) st.hand = p.fret;
      said.push(`${(names[i]?.[0] ?? "").toUpperCase()}→${st.tuning.names[p.s]}${p.fret}`);
    });
    if (st.all.length === start) return fail("Those notes don't fit on this tuning.");
    st.string = placed[placed.length - 1]?.s ?? st.string;
    return finish(`notes ${said.join(" ")}${repeatPhrase()}`);
  }

  // Chords
  if (chords.length && !hit) {
    const arp = sweep || /\b(?:arpeggi\w*|pick\s+(?:through|each|every)|fingerpick\w*|roll(?:ed)?|broken)\b/.test(t) || st.mode?.kind === "arp";
    st.mode = arp ? { kind: "arp" } : null;
    const near = /\b(?:at|on)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s*(?:fret|position)\b|\bbarre(?:d)?\s+(?:at|on)?\s*(?:the\s+)?(\d+)/.exec(t);
    const strum = strumDirs(t);
    const said: string[] = [];
    for (const c of chords) {
      const shape = chordShape(c.name, st.tuning, near ? Number(near[1] ?? near[2]) : undefined);
      if (!shape) {
        said.push(`${c.name.label}: no shape on this tuning`);
        continue;
      }
      if (arp) {
        const up = shape.map((f, s) => ({ f, s })).filter((x): x is { f: number; s: number } => x.f !== null);
        const back = sweep && /\bup\s+and\s+down\b|\bthere\s+and\s+back\b|\bback\s+down\b/.test(t) ? up.slice(0, -1).reverse() : sweep && /\bdown\b/.test(t) ? null : [];
        const seq = back === null ? [...up].reverse().map((x) => ({ ...x, dir: "up" as const })) : [...up.map((x) => ({ ...x, dir: "down" as const })), ...back.map((x) => ({ ...x, dir: "up" as const }))];
        seq.forEach((x, k) => st.all.push(noteCol(st.n, [{ s: x.s, cell: { fret: x.f } }], { beats: st.beats, ...(k === 0 ? { chord: c.name.label } : {}), ...(sweep ? { strum: x.dir } : {}) })));
      } else pushChord(st, shape, c.name.label, strum);
      const frets = shape.filter((f): f is number => f !== null && f > 0);
      if (frets.length) st.hand = Math.min(...frets);
      said.push(`${c.name.label} (${shapeText(shape)})`);
    }
    if (st.all.length === start) return fail(said.join(", ") || "No chord shape found.");
    return finish(`${sweep ? "sweep-picked arpeggio" : arp ? "arpeggio" : "chord"}${chords.length > 1 ? "s" : ""} ${said.join(", ")}${!arp && strum.length > 1 ? ` ${strum.map(arrow).join("")}` : ""}${repeatPhrase()}`);
  }

  // Tab shorthand / frets on a string
  const ops = readTokens(syntax.replace(/\b(\d+)(?:st|nd|rd|th)\b/g, "$1").replace(/\bfrets?\b/g, " "));
  if (!ops.length) {
    if (hit) return fail(`Which fret on the ${stringLabel(st.tuning, hit.s)}? e.g. "3rd fret" or "open".`);
    return fail('I didn\'t catch that. Try "5th fret on the G string", "strum G", "A minor pentatonic" or "rest".');
  }
  const s = hit?.s ?? st.string;
  if (s === null) return fail('Which string? e.g. "5th fret on the G string".');
  st.string = s;
  const said: string[] = [];
  for (const op of ops) {
    if (op.kind === "mod") {
      const prev = lastNote(st);
      if (!prev) return fail("There's no note before this to change.");
      if (op.bend) {
        prev.cell.bend = op.bend;
        if (op.prebend) prev.cell.prebend = true;
        said.push(`${op.prebend ? "pre-bend" : "bend"} ${BEND_NAME[op.bend] ?? op.bend}`);
      }
      if (op.out) {
        prev.cell.out = op.out;
        said.push(`slide off ${op.out === "/" ? "up" : "down"}`);
      }
      if (op.release) {
        if (!prev.cell.bend) prev.cell.bend = 2;
        prev.cell.release = true;
        said.push("release");
      }
      if (op.vibrato) {
        prev.cell.vibrato = true;
        if (op.wide) prev.cell.wide = true;
        said.push(op.wide ? "wide vibrato" : "vibrato");
      }
      continue;
    }
    const note = op.note;
    if (note.leadLink) {
      const prev = lastNote(st, s);
      if (prev && typeof prev.cell.fret === "number" && typeof note.fret === "number") {
        prev.cell.link = note.leadLink === "S" ? (note.fret >= prev.cell.fret ? "/" : "\\") : note.leadLink;
        said.push(prev.cell.link === "h" ? "hammer-on" : prev.cell.link === "p" ? "pull-off" : "slide");
      }
    }
    const cell: Cell = { fret: note.fret, ...note.cell, ...(note.link ? { link: note.link } : {}) };
    st.all.push(noteCol(st.n, [{ s, cell }], { beats: st.beats }));
    if (typeof note.fret === "number" && note.fret > 0) st.hand = note.fret;
    said.push(`${cellText(cell)}${cell.link ?? ""}`);
  }
  if (st.all.length === start && !said.length) return fail("Nothing to add.");
  if (/\bunison\b/.test(t)) {
    // Unison bend: bend this string up to the pitch of the same note held on the next string up.
    for (let i = start; i < st.all.length; i++) {
      const c = st.all[i]!;
      const cell = c.cells[s];
      if (!cell?.bend || typeof cell.fret !== "number" || s + 1 >= st.n) continue;
      const f = cell.fret + cell.bend - (st.tuning.midis[s + 1]! - st.tuning.midis[s]!);
      if (f >= 0) c.cells[s + 1] = { fret: f };
      said.push(`unison with ${st.tuning.names[s + 1]}${f}`);
    }
  }
  return finish(`${stringLabel(st.tuning, s)}: ${said.join(" ")}${repeatPhrase()}`.replace(/([hp/\\]) (?=[\d(<t])/g, "$1"));
}

const BEND_NAME: Record<number, string> = { 0.5: "¼", 1: "½", 2: "full", 3: "1½", 4: "2 steps" };

const arrow = (d: "down" | "up") => (d === "down" ? "↓" : "↑");

function strumDirs(t: string): ("down" | "up")[] {
  const seq = [...t.replace(/\bup\s+and\s+down\b/g, " ").matchAll(/\b(down|up|dn)(?=\s|$|,)/g)].map((m) => (m[1]!.startsWith("d") ? "down" : "up") as "down" | "up");
  return seq.length ? seq : [];
}

function pushChord(st: State, shape: (number | null)[], label: string, strum: ("down" | "up")[]) {
  const notes = shape.map((f, s) => (f === null ? null : { s, cell: { fret: f } as Cell })).filter((x): x is { s: number; cell: Cell } => !!x);
  const dirs = strum.length ? strum : [undefined];
  dirs.forEach((d, i) => st.all.push(noteCol(st.n, notes.map((x) => ({ s: x.s, cell: { ...x.cell } })), { beats: st.beats, ...(i === 0 ? { chord: label } : {}), ...(d ? { strum: d } : {}) })));
}

const PC_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function noteNameAt(tuning: TabTuning, s: number, f: number): string {
  return PC_NAMES[(((tuning.midis[s]! + f) % 12) + 12) % 12]!;
}

/** Apply a description to a tab. `prior` is the tab so far (it may be edited: "bend it", "repeat that"). */
export function describe(text: string, tuning: TabTuning, prior: Column[] = []): DescribeResult {
  const st: State = {
    tuning,
    n: tuning.midis.length,
    all: cloneCols(prior),
    beats: DEFAULT_BEATS,
    string: null,
    hand: 0,
    phraseStarts: [],
    mode: null,
    sentenceStart: 0,
  };
  // Carry on from the tab so far: same rhythm, same string, same hand position.
  const lastNotes = [...prior].reverse().find((c) => c.kind === "notes");
  if (lastNotes) {
    st.beats = lastNotes.beats;
    const ss = lastNotes.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    if (ss.length === 1) st.string = ss[0]!;
    const fs = lastNotes.cells.map((c) => (c && typeof c.fret === "number" ? c.fret : 0)).filter((f) => f > 0);
    if (fs.length) st.hand = Math.min(...fs);
  }
  const lines: DescribeLine[] = [];
  for (const sentence of splitPhrases(text)) {
    st.mode = null;
    st.sentenceStart = st.all.length;
    for (const p of sentence) lines.push(applyPhrase(p, st));
  }
  return { cols: st.all, added: st.all.length - prior.length, lines, bpm: st.bpm };
}

/** Example descriptions shown as tap-to-try chips. */
export const DESCRIBE_EXAMPLES = [
  "Low E open three times palm muted, then 3rd fret on the low E, then 5th fret",
  "5h7p5 on the G string, then 7th fret on the D string with vibrato",
  "Bend the 7th fret on the B string a whole step and release",
  "Strum G down down up, then C, then D twice",
  "A minor pentatonic at the 5th fret up and down as sixteenth notes",
  "Arpeggiate Am then Fmaj7, let ring",
  "Power chord on the A string at fret 5, then at fret 3, palm muted",
  "Harmonic at 12 on the G string, new bar, rest for a beat",
  "Pre-bend the 15th fret on the G string a whole step and release, then pinch harmonic at 5 on the D string with wide vibrato",
  "Unison bend at the 7th fret on the G string, then trill 5 and 7 on the B string",
  "Tremolo pick the 12th fret on the high e as sixteenth notes 8 times",
  "Sweep pick Am up and down as triplets",
  "Slide into 9 on the B string, then 10 and 12 legato, slide off down",
  "5 on the G and 5 on the B together twice, alternate picking",
  "Low E open with a whammy dive, then hammer on from nowhere at 7 on the A string",
];
