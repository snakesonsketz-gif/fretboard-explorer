/** Finish and body-work diagrams, one picture per step. */
import { Arrow, At, C, Figure, Hl, N, T, Tag, Zoom } from "./kit";

export function DropFillDiagram() {
  const x = 180;
  const chip = `M ${x - 30} 100 L ${x - 16} 124 L ${x + 20} 124 L ${x + 30} 100 Z`;
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
      <rect x={20} y={124} width={320} height={50} fill={C.wood} stroke={C.woodDark} />
      <rect x={20} y={100} width={320} height={24} fill="#c0392b" opacity={0.85} />
      <rect x={20} y={100} width={320} height={6} fill="#e8f1f7" opacity={0.5} />
      <T x={330} y={112} anchor="end" size={8} color="#fff">finish</T>
      <T x={330} y={150} anchor="end" size={8} color={C.ink}>wood</T>
      <At n={1}>
        <path d={chip} fill="var(--color-card)" />
        <Tag x={x} y={60} anchor="middle">clean with naphtha · pick CA or lacquer</Tag>
        <Tag x={x} y={82} anchor="middle" color={C.dim}>through the colour? tint it first</Tag>
      </At>
      <At n={2}>
        <path d={chip} fill="#f2e6c4" />
        <path d={`M ${x - 30} 100 Q ${x} 72 ${x + 30} 100`} fill="#f2e6c4" stroke="#b39a5a" />
        <ellipse cx={x} cy={46} rx={4} ry={6} fill="#f2e6c4" />
        <Arrow x1={x} y1={54} x2={x} y2={74} />
        <Tag x={x + 60} y={40}>drop by drop, ABOVE the surface</Tag>
        <Tag x={x + 60} y={62} color={C.dim}>lacquer shrinks — build it up</Tag>
      </At>
      <At n={3}>
        <path d={chip} fill="#f2e6c4" />
        <path d={`M ${x - 30} 100 L ${x - 30} 96 L ${x + 30} 96 L ${x + 30} 100 Z`} fill="#f2e6c4" stroke="#b39a5a" />
        <rect x={x - 70} y={80} width={140} height={10} fill="#d6d9de" stroke={C.line} />
        <rect x={x - 70} y={90} width={18} height={6} fill="#e8d36a" />
        <rect x={x + 52} y={90} width={18} height={6} fill="#e8d36a" />
        <Arrow x1={x - 40} y1={70} x2={x + 40} y2={70} both />
        <Tag x={x} y={40} anchor="middle">fully cured, then scrape with a taped razor</Tag>
        <Zoom x={330} y={62} r={26} cx={x + 60} cy={94} scale={3} label="tape = depth stop" labelAt="above">
          <rect x={x + 40} y={80} width={30} height={10} fill="#d6d9de" />
          <rect x={x + 52} y={90} width={18} height={6} fill="#e8d36a" />
          <rect x={x + 40} y={100} width={30} height={10} fill="#c0392b" />
          <rect x={x + 40} y={96} width={12} height={4} fill="#f2e6c4" />
        </Zoom>
      </At>
      <At n={4}>
        <path d={chip} fill="#f2e6c4" opacity={0.6} />
        <path d={chip} fill="#c0392b" opacity={0.55} />
        <rect x={x - 46} y={78} width={92} height={18} rx={3} fill="#3a3f46" />
        <rect x={x - 46} y={94} width={92} height={4} fill="#8a7e6a" />
        <Arrow x1={x - 60} y1={66} x2={x + 60} y2={66} both />
        <Tag x={x} y={40} anchor="middle" color={C.good}>block-sand level, then buff to a gloss</Tag>
      </At>
      <N n={1} x={30} y={60} />
      <N n={2} x={120} y={46} />
      <N n={3} x={30} y={70} />
      <N n={4} x={30} y={60} />
    </Figure>
  );
}

export function FinishLayersDiagram() {
  const layers = [
    { l: "clear (4–10 coats), sanded + buffed", c: "#e8f1f7", h: 22, step: 3 },
    { l: "colour (1–3 coats)", c: "#c0392b", h: 14, step: 3 },
    { l: "sealer (3–4 coats)", c: "#e8d9a8", h: 12, step: 3 },
    { l: "grain filler (open-pore woods only)", c: "#8a6a45", h: 10, step: 2 },
    { l: "bare wood, sanded to 320 grit", c: C.wood, h: 40, step: 1 },
  ];
  let y = 40;
  const boxes = layers.map((ly) => {
    const b = { ...ly, y };
    y += ly.h;
    return b;
  });
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
      {boxes.map((b, i) => {
        const shown = (k: number) => k >= b.step;
        return (
          <At key={i} n={[1, 2, 3, 4].filter(shown)}>
            <Hl n={b.step === 3 ? [3, 4] : b.step}>
              <rect x={40} y={b.y} width={110} height={b.h} fill={b.c} stroke={C.line} strokeWidth={0.6} />
            </Hl>
            <line x1={150} y1={b.y + b.h / 2} x2={164} y2={b.y + b.h / 2} stroke={C.line} />
            <T x={168} y={b.y + b.h / 2} size={9} color={C.ink}>
              {b.l}
            </T>
          </At>
        );
      })}
      <At n={1}>
        <Tag x={210} y={180} anchor="middle">120 → 220 → 320 grit, with the grain</Tag>
      </At>
      <At n={2}>
        <Tag x={210} y={180} anchor="middle" color={C.dim}>ash, mahogany, rosewood… not maple/alder</Tag>
      </At>
      <At n={3}>
        <Tag x={210} y={180} anchor="middle">thin coats · 2–3 a day · 1–2 h apart</Tag>
      </At>
      <At n={4}>
        <Tag x={210} y={180} anchor="middle" color={C.good}>cure 10–14 days → wet-sand → buff</Tag>
        <rect x={40} y={36} width={110} height={4} fill="#fff" opacity={0.8} />
      </At>
      <N n={1} x={22} y={128} />
      <N n={2} x={22} y={103} />
      <N n={3} x={22} y={73} />
      <N n={4} x={22} y={50} />
    </Figure>
  );
}
