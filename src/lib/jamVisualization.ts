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

/** Separate boards retain global target semantics but only draw their own collection. */
export function jamBoards(layers: JamLayer[], layout: JamLayout) {
  const visible = layers.filter((layer) => layer.visible !== false);
  const roles = jamNoteRoles(visible);
  if (layout === "overlapping") return [{ id: "overlapping", layer: undefined, roles }];
  return visible.map((layer) => ({
    id: layer.id,
    layer,
    roles: new Map(layerPcs(layer).flatMap((pc) => {
      const role = roles.get(pc);
      return role ? [[pc, role] as const] : [];
    })),
  }));
}

export function jamBoardDots(midis: number[], to: number, roles: Map<number, JamNoteRole>, rootPc: number, label: (pc: number) => string, nextPcs: Set<number> = new Set()): NeckDot[] {
  const dots: NeckDot[] = [];
  midis.forEach((open, s) => {
    for (let fret = 0; fret <= to; fret++) {
      const pc = ((open + fret) % 12 + 12) % 12;
      const tone = roles.get(pc);
      if (tone) dots.push({ s, fret, tone, label: label(pc), ring: pc === rootPc });
      else if (nextPcs.has(pc)) dots.push({ s, fret, tone: "next" });
    }
  });
  return dots;
}