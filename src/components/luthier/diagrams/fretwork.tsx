/** Fret repair pictures: finding a high fret, gluing a lifted one, pulling, installing, slots and wear. */
import { Arrow, At, C, Figure, Gap, Hl, N, T, Tag, Turn, Zoom } from "./kit";

/** A fret seen from the side, crown up, sitting on the board at y. */
const SideFret = ({ x, y, h = 9, w = 9, fill = C.metalFill }: { x: number; y: number; h?: number; w?: number; fill?: string }) => (
  <path d={`M ${x - w / 2} ${y} C ${x - w / 2} ${y - h * 1.3}, ${x + w / 2} ${y - h * 1.3}, ${x + w / 2} ${y} Z`} fill={fill} stroke={C.line} strokeWidth={0.7} />
);

/* ------------------------------------------------------------------ fret rocker */

export function FretRockerDiagram() {
  const xs = [50, 100, 148, 194, 238, 280, 320];
  const high = 3;
  const top = (i: number) => (i === high ? 104 : 110);
  return (
    <Figure
      title="Find a high fret with a fret rocker"
      how={[
        "Tune to pitch with the neck adjusted as you play it. Lay the fret rocker across three frets at a time, right along a string's path.",
        "Rock it gently from end to end. If it rocks, the middle fret of the three is higher than the two either side of it.",
        "Slide along one fret at a time, all the way up the neck, and repeat on the path of every string — a fret can be high at one end only.",
        "Mark each high fret (and which end) with tape. Then press it down to see if it's loose before you decide to reseat or file it.",
      ]}
      note="A rocker only compares neighbours, so it finds single high frets, not a neck that's bowed overall — check relief first."
    >
      <rect x={20} y={110} width={330} height={34} fill={C.woodFill} stroke={C.woodDark} />
      <T x={185} y={156} anchor="middle" size={8}>fretboard, side view (heights exaggerated)</T>
      {xs.map((x, i) => (
        <Hl key={x} n={i === high ? [2, 4] : 99} dim={1}>
          <SideFret x={x} y={110} h={i === high ? 14 : 9} />
        </Hl>
      ))}
      {/* the rocker over frets 2-4 (index 2,3,4), resting on the high middle fret */}
      <At n={1}>
        <rect x={140} y={top(high) - 22} width={106} height={8} rx={2} fill="#b8bec6" stroke={C.line} />
        <Tag x={193} y={58} anchor="middle">rocker spans three frets</Tag>
      </At>
      <At n={2}>
        <g transform={`rotate(-5 194 ${top(high) - 18})`}>
          <rect x={140} y={top(high) - 22} width={106} height={8} rx={2} fill="#b8bec6" stroke={C.line} />
        </g>
        <g transform={`rotate(5 194 ${top(high) - 18})`} opacity={0.45}>
          <rect x={140} y={top(high) - 22} width={106} height={8} rx={2} fill="none" stroke={C.ink} strokeDasharray="3 2" />
        </g>
        <Turn cx={194} cy={58} r={10} cw />
        <Tag x={194} y={36} anchor="middle" color={C.bad}>it rocks = the middle fret is high</Tag>
        <Zoom x={300} y={62} r={30} cx={194} cy={top(high) - 12} scale={2.6} label="pivots on the high fret">
          <rect x={170} y={110} width={50} height={10} fill={C.woodFill} />
          <SideFret x={194} y={110} h={14} />
          <g transform={`rotate(-5 194 ${top(high) - 18})`}>
            <rect x={160} y={top(high) - 22} width={70} height={8} fill="#b8bec6" />
          </g>
        </Zoom>
      </At>
      <At n={3}>
        <rect x={140} y={top(high) - 22} width={106} height={8} rx={2} fill="#b8bec6" stroke={C.line} opacity={0.4} />
        <rect x={186} y={top(high) - 22} width={106} height={8} rx={2} fill="#b8bec6" stroke={C.line} />
        <Arrow x1={200} y1={66} x2={250} y2={66} />
        <Tag x={225} y={44} anchor="middle">move one fret at a time, every string</Tag>
        <g transform="translate(20 22)">
          <rect x={0} y={0} width={70} height={46} rx={4} fill="var(--color-card)" stroke={C.line} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <line key={k} x1={6} y1={6 + k * 7} x2={64} y2={6 + k * 7} stroke={C.string} strokeWidth={0.8} />
          ))}
          <rect x={26} y={2} width={8} height={42} fill={C.accent} opacity={0.5} />
          <T x={35} y={52} anchor="middle" size={7}>top view: each string path</T>
        </g>
      </At>
      <At n={4}>
        <rect x={188} y={66} width={12} height={24} fill="#e8d36a" opacity={0.9} />
        <Tag x={194} y={50} anchor="middle">tape it: high (bass end / treble end)</Tag>
        <Arrow x1={194} y1={30} x2={194} y2={60} color={C.ink} />
        <Tag x={300} y={30} anchor="middle" color={C.dim}>press: does it move?</Tag>
      </At>
      <N n={1} x={110} y={60} />
      <N n={2} x={110} y={60} />
      <N n={3} x={110} y={60} />
      <N n={4} x={120} y={80} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ lifted fret: press and glue */

