/** Fret, nut and stringing diagrams. */
import { Arrow, C, Figure, Gap, N, T } from "./kit";

export function FretLevelDiagram() {
  const frets = [40, 80, 118, 154, 188, 220, 250, 278, 304, 328];
  const high = 4;
  return (
    <Figure
      title="Level the frets: find and file the high ones"
      how={[
        "Set the neck dead straight with the truss rod (check with a notched straightedge) and mask the fretboard.",
        "Colour the top of every fret with a permanent marker.",
        "Rub a leveling beam with fine abrasive along the neck in long, light strokes, following the strings' paths. The beam touches the high frets first: their ink disappears first.",
        "Stop as soon as every fret shows a little sanded line. Frets that still have ink in the middle are low — stop before you take more than you need.",
      ]}
      note="StewMac: aim to remove under about 0.008–0.010 in in total, and under roughly 20% of the fret's height. Frets under about 0.038 in tall are too low to level — refret instead."
    >
      <rect x={20} y={120} width={330} height={30} fill={C.wood} stroke={C.woodDark} />
      {frets.map((x, i) => (
        <g key={x}>
          <path d={`M ${x - 5} 120 Q ${x} ${i === high ? 104 : 109} ${x + 5} 120 Z`} fill={i === high ? C.accent : C.metal} stroke={C.line} />
          <rect x={x - 2.5} y={i === high ? 104 : 109} width={5} height={2.5} fill={i === high ? C.metal : "#2244aa"} />
        </g>
      ))}
      <rect x={25} y={84} width={320} height={20} rx={2} fill="#c5cbd2" stroke={C.line} transform="rotate(0)" />
      <T x={185} y={94} anchor="middle" color="#222" weight={700}>leveling beam + abrasive</T>
      <Arrow x1={110} y1={70} x2={260} y2={70} both />
      <T x={185} y={60} anchor="middle" color={C.accent} weight={700}>long, light strokes</T>
      <T x={frets[high]!} y={165} anchor="middle" color={C.accent} weight={700}>high fret: ink gone first</T>
      <T x={350} y={185} anchor="end" size={9}>blue = marker ink still on</T>
      <N n={1} x={30} y={168} />
      <N n={2} x={60} y={100} />
      <N n={3} x={300} y={60} />
      <N n={4} x={frets[high]! + 30} y={130} />
    </Figure>
  );
}

export function FretCrownDiagram() {
  const fret = (x: number, kind: "round" | "flat" | "crowned") => {
    const top = kind === "flat" ? `M ${x - 22} 130 L ${x - 18} 100 L ${x + 18} 100 L ${x + 22} 130 Z` : `M ${x - 22} 130 C ${x - 20} 95 ${x + 20} 95 ${x + 22} 130 Z`;
    return (
      <g>
        <rect x={x - 32} y={130} width={64} height={22} fill={C.wood} stroke={C.woodDark} />
        <path d={top} fill={C.metal} stroke={C.line} />
        {kind === "flat" ? <rect x={x - 18} y={99} width={36} height={3} fill={C.accent} /> : null}
        {kind === "crowned" ? <rect x={x - 3} y={102} width={6} height={3} fill={C.accent} /> : null}
      </g>
    );
  };
  return (
    <Figure
      title="Crown the frets after leveling"
      how={[
        "A new fret is round on top: the string touches one point.",
        "Leveling leaves a flat, wide top (orange). A flat top makes notes sound sharp and dull.",
        "Mark the flat top with a marker, then use a crowning file to round both sides down until only a thin line of ink is left along the very top — about the width of a high E string.",
        "Polish with fine grits (StewMac's Micro-Mesh sequence: 1500, 3600, 8000, 12000) to remove the file marks.",
      ]}
    >
      {fret(60, "round")}
      {fret(180, "flat")}
      {fret(300, "crowned")}
      <T x={60} y={170} anchor="middle" color={C.ink}>new</T>
      <T x={180} y={170} anchor="middle" color={C.bad} weight={700}>after leveling: flat</T>
      <T x={300} y={170} anchor="middle" color={C.good} weight={700}>crowned: thin line on top</T>
      <N n={1} x={60} y={70} />
      <N n={2} x={180} y={70} />
      <N n={3} x={300} y={70} />
      <N n={4} x={340} y={120} />
    </Figure>
  );
}

