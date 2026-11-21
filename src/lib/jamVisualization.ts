import type { NeckDot } from "@/components/Neck";
import { layerPcs, type JamLayer } from "@/lib/jam";

export type JamLayout = "overlapping" | "separate";
export type JamNoteRole = "jam-scale" | "jam-arpeggio" | "jam-target";

export function setLayerVisibility(layers: JamLayer[], id: string, visible: boolean): JamLayer[] {
  return layers.map((layer) => layer.id === id ? { ...layer, visible } : layer);
}

/** Membership is by pitch class, never spelling or selection order. */
export function jamNoteRoles(layers: JamLayer[]): Map<number, JamNoteRole> {
  const scale = new Set<number>();
  const arpeggio = new Set<number>();
  for (const layer of layers) {
    if (layer.visible === false) continue;
    const set = layer.kind === "scale" ? scale : arpeggio;
    for (const pc of layerPcs(layer)) set.add(pc);
  }
  const roles = new Map<number, JamNoteRole>();
  for (const pc of scale) roles.set(pc, arpeggio.has(pc) ? "jam-target" : "jam-scale");
  for (const pc of arpeggio) if (!scale.has(pc)) roles.set(pc, "jam-arpeggio");
  return roles;
}

/** Arpeggio #1 keeps Jam's pink; every further arpeggio gets its own colour so overlays can be told apart. */
export const JAM_ARP_COLORS = ["var(--jam-arpeggio)", "#fb923c", "#a3e635", "#a78bfa", "#2dd4bf", "#facc15", "#f87171", "#e879f9"];

/**
 * Colour per arpeggio layer id. Only used once two or more arpeggios are visible; the colour is
 * the layer's stable position among all arpeggios, so hiding one never recolours the others.
 */
export function arpeggioColors(layers: JamLayer[]): Map<string, string> {
  const arps = layers.filter((l) => l.kind === "arpeggio");
  const out = new Map<string, string>();
  if (arps.filter((l) => l.visible !== false).length < 2) return out;
  arps.forEach((l, i) => out.set(l.id, JAM_ARP_COLORS[i % JAM_ARP_COLORS.length]!));
  return out;
}

/** For each pitch class, the colours of the visible arpeggios (in `scope`) that contain it. */
export function arpeggioPcColors(scope: JamLayer[], colors: Map<string, string>): Map<number, string[]> {
  const out = new Map<number, string[]>();
  if (!colors.size) return out;
  for (const l of scope) {
    const c = colors.get(l.id);
    if (!c || l.visible === false || l.kind !== "arpeggio") continue;
    for (const pc of layerPcs(l)) out.set(pc, [...(out.get(pc) ?? []), c]);
  }
  return out;
}

/** Separate boards retain global target semantics but only draw their own collection. */
export function jamBoards(layers: JamLayer[], layout: JamLayout) {
  const visible = layers.filter((layer) => layer.visible !== false);
  const roles = jamNoteRoles(visible);
  const colors = arpeggioColors(layers);
  if (layout === "overlapping") return [{ id: "overlapping", layer: undefined, roles, arps: arpeggioPcColors(visible, colors) }];
  return visible.map((layer) => ({
    id: layer.id,
    layer,
    arps: arpeggioPcColors([layer], colors),
    roles: new Map(layerPcs(layer).flatMap((pc) => {
      const role = roles.get(pc);
      return role ? [[pc, role] as const] : [];
    })),
  }));
}

export function jamBoardDots(midis: number[], to: number, roles: Map<number, JamNoteRole>, rootPc: number, label: (pc: number) => string, nextPcs: Set<number> = new Set(), arps: Map<number, string[]> = new Map()): NeckDot[] {
  const dots: NeckDot[] = [];
  midis.forEach((open, s) => {
    for (let fret = 0; fret <= to; fret++) {
      const pc = ((open + fret) % 12 + 12) % 12;
      const tone = roles.get(pc);
      if (tone) dots.push({ s, fret, tone, label: label(pc), ring: pc === rootPc, ...(arps.get(pc) ? { arpColors: arps.get(pc)! } : {}) });
      else if (nextPcs.has(pc)) dots.push({ s, fret, tone: "next" });
    }
  });
  return dots;
}