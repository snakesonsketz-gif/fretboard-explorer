import {
  CHORDS,
  SCALES,
  bestRootFor,
  degreesToPitchClasses,
  rootByName,
  spellDegree,
  type ChordDef,
  type Degree,
  type Root,
  type ScaleDef,
} from "./theory";

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const pc12 = (n: number) => ((n % 12) + 12) % 12;
export const rootForPc = (pc: number): Root => rootByName(NAMES[pc12(pc)]!);

export interface Reading {
  kind: "chord" | "scale";
  root: Root;
  name: string;
  /** e.g. "Am7/C" when the bass is not the root. */
  slash?: string;
  inversion?: string;
  degrees: Degree[];
  notes: string[];
  def: ChordDef | ScaleDef;
}

const INVERSION: Record<number, string> = { 3: "1st inversion", 5: "2nd inversion", 7: "3rd inversion" };

/** Every named chord or scale that exactly matches the pitch classes, read from each note as root. */
export function readings(pcs: number[], bassPc?: number): Reading[] {
  const set = [...new Set(pcs.map(pc12))];
  const out: Reading[] = [];
  for (const rpc of set) {
    const key = set.map((p) => pc12(p - rpc)).sort((a, b) => a - b).join(",");
    const chords = CHORDS.filter((c) => degreesToPitchClasses(c.degrees).join(",") === key).slice(0, 2);
    const scales = set.length >= 5 ? SCALES.filter((s) => degreesToPitchClasses(s.degrees).join(",") === key).slice(0, 2) : [];
    for (const c of chords) {
      // Each reading on the root name that spells it best (C#m, not Dbm with its Fb).
      const root = bestRootFor(rpc, c.degrees);
      const r: Reading = {
        kind: "chord",
        root,
        name: `${root.name}${c.suffix}`,
        degrees: c.degrees,
        notes: c.degrees.map((d) => spellDegree(root, d)),
        def: c,
      };
      if (bassPc !== undefined && pc12(bassPc) !== rpc) {
        const bassDeg = c.degrees.find((d) => pc12(degreesToPitchClasses([d])[0]! + rpc) === pc12(bassPc));
        r.slash = `${r.name}/${bassDeg ? spellDegree(root, bassDeg) : rootForPc(bassPc).name}`;
        const n = bassDeg ? parseInt(bassDeg.replace(/\D/g, ""), 10) : 0;
        r.inversion = INVERSION[n] ?? (bassDeg ? `${bassDeg} in bass` : "slash");
      } else if (bassPc !== undefined) r.inversion = "root position";
      out.push(r);
    }
    for (const s of scales) {
      const root = bestRootFor(rpc, s.degrees);
      out.push({
        kind: "scale",
        root,
        name: `${root.name} ${s.name}`,
        degrees: s.degrees,
        notes: s.degrees.map((d) => spellDegree(root, d)),
        def: s,
      });
    }
  }
  // root-position readings first, then by root order of the bass
  return out.sort((a, b) => Number(!!a.slash) - Number(!!b.slash));
}

/** Common scales (any root) that contain every note of the set — for 3–6 note sets. */
export function containingScales(pcs: number[], limit = 14): { root: Root; scale: ScaleDef }[] {
  const set = [...new Set(pcs.map(pc12))];
  if (set.length < 3 || set.length > 6) return [];
  const fams = new Set(["Major modes", "Minor", "Melodic minor modes", "Harmonic minor modes"]);
  const out: { root: Root; scale: ScaleDef }[] = [];
  const seen = new Set<string>();
  for (const s of SCALES) {
    if (!fams.has(s.family) || s.degrees.length !== 7) continue;
    for (let r = 0; r < 12; r++) {
      const spc = new Set(degreesToPitchClasses(s.degrees).map((p) => pc12(p + r)));
      if (!set.every((p) => spc.has(p))) continue;
      const k = `${r}-${s.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ root: rootForPc(r), scale: s });
    }
  }
  // put sets rooted on one of the input notes first
  out.sort((a, b) => Number(!set.includes(a.root.pc)) - Number(!set.includes(b.root.pc)));
  return out.slice(0, limit);
}