export function FretEndDiagram() {
  return (
    <Figure
      title="Fret ends: the bevel angle"
      how={[
        "Sharp ends usually appear in dry weather when the fretboard shrinks and the frets stick out ('sprouting'). Humidify first (45–55% RH) — sometimes that's all it needs.",
        "Mask the fretboard edge. File the overhang flush with the board, then bevel the ends with a file held at the angle shown.",
        "Round the corners of each fret end with a fret-end dressing file so the hand slides past smoothly.",
        "Polish the ends. Don't go shallower than about 30°, or the outer strings slip off the edge of the frets.",
      ]}
      note="StewMac's written guide: 30–35°; their video: 35–45°."
    >
      <rect x={60} y={90} width={240} height={60} fill={C.wood} stroke={C.woodDark} />
      <T x={180} y={165} anchor="middle">fretboard (looking along the neck)</T>
      <path d="M 70 90 L 270 90 L 300 70 L 70 70 Z" fill={C.metal} stroke={C.line} />
      <line x1={300} y1={70} x2={300} y2={150} stroke={C.line} strokeDasharray="3 3" />
      <path d="M 270 90 L 300 70" stroke={C.accent} strokeWidth={3} />
      <path d="M 300 110 A 40 40 0 0 0 278 82" fill="none" stroke={C.accent} />
      <T x={312} y={100} color={C.accent} weight={700}>30–35°</T>
      <circle cx={276} cy={78} r={6} fill="none" stroke={C.good} strokeWidth={1.5} />
      <T x={248} y={56} anchor="end" color={C.good} weight={700}>rounded corner</T>
      <N n={1} x={40} y={120} />
      <N n={2} x={320} y={60} />
      <N n={3} x={230} y={40} />
      <N n={4} x={120} y={50} />
    </Figure>
  );
}

export function NutSlotDiagram() {
  return (
    <Figure
      title="A good nut slot (side view)"
      how={[
        "The string must touch the nut only at its FRONT edge (the fretboard side) — that edge sets the speaking length.",
        "The slot slopes down toward the headstock: StewMac says as shallow as 6°, no steeper than about 12–15° (or match the headstock angle).",
        "Slot depth: about half the thickest string's diameter sits in the slot; the top of the nut is filed down so slots aren't deep trenches that pinch the string.",
        "Slot height over the 1st fret is set with the 3rd-fret test. Cut a little at a time — a slot cut too low means filling or a new nut.",
      ]}
      note="A slot that pinches or is too narrow makes strings ping and stick when you tune. A pencil-lead (graphite) rub in the slot helps strings slide."
    >
      <rect x={160} y={110} width={190} height={30} fill={C.wood} stroke={C.woodDark} />
      <T x={260} y={155} anchor="middle">fretboard →</T>
      <path d="M 10 100 L 140 122 L 140 152 L 10 130 Z" fill={C.woodDark} />
      <T x={60} y={150}>← headstock</T>
      <path d="M 140 85 L 162 85 L 162 140 L 140 140 Z" fill="#f1ead8" stroke={C.line} />
      <path d="M 140 104 L 162 96" stroke={C.accent} strokeWidth={3} />
      <T x={150} y={72} anchor="middle" color={C.ink}>nut</T>
      <line x1={20} y1={125} x2={162} y2={95} stroke={C.string} strokeWidth={2.5} />
      <line x1={162} y1={95} x2={350} y2={92} stroke={C.string} strokeWidth={2.5} />
      <circle cx={162} cy={95} r={5} fill="none" stroke={C.good} strokeWidth={2} />
      <T x={200} y={78} color={C.good} weight={700}>contact at front edge only</T>
      <path d="M 120 120 A 30 30 0 0 1 128 108" fill="none" stroke={C.accent} />
      <T x={95} y={100} color={C.accent} weight={700}>6–15°</T>
      <N n={1} x={180} y={60} />
      <N n={2} x={95} y={80} />
      <N n={3} x={130} y={60} />
      <N n={4} x={250} y={125} />
    </Figure>
  );
}

export function StringWrapDiagram() {
  return (
    <Figure
      title="Wind strings on the tuner post"
      how={[
        "Pull the string tight past its post, then pull it back about 2–3 in (to the next post along) for slack. Vintage slotted posts: cut it two posts past its own post and push the end down the hole.",
        "Bend the string toward the inside of the headstock, hold it taut and wind so the wraps go DOWN the post, each one below the last.",
        "Aim for 2–3 wraps on wound strings and 3–5 on plain strings (StewMac). Locking tuners need only ½–1 wrap.",
        "Downward wraps increase the break angle over the nut. Stretch the new string gently along its length and retune a few times.",
      ]}
    >
      <rect x={30} y={40} width={140} height={140} rx={14} fill={C.woodDark} />
      <T x={100} y={30} anchor="middle">headstock</T>
      <rect x={90} y={70} width={24} height={80} rx={4} fill={C.metal} stroke={C.line} />
      <T x={102} y={162} anchor="middle" color={C.ink}>post (side view)</T>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={102} cy={92 + i * 12} rx={16} ry={4} fill="none" stroke={C.string} strokeWidth={2.2} />
      ))}
      <line x1={118} y1={132} x2={340} y2={110} stroke={C.string} strokeWidth={2.2} />
      <T x={250} y={102} anchor="middle">to the nut</T>
      <Arrow x1={135} y1={84} x2={135} y2={134} />
      <T x={142} y={80} color={C.accent} weight={700}>wraps go down</T>
      <T x={200} y={150} color={C.accent} weight={700}>leave 2–3 in slack</T>
      <N n={1} x={186} y={150} />
      <N n={2} x={60} y={110} />
      <N n={3} x={60} y={140} />
      <N n={4} x={300} y={80} />
    </Figure>
  );
}