export function FretLiftGlueDiagram() {
  return (
    <Figure
      title="Glue down a lifted fret"
      how={[
        "Find the lift: a gap you can slide paper into under the fret, usually at one end of the fret.",
        "Protect the board: wax or tape it on both sides of the fret so glue that runs out wipes away.",
        "Press the fret down flat with a radiused caul (a fret press, or a radius block and clamp) and hold it there.",
        "With it held down, run a little thin super glue along the fret — it wicks into the slot. Wipe the excess at once, let it set, then check with a fret rocker.",
      ]}
      note="Thin glue runs into the slot by itself (capillary action). Ventilate — the fumes sting."
    >
      <rect x={20} y={120} width={330} height={44} fill={C.woodFill} stroke={C.woodDark} />
      <T x={185} y={176} anchor="middle" size={8}>end view of one fret across the board</T>
      {/* fret seen end-on across the board: lifted at the treble end */}
      <At n={[1, 2]}>
        <path d="M 40 120 Q 185 112 300 106 L 330 106 L 330 112 L 300 112 Q 185 118 40 126 Z" fill={C.metalFill} stroke={C.line} />
        <path d="M 270 112 L 330 112 L 330 120 L 270 120 Z" fill="var(--color-card)" opacity={0.7} />
        <Gap x={322} y1={112} y2={120} label="gap" side="left" color={C.bad} />
      </At>
      <At n={[3, 4]}>
        <path d="M 40 120 Q 185 113 330 120 L 330 126 Q 185 119 40 126 Z" fill={C.metalFill} stroke={C.line} />
      </At>
      <Tag x={200} y={60} n={1} anchor="middle" color={C.bad}>paper slides under one end = lifted</Tag>
      <At n={2}>
        <rect x={20} y={124} width={330} height={6} fill="#e8d36a" opacity={0.75} />
        <Tag x={185} y={60} anchor="middle">wax or tape the board beside the fret</Tag>
      </At>
      <Hl n={3}>
        <At n={[3, 4]}>
          <path d="M 40 100 Q 185 92 330 100 L 330 90 Q 185 82 40 90 Z" fill="#c6a274" stroke={C.woodDark} />
          <rect x={160} y={56} width={50} height={28} rx={3} fill="#3a3f46" stroke={C.line} />
          <T x={185} y={70} anchor="middle" size={8} color="#fff" halo={false}>press</T>
        </At>
      </Hl>
      <At n={3}>
        <Arrow x1={185} y1={36} x2={185} y2={54} color={C.ink} />
        <Tag x={300} y={60} anchor="middle">radiused caul</Tag>
      </At>
      <At n={4}>
        <path d="M 300 104 L 310 118" stroke="#c9e4f5" strokeWidth={2} />
        <ellipse cx={298} cy={100} rx={4} ry={6} fill="#c9e4f5" />
        <Tag x={300} y={36} anchor="middle">thin glue wicks into the slot</Tag>
        <Tag x={90} y={36} anchor="middle" color={C.good}>wipe excess, let set</Tag>
        <Zoom x={70} y={74} r={26} cx={300} cy={120} scale={3}>
          <rect x={290} y={120} width={20} height={10} fill={C.woodFill} />
          <rect x={298} y={116} width={4} height={10} fill="#8d939b" />
          <path d="M 296 118 L 296 128 M 304 118 L 304 128" stroke="#c9e4f5" strokeWidth={1.2} />
        </Zoom>
      </At>
      <N n={1} x={40} y={60} />
      <N n={2} x={40} y={60} />
      <N n={3} x={120} y={70} />
      <N n={4} x={40} y={110} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ pulling frets */

export function FretPullDiagram() {
  return (
    <Figure
      title="Pull a fret without chipping the board"
      how={[
        "Heat the fret along its length with a soldering iron for a few seconds — it softens old glue and lets the tang slide out more easily.",
        "Slide the flush-ground jaws of a fret puller (end nippers ground flat) under one end of the fret.",
        "Squeeze gently and roll the jaws along the fret, lifting it a little at a time — never yank one end up.",
        "If a chip of wood lifts with the tang, stop and glue it straight back down before going on.",
      ]}
      note="Rosewood and ebony chip easily. On a finished maple board, score the finish along each side of the fret first."
    >
      <rect x={20} y={118} width={330} height={44} fill={C.woodFill} stroke={C.woodDark} />
      <T x={185} y={174} anchor="middle" size={8}>end view of one fret across the board</T>
      <At n={[1, 2]}>
        <path d="M 40 118 Q 185 110 330 118 L 330 124 Q 185 116 40 124 Z" fill={C.metalFill} stroke={C.line} />
      </At>
      <At n={1}>
        <line x1={70} y1={50} x2={176} y2={98} stroke="#3a3f46" strokeWidth={10} strokeLinecap="round" />
        <path d="M 174 92 L 200 110 L 170 102 Z" fill="#9aa1aa" stroke={C.line} strokeWidth={0.6} />
        <path d="M 212 104 q 4 -8 0 -16 M 222 106 q 4 -8 0 -16" stroke={C.bad} strokeWidth={1.4} fill="none" opacity={0.8} />
        <Tag x={200} y={40} anchor="middle" color={C.bad}>soldering iron tip on the fret: heat it</Tag>
      </At>
      <At n={[2, 3]}>
        <path d="M 300 70 L 330 116 L 336 116 L 318 70 Z" fill="#59606a" stroke={C.line} />
        <path d="M 330 70 L 330 116 L 336 116 L 346 70 Z" fill="#6b7280" stroke={C.line} />
        <T x={330} y={60} anchor="middle" size={8}>puller jaws</T>
      </At>
      <At n={2}>
        <Tag x={150} y={40} anchor="middle">jaws flat on the board, under the fret end</Tag>
      </At>
      <At n={3}>
        <path d="M 40 118 Q 185 110 240 116 L 330 96 L 330 102 L 240 122 Q 185 116 40 124 Z" fill={C.metalFill} stroke={C.line} />
        <Arrow x1={320} y1={140} x2={220} y2={140} />
        <Tag x={150} y={40} anchor="middle">roll along the fret, a little at a time</Tag>
      </At>
      <At n={4}>
        <path d="M 40 118 Q 185 110 330 118 L 330 124 Q 185 116 40 124 Z" fill={C.metalFill} stroke={C.line} opacity={0.4} />
        <path d="M 200 118 L 214 112 L 222 118 Z" fill={C.woodDarkFill} stroke={C.bad} strokeWidth={1.2} />
        <Arrow x1={212} y1={86} x2={212} y2={110} color={C.bad} />
        <Tag x={212} y={70} anchor="middle" color={C.bad}>chip? glue it back right away</Tag>
      </At>
      <N n={1} x={40} y={96} />
      <N n={2} x={290} y={100} />
      <N n={3} x={40} y={80} />
      <N n={4} x={40} y={80} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ installing frets */

export function FretInstallDiagram() {
  return (
    <Figure
      title="Install a new fret"
      how={[
        "Bend the fret wire to a slightly tighter curve than the fretboard radius, so the ends want to sit down rather than spring up.",
        "Cut it a little longer than the slot, start the tang at both ends first, then work toward the middle.",
        "Seat it with a fret press and a radiused caul (or a fret hammer, tapping the middle then the ends). Check that no light shows under it.",
        "Nip the ends close to the board, then file them flush and bevel them to match the others.",
      ]}
      note="Hammering frets over an acoustic's top can crack it; press them, supporting the top from inside."
    >
      <rect x={20} y={130} width={330} height={40} fill={C.woodFill} stroke={C.woodDark} />
      <path d="M 20 130 Q 185 118 350 130" fill="none" stroke={C.woodDark} />
      <T x={185} y={180} anchor="middle" size={8}>fretboard end-on (its radius exaggerated)</T>
      <At n={1}>
        <path d="M 60 96 Q 185 70 310 96" fill="none" stroke={C.metal} strokeWidth={6} strokeLinecap="round" />
        <path d="M 40 100 Q 185 84 330 100" fill="none" stroke={C.good} strokeWidth={1.4} strokeDasharray="4 3" />
        <Tag x={185} y={50} anchor="middle">wire bent tighter than the board</Tag>
        <T x={330} y={110} anchor="end" size={8} color={C.good}>board radius</T>
      </At>
      <At n={2}>
        <path d="M 36 128 Q 185 108 334 128" fill="none" stroke={C.metal} strokeWidth={6} strokeLinecap="round" />
        <Arrow x1={40} y1={100} x2={40} y2={122} />
        <Arrow x1={330} y1={100} x2={330} y2={122} />
        <Tag x={185} y={60} anchor="middle">a little long · ends in first</Tag>
      </At>
      <At n={3}>
        <path d="M 36 128 Q 185 116 334 128" fill="none" stroke={C.metal} strokeWidth={6} strokeLinecap="round" />
        <path d="M 60 112 Q 185 98 310 112 L 310 98 Q 185 84 60 98 Z" fill="#c9a26b" stroke={C.woodDark} />
        <rect x={160} y={50} width={50} height={36} rx={3} fill="#3a3f46" stroke={C.line} />
        <T x={185} y={68} anchor="middle" size={8} color="#fff" halo={false}>press</T>
        <Arrow x1={185} y1={28} x2={185} y2={48} color={C.ink} />
        <Tag x={300} y={60} anchor="middle">radiused caul</Tag>
        <Tag x={80} y={60} anchor="middle" color={C.good}>no light under it</Tag>
      </At>
      <At n={4}>
        <path d="M 36 128 Q 185 116 334 128" fill="none" stroke={C.metal} strokeWidth={6} strokeLinecap="round" />
        <rect x={20} y={110} width={14} height={24} fill="#e8d36a" opacity={0.6} />
        <path d="M 330 100 L 352 140" stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
        <Tag x={250} y={60} anchor="middle">nip, file flush, bevel</Tag>
      </At>
      <N n={1} x={40} y={50} />
      <N n={2} x={40} y={60} />
      <N n={3} x={40} y={90} />
      <N n={4} x={40} y={60} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ fret slots */

export function FretSlotDiagram() {
  const slot = (x: number, w: number, depth: number, fretY: number, label: string, color: string, n: number | number[]) => (
    <Hl n={n}>
      <g>
        <rect x={x - 34} y={110} width={68} height={50} fill={C.woodFill} stroke={C.woodDark} />
        <rect x={x - w / 2} y={110} width={w} height={depth} fill="var(--color-card)" />
        {/* tang with barbs */}
        <path d={`M ${x - 2} ${fretY} L ${x - 2} ${fretY + 26} L ${x + 2} ${fretY + 26} L ${x + 2} ${fretY} Z`} fill="#9aa1aa" />
        {[6, 12, 18].map((k) => (
          <path key={k} d={`M ${x - 2} ${fretY + k} L ${x - 4.5} ${fretY + k + 3} L ${x - 2} ${fretY + k + 3} M ${x + 2} ${fretY + k} L ${x + 4.5} ${fretY + k + 3} L ${x + 2} ${fretY + k + 3}`} fill="#9aa1aa" stroke="#9aa1aa" strokeWidth={0.6} />
        ))}
        <path d={`M ${x - 14} ${fretY} C ${x - 14} ${fretY - 16}, ${x + 14} ${fretY - 16}, ${x + 14} ${fretY} Z`} fill={C.metalFill} stroke={C.line} />
        <T x={x} y={174} anchor="middle" size={8.5} color={color} weight={700}>
          {label}
        </T>
      </g>
    </Hl>
  );
  return (
    <Figure
      title="Fret slots: good, too shallow, too wide"
      how={[
        "A good slot: the tang's little barbs bite into the slot walls and the fret's crown sits flat on the board.",
        "Too shallow: the tang bottoms out before the crown touches the board, so the fret stands high. Deepen the slot with a fret-slot saw to the right depth.",
        "Too wide: the barbs can't grip and the fret lifts again. Glue it in, or use wire with a bigger tang, or fill and re-cut the slot.",
        "Chipped slot edges: glue the chips back; fill gaps with wood dust and glue before fretting.",
      ]}
      note="Match slot width to the wire's tang: check the wire maker's tang size before you buy."
    >
      {slot(70, 4.4, 30, 110, "good fit", C.good, 1)}
      {slot(180, 4.4, 18, 102, "too shallow", C.bad, 2)}
      {slot(290, 9, 30, 110, "too wide", C.bad, 3)}
      <At n={2}>
        <Gap x={204} y1={95} y2={110} label="sits high" side="right" color={C.bad} />
        <Tag x={180} y={40} anchor="middle">deepen with a slot saw</Tag>
        <path d="M 150 60 L 210 60 L 210 70 L 150 70 Z" fill="#c9cdd3" stroke={C.line} />
        <path d="M 150 70 l 4 5 l 4 -5 l 4 5 l 4 -5 l 4 5 l 4 -5 l 4 5 l 4 -5 l 4 5 l 4 -5 l 4 5 l 4 -5 l 4 5 l 4 -5" fill="none" stroke={C.line} />
      </At>
      <At n={3}>
        <Tag x={290} y={40} anchor="middle">barbs can't grip</Tag>
        <Tag x={290} y={64} anchor="middle" color={C.good}>glue / bigger tang / fill</Tag>
      </At>
      <At n={1}>
        <Zoom x={170} y={50} r={34} cx={70} cy={125} scale={2.4} label="barbs bite the walls" labelAt="above">
          <rect x={50} y={110} width={40} height={40} fill={C.woodFill} />
          <rect x={67.8} y={110} width={4.4} height={30} fill="var(--color-card)" />
          <path d="M 68 110 L 68 136 L 72 136 L 72 110 Z" fill="#9aa1aa" />
          {[6, 12, 18].map((k) => (
            <path key={k} d={`M 68 ${110 + k} L 65.5 ${113 + k} L 68 ${113 + k} M 72 ${110 + k} L 74.5 ${113 + k} L 72 ${113 + k}`} fill="#9aa1aa" />
          ))}
        </Zoom>
      </At>
      <At n={4}>
        <Tag x={180} y={40} anchor="middle">glue chips back · fill gaps with dust + glue</Tag>
        <path d="M 72.2 110 L 80 110 L 76 117 Z" fill={C.woodDarkFill} stroke={C.bad} strokeWidth={1.2} />
        <Arrow x1={92} y1={86} x2={80} y2={106} color={C.bad} />
        <T x={96} y={82} size={8} color={C.bad}>chip</T>
      </At>
      <N n={1} x={70} y={80} />
      <N n={2} x={130} y={80} />
      <N n={3} x={290} y={84} />
      <N n={4} x={30} y={40} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ fret wear */

export function FretWearDiagram() {
  const profile = (x: number, kind: "new" | "worn" | "flat" | "low") => {
    const h = kind === "low" ? 18 : 30;
    const d =
      kind === "worn"
        ? `M ${x - 24} 130 C ${x - 24} ${130 - h * 1.25}, ${x - 6} ${130 - h * 1.32}, ${x - 4} ${130 - h * 1.05} Q ${x} ${130 - h * 0.9} ${x + 4} ${130 - h * 1.05} C ${x + 6} ${130 - h * 1.32}, ${x + 24} ${130 - h * 1.25}, ${x + 24} 130 Z`
        : kind === "flat"
          ? `M ${x - 24} 130 C ${x - 24} 108, ${x - 18} 102, ${x - 12} 100 L ${x + 12} 100 C ${x + 18} 102, ${x + 24} 108, ${x + 24} 130 Z`
          : `M ${x - 24} 130 C ${x - 24} ${130 - h * 1.32}, ${x + 24} ${130 - h * 1.32}, ${x + 24} 130 Z`;
    return <path d={d} fill={C.metalFill} stroke={C.line} />;
  };
  return (
    <Figure
      title="Worn frets: dress them or replace them?"
      how={[
        "Look along the frets under the strings for dents (divots), and for frets whose round tops have gone flat — usually frets 1–7 under the G, B and E strings.",
        "Measure fret height with calipers or a fret height gauge where it's worn, and compare with an unworn spot (the high frets or the fret ends).",
        "If the dents are shallow and there's height to spare, a level, crown and polish takes everything down to the bottom of the deepest dent.",
        "If levelling would leave the frets too low to bend and grip strings comfortably, replace them — the worn ones only, or all of them.",
      ]}
    >
      <rect x={20} y={130} width={330} height={34} fill={C.woodFill} stroke={C.woodDark} />
      <Hl n={[1, 2]}>{profile(70, "new")}</Hl>
      <Hl n={[1, 2, 3]}>{profile(150, "worn")}</Hl>
      <Hl n={[3]}>{profile(230, "flat")}</Hl>
      <Hl n={[4]}>{profile(310, "low")}</Hl>
      <T x={70} y={174} anchor="middle" size={8.5} color={C.ink}>new</T>
      <T x={150} y={174} anchor="middle" size={8.5} color={C.bad} weight={700}>dented</T>
      <T x={230} y={174} anchor="middle" size={8.5} color={C.dim}>levelled flat</T>
      <T x={310} y={174} anchor="middle" size={8.5} color={C.bad} weight={700}>too low</T>
      <At n={1}>
        <Tag x={150} y={50} anchor="middle" color={C.bad}>dents under the strings</Tag>
        <Arrow x1={150} y1={60} x2={150} y2={86} color={C.bad} />
      </At>
      <At n={2}>
        <Gap x={104} y1={90} y2={130} label="height" side="left" />
        <Gap x={182} y1={96} y2={130} label="worn" side="right" color={C.bad} />
        <path d="M 196 60 L 196 130 M 226 60 L 226 130" stroke="#9aa1aa" strokeWidth={3} />
        <rect x={190} y={52} width={42} height={10} fill="#c9cdd3" stroke={C.line} />
        <Tag x={211} y={36} anchor="middle">calipers</Tag>
      </At>
      <At n={3}>
        <line x1={120} y1={96} x2={260} y2={96} stroke={C.good} strokeDasharray="4 3" />
        <Tag x={190} y={50} anchor="middle" color={C.good}>level to the deepest dent, then crown</Tag>
      </At>
      <At n={4}>
        <Tag x={300} y={50} anchor="middle" color={C.bad}>too low left → refret</Tag>
        <Tag x={300} y={74} anchor="middle" color={C.dim}>worn ones only, or all</Tag>
      </At>
      <N n={1} x={30} y={60} />
      <N n={2} x={30} y={60} />
      <N n={3} x={30} y={60} />
      <N n={4} x={30} y={60} />
    </Figure>
  );
}
