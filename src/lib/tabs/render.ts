/** Tab → plain text ("ASCII tab"), the format guitarists paste everywhere. */
import { cellText, FX, type Column, type TabDoc } from "./model";

export interface Layout {
  /** For each column, its width in characters (cells are padded to it). */
  widths: number[];
}

/** String labels top to bottom (thinnest first). A repeated letter on the top string is written lowercase ("e"). */
export function lineNames(names: string[]): string[] {
  const top = [...names].reverse();
  const lowName = names[0];
  if (top.length > 1 && lowName && top[0] === lowName) top[0] = top[0]!.toLowerCase();
  const w = Math.max(...top.map((n) => n.length));
  return top.map((n) => n.padEnd(w, " "));
}

function colWidth(c: Column): number {
  if (c.kind === "bar") return 1;
  if (c.kind === "rest") return 1;
  let w = 1;
  for (const cell of c.cells) if (cell) w = Math.max(w, cellText(cell).length + (cell.out && !cell.link ? 1 : 0));
  if (c.chord) w = Math.max(w, Math.min(c.chord.length, 6));
  return w;
}

/** One system (a run of columns) as text lines: optional chord/strum/PM lines, then one line per string. */
function system(doc: TabDoc, cols: Column[], names: string[]): string[] {
  const n = doc.tuning.midis.length;
  const strings: string[] = names.map((nm) => `${nm}|-`);
  let chord = " ".repeat(names[0]!.length + 2);
  let strum = chord;
  let pm = chord;
  let ring = chord;
  let hasChord = false;
  let hasStrum = false;
  let hasPm = false;
  let hasRing = false;
  // Effects (T.P., whammy, rake, accents) are written where their column starts.
  const fxBuf: string[] = [];
  let pos = chord.length;
  const putFx = (at: number, text: string) => {
    while (fxBuf.length < at + text.length) fxBuf.push(" ");
    let x = at;
    while (fxBuf.slice(x, x + text.length).some((ch) => ch !== " ") && x < at + 6) x++;
    while (fxBuf.length < x + text.length + 1) fxBuf.push(" ");
    for (let k = 0; k < text.length; k++) fxBuf[x + k] = text[k]!;
  };
  cols.forEach((c, ci) => {
    const w = colWidth(c);
    const at = pos;
    pos += c.kind === "bar" ? 2 : w + 1;
    if (c.fx?.length) {
      const prev = [...cols.slice(0, ci)].reverse().find((x) => x.kind !== "bar");
      for (const f of c.fx) {
        // An effect that carries on from the column before is drawn as a line: "T.P.--------".
        if (prev?.fx?.includes(f)) {
          while (fxBuf.length < at + w + 1) fxBuf.push(" ");
          for (let k = at - 1; k < at + w; k++) if (k >= 0 && fxBuf[k] === " ") fxBuf[k] = "-";
        } else putFx(at, FX[f].mark);
      }
    }
    if (c.kind === "bar") {
      for (let r = 0; r < n; r++) strings[r] += "|-";
      chord += "  ";
      strum += "  ";
      pm += hasPm && cols[ci + 1]?.pm && cols[ci - 1]?.pm ? "--" : "  ";
      ring += "  ";
      return;
    }
    for (let r = 0; r < n; r++) {
      const cell = c.cells[n - 1 - r] ?? null;
      if (c.kind === "rest" || !cell) {
        strings[r] += "-".repeat(w + 1);
        continue;
      }
      const t = cellText(cell);
      // A hammer/pull/slide sits right against the next note: "5h7", "5/7".
      strings[r] += cell.link ? t.padStart(w, "-") + cell.link : (t + (cell.out ?? "")).padEnd(w, "-") + "-";
    }
    const label = (c.chord ?? "").slice(0, w + 1);
    if (label) hasChord = true;
    chord += label.padEnd(w + 1, " ");
    const arrow = c.strum === "down" ? "↓" : c.strum === "up" ? "↑" : "";
    if (arrow) hasStrum = true;
    strum += arrow.padEnd(w + 1, " ");
    if (c.pm) {
      hasPm = true;
      const start = !cols.slice(0, ci).reverse().find((x) => x.kind !== "bar")?.pm;
      pm += (start ? "PM" : "--").padEnd(w + 1, "-").slice(0, w + 1);
    } else pm += " ".repeat(w + 1);
    if (c.ring) {
      hasRing = true;
      ring += "~".repeat(w + 1);
    } else ring += " ".repeat(w + 1);
  });
  for (let r = 0; r < n; r++) strings[r] += "|";
  const out: string[] = [];
  if (fxBuf.length) out.push(fxBuf.join("").trimEnd());
  if (hasChord) out.push(chord.trimEnd());
  if (hasStrum) out.push(strum.trimEnd());
  if (hasPm) out.push(pm.trimEnd());
  if (hasRing) out.push(`${ring.trimEnd()}${ring.trim() ? "  (let ring)" : ""}`);
  return [...out, ...strings];
}

/** Split columns into systems no wider than `width` characters, breaking after bar lines when possible. */
export function systems(cols: Column[], width: number): Column[][] {
  const out: Column[][] = [];
  let cur: Column[] = [];
  let len = 0;
  let lastBar = -1;
  for (const c of cols) {
    const w = colWidth(c) + 1;
    if (len + w > width && cur.length) {
      if (lastBar > 0 && lastBar < cur.length - 1) {
        out.push(cur.slice(0, lastBar + 1));
        cur = cur.slice(lastBar + 1);
        len = cur.reduce((a, x) => a + colWidth(x) + 1, 0);
      } else {
        out.push(cur);
        cur = [];
        len = 0;
      }
      lastBar = -1;
    }
    // A system never starts with a bar line (the left edge already is one).
    if (c.kind === "bar" && cur.length === 0) continue;
    cur.push(c);
    len += w;
    if (c.kind === "bar") lastBar = cur.length - 1;
  }
  if (cur.length) out.push(cur);
  return out.map((s) => (s[s.length - 1]?.kind === "bar" ? s.slice(0, -1) : s)).filter((s) => s.length);
}

export function renderAscii(doc: TabDoc, opts: { width?: number; header?: boolean } = {}): string {
  const names = lineNames(doc.tuning.names);
  const body = systems(doc.cols, opts.width ?? 72).map((s) => system(doc, s, names).join("\n"));
  const head = opts.header === false ? [] : [doc.title, `Tuning: ${doc.tuning.name} (${doc.tuning.names.join(" ")}) · ${doc.bpm} bpm`, ""];
  if (!body.length) body.push(names.map((nm) => `${nm}|--------|`).join("\n"));
  return [...head, body.join("\n\n")].join("\n") + "\n";
}
