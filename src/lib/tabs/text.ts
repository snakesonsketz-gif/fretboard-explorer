/**
 * Plain-text tab → columns, so a tab can be typed by hand in the text editor or pasted from
 * anywhere (a website, a message). Reads the usual shorthand: 5h7 5p3 5/7 7\5 7b9 7b9r7 <12> (3) x t12 5~,
 * bar lines, and chord names written on a line above.
 */
import { parseChordName } from "./chords";
import { barCol, colId, DEFAULT_BEATS, emptyCells, MAX_FRET, type Cell, type Column, type Link, type TabTuning } from "./model";

const TAB_LINE = /^\s*([A-Ga-g][#b♯♭]?)?\s*([|:])?([-–—0-9xXhpb/\\~<>()[\]¼rRt|.*^sS\s]*)$/;

interface Tok {
  at: number;
  end: number;
  cell: Cell;
}

function lineTokens(body: string): Tok[] {
  const out: Tok[] = [];
  const re = /(?<![\d)>\]])([h/\\])?(t?<\d{1,2}>|\[\d{1,2}\]|\(\d{1,2}\)|t\d{1,2}|\d{1,2}|[xX])((?:pb|b)(?:\d{1,2}|¼))?(r\d{1,2})?(tr\d{1,2})?(~~|~)?([hp/\\sS](?=[\d<([t])|[/\\](?![\d<([]))?/g;
  for (const m of body.matchAll(re)) {
    let head = m[2]!;
    const cell: Cell = { fret: 0 };
    if (head.startsWith("t") && head[1] === "<") {
      cell.tap = true;
      head = head.slice(1);
    }
    if (/^[xX]$/.test(head)) cell.fret = "x";
    else if (head.startsWith("<")) {
      cell.fret = Number(head.slice(1, -1));
      cell.harmonic = true;
    } else if (head.startsWith("[")) {
      cell.fret = Number(head.slice(1, -1));
      cell.pinch = true;
    } else if (head.startsWith("(")) {
      cell.fret = Number(head.slice(1, -1));
      cell.ghost = true;
    } else if (head.startsWith("t")) {
      cell.fret = Number(head.slice(1));
      cell.tap = true;
    } else cell.fret = Number(head);
    if (typeof cell.fret === "number" && cell.fret > MAX_FRET) continue;
    if (m[1]) cell.into = m[1] as Cell["into"];
    if (m[3] && typeof cell.fret === "number") {
      const pre = m[3].startsWith("pb");
      const v = m[3].slice(pre ? 2 : 1);
      cell.bend = v === "¼" ? 0.5 : Math.max(1, Number(v) - cell.fret);
      if (pre) cell.prebend = true;
    }
    if (m[4]) cell.release = true;
    if (m[5]) cell.trill = Number(m[5].slice(2));
    if (m[6]) {
      cell.vibrato = true;
      if (m[6] === "~~") cell.wide = true;
    }
    const tail = m[7];
    if (tail) {
      const isLink = /[hpsS]/.test(tail) || /[\d<([t]/.test(body[(m.index ?? 0) + m[0].length] ?? "");
      if (isLink) cell.link = (tail === "s" || tail === "S" ? "/" : tail) as Link;
      else cell.out = tail as Cell["out"];
    }
    const at = (m.index ?? 0) + (m[1] ? 1 : 0);
    out.push({ at, end: at + head.length, cell });
  }
  return out;
}

export interface ImportResult {
  cols: Column[];
  /** Number of string lines per system that were found. */
  strings: number;
  systems: number;
}

/** Parse text tab. Lines are read top (thinnest string) to bottom (thickest). */
export function importText(text: string, tuning: TabTuning): ImportResult {
  const n = tuning.midis.length;
  const lines = text.replace(/\t/g, "  ").split(/\r?\n/);
  const isTab = (l: string) => {
    const m = TAB_LINE.exec(l);
    return !!m && (m[3] ?? "").replace(/[^-–—]/g, "").length >= 3;
  };
  const cols: Column[] = [];
  let systems = 0;
  let width = 0;
  for (let i = 0; i < lines.length; ) {
    if (!isTab(lines[i]!)) {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && isTab(lines[j]!)) j++;
    const group = lines.slice(i, j);
    const chordLine = i > 0 && !isTab(lines[i - 1]!) ? lines[i - 1]! : "";
    i = j;
    systems++;
    width = Math.max(width, group.length);
    // Strip "e|" so every line starts at the same column.
    const bodies = group.map((l) => {
      const m = /^\s*[A-Ga-g]?[#b♯♭]?\s*[|:]?/.exec(l)!;
      return { off: m[0].length, body: l.slice(m[0].length) };
    });
    const off = Math.max(...bodies.map((b) => b.off));
    const rows = bodies.map((b) => " ".repeat(off - b.off) + b.body);
    const toks = rows.map((r, row) => lineTokens(r).map((t) => ({ ...t, row })));
    const flat = toks.flat().sort((a, b) => a.at - b.at);
    // Bar lines: a "|" in the same place on most lines.
    const bars = new Set<number>();
    const len = Math.max(...rows.map((r) => r.length));
    for (let x = 0; x < len; x++) if (rows.filter((r) => r[x] === "|").length >= Math.ceil(rows.length / 2) && x < len - 1) bars.add(x);
    // Group tokens whose spans overlap (a "10" and a "5" in the same column).
    type Group = { at: number; end: number; items: typeof flat };
    const groups: Group[] = [];
    for (const t of flat) {
      const g = groups[groups.length - 1];
      if (g && t.at < g.end && t.at >= g.at - 1 && !g.items.some((x) => x.row === t.row)) {
        g.items.push(t);
        g.end = Math.max(g.end, t.end);
      } else groups.push({ at: t.at, end: t.end, items: [t] });
    }
    const chordAt = [...chordLine.matchAll(/\S+/g)].map((m) => ({ at: (m.index ?? 0) - off, name: parseChordName(m[0]) })).filter((c) => c.name);
    let barIdx = [...bars].sort((a, b) => a - b);
    const sysCols: Column[] = [];
    for (const g of groups) {
      while (barIdx.length && barIdx[0]! < g.at) {
        if (sysCols.length) sysCols.push(barCol(n));
        barIdx = barIdx.slice(1);
      }
      const cells = emptyCells(n);
      for (const t of g.items) {
        // Row 0 is the top (thinnest) string; extra lines past the thickest string are dropped.
        const idx = n - 1 - t.row;
        if (idx >= 0) cells[idx] = t.cell;
      }
      const chord = chordAt.find((c) => Math.abs(c.at - g.at) <= 1);
      sysCols.push({ id: colId(), kind: "notes", cells, beats: DEFAULT_BEATS, ...(chord?.name ? { chord: chord.name.label } : {}) });
    }
    if (cols.length && sysCols.length) cols.push(barCol(n));
    cols.push(...sysCols);
  }
  return { cols, strings: width, systems };
}
