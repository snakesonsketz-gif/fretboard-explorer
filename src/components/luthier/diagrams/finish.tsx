/** Finish and body-work diagrams. */
import { C, Figure, N, T } from "./kit";

export function DropFillDiagram() {
  const stage = (x: number, k: number) => (
    <g key={k}>
      <rect x={x - 38} y={110} width={76} height={40} fill={C.wood} stroke={C.woodDark} />
      <rect x={x - 38} y={100} width={76} height={10} fill="#d9c79c" opacity={0.85} />
      {k === 0 ? <path d={`M ${x - 12} 100 L ${x - 6} 112 L ${x + 8} 112 L ${x + 12} 100 Z`} fill={C.card} /> : null}
      {k === 1 ? <path d={`M ${x - 12} 100 Q ${x} 80 ${x + 12} 100 L ${x + 8} 112 L ${x - 6} 112 Z`} fill="#e9dcb4" stroke="#a88" /> : null}
      {k === 2 ? <path d={`M ${x - 12} 100 L ${x + 12} 100 L ${x + 12} 98 L ${x - 12} 98 Z M ${x - 12} 100 L ${x - 6} 112 L ${x + 8} 112 L ${x + 12} 100 Z`} fill="#e9dcb4" /> : null}
      {k === 3 ? <path d={`M ${x - 12} 100 L ${x - 6} 112 L ${x + 8} 112 L ${x + 12} 100 Z`} fill="#e9dcb4" /> : null}
      <N n={k + 1} x={x} y={60} />
      <T x={x} y={170} anchor="middle" size={9} color={C.ink}>
        {["chip", "overfill", "scrape (taped razor)", "sand + polish flush"][k]}
      </T>
    </g>
  );
  return (
    <Figure
      title="Drop-fill a chip in the finish"
      how={[
        "Clean the chip (naphtha) and decide on the filler: thin super glue (CA) for small chips, or lacquer drops for nitro finishes. Add colour first if the chip goes through the colour coat.",
        "Overfill: drop filler in so it stands ABOVE the surrounding finish. Lacquer shrinks a lot (nitro is only about 25% solids), so build it up with several drops — Erlewine waits hours between drops.",
        "Let it cure fully (super glue: several hours, overnight is better; lacquer: Frank Ford waits at least 3 weeks), then shave it down with a razor blade with tape on each end as a depth stop, leaving it just proud.",
        "Level with fine paper on a small block, then buff and polish until the repair disappears into the gloss.",
      ]}
    >
      {[0, 1, 2, 3].map((k) => stage(45 + k * 90, k))}
    </Figure>
  );
}

export function FinishLayersDiagram() {
  const layers = [
    { l: "clear (4–10 coats), sanded + buffed", c: "#e8f1f7", h: 22 },
    { l: "colour (1–3 coats)", c: "#c0392b", h: 14 },
    { l: "sealer (3–4 coats)", c: "#e8d9a8", h: 12 },
    { l: "grain filler (open-pore woods only)", c: "#8a6a45", h: 10 },
    { l: "bare wood, sanded to 320 grit", c: C.wood, h: 40 },
  ];
  let y = 40;
  return (
    <Figure
      title="The layers of a refinish (nitro schedule)"
      how={[
        "Prep: strip, repair dents, then sand 120 → 220 → 320 grit with the grain, damp-wiping between grits to raise the grain.",
        "Grain-fill open-pore woods (ash, mahogany, rosewood, koa, walnut) so the finish ends up flat. Maple, alder and basswood don't need it.",
        "Spray sealer, colour, then clear — 2–3 coats a day, 1–2 h apart (StewMac), about 6–12 coats in all (beginners 10–12). Thin coats; let runs harden 24 h before levelling.",
        "Let nitro cure 10–14 days (2K urethane: 4–6 days), then wet-sand level and buff to a gloss.",
      ]}
      note="Spray in a ventilated area with a respirator rated for solvents; keep cans and guitar at similar temperatures (about 70 °F / 21 °C, 50% humidity or lower)."
    >
      {layers.map((ly, i) => {
        const r = (
          <g key={i}>
            <rect x={40} y={y} width={110} height={ly.h} fill={ly.c} stroke={C.line} strokeWidth={0.6} />
            <line x1={150} y1={y + ly.h / 2} x2={164} y2={y + ly.h / 2} stroke={C.line} />
            <T x={168} y={y + ly.h / 2} size={9} color={C.ink}>
              {ly.l}
            </T>
          </g>
        );
        y += ly.h;
        return r;
      })}
      <N n={1} x={22} y={128} />
      <N n={2} x={22} y={103} />
      <N n={3} x={22} y={73} />
      <N n={4} x={22} y={50} />
    </Figure>
  );
}
