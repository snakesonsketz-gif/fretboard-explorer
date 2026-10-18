/** Fret, nut and stringing diagrams, one picture per step. */
import { Arrow, At, C, Figure, Gap, Hl, N, T, Tag, Zoom } from "./kit";

export function FretLevelDiagram() {
  const frets = [40, 80, 118, 154, 188, 220, 250, 278, 304, 328];
  const high = 4;
  const low = 7;
  const fretTop = (i: number) => (i === high ? 106 : i === low ? 113 : 110);
  /** Where a point 3 units either side of centre sits on the fret's curve (a quadratic peaking at y). */
  const inkY = (y: number) => 43.2 + 0.64 * y + 0.8;
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
      <rect x={20} y={120} width={330} height={30} fill={C.woodFill} stroke={C.woodDark} />
      <T x={185} y={160} anchor="middle" size={8}>fretboard, side view (heights exaggerated)</T>
      {frets.map((x, i) => {
        const y = fretTop(i);
        const inked = i !== high;
        return (
          <g key={x}>
            <path d={`M ${x - 5} 120 Q ${x} ${2 * y - 120} ${x + 5} 120 Z`} fill={C.metalFill} stroke={C.line} />
            {inked ? (
              <At n={[2, 3, 4]}>
                <path d={`M ${x - 3} ${inkY(y)} Q ${x} ${2 * (y + 1) - inkY(y)} ${x + 3} ${inkY(y)}`} fill="none" stroke="#3b6cff" strokeWidth={2.2} />
              </At>
            ) : null}
            <At n={4}>{i !== low ? <rect x={x - 1.4} y={y - 0.2} width={2.8} height={2.2} fill="#f4f6f8" /> : null}</At>
          </g>
        );
      })}
      <At n={1}>
        <line x1={20} y1={98} x2={350} y2={98} stroke={C.good} strokeWidth={3} />
        <rect x={20} y={92} width={330} height={6} fill={C.good} opacity={0.25} />
        <T x={185} y={84} anchor="middle" color={C.good} weight={700}>notched straightedge: neck dead straight</T>
        <rect x={20} y={150} width={330} height={6} fill="#e8d36a" opacity={0.7} />
        <Tag x={185} y={180} anchor="middle">mask the fretboard (tape between the frets)</Tag>
      </At>
      <At n={2}>
        <g transform="rotate(-25 150 70)">
          <rect x={110} y={62} width={80} height={14} rx={6} fill="#2f3237" stroke={C.line} />
          <rect x={190} y={65} width={14} height={8} rx={2} fill="#3b6cff" />
        </g>
        <Tag x={185} y={30} anchor="middle">marker over the top of every fret</Tag>
      </At>
      <At n={3}>
        <rect x={25} y={88} width={320} height={16} rx={2} fill="#c5cbd2" stroke={C.line} />
        <rect x={25} y={103.5} width={320} height={2.5} fill="#8a7e6a" />
        <T x={185} y={96} anchor="middle" color="#222" weight={700} size={9} halo={false}>leveling beam + abrasive</T>
        <Arrow x1={110} y1={74} x2={260} y2={74} both />
        <Tag x={185} y={58} anchor="middle">long, light strokes along the strings</Tag>
        <Zoom x={318} y={44} r={28} cx={frets[high]!} cy={108} scale={2.6} label="high fret: ink gone first" labelAt="above">
          <rect x={frets[high]! - 14} y={120} width={28} height={10} fill={C.woodFill} />
          <path d={`M ${frets[high]! - 5} 120 Q ${frets[high]!} 92 ${frets[high]! + 5} 120 Z`} fill={C.metalFill} stroke={C.line} />
          <rect x={frets[high]! - 14} y={103.5} width={28} height={2.5} fill="#8a7e6a" />
          <rect x={frets[high]! - 14} y={96} width={28} height={7.5} fill="#c5cbd2" />
        </Zoom>
      </At>
      <At n={4}>
        <Tag x={frets[low]!} y={80} anchor="middle" color={C.bad}>ink still on = low fret</Tag>
        <Arrow x1={frets[low]!} y1={89} x2={frets[low]!} y2={104} color={C.bad} />
        <Tag x={110} y={60} anchor="middle" color={C.good}>sanded line on top = level</Tag>
        <Arrow x1={110} y1={69} x2={frets[2]!} y2={102} color={C.good} />
        <Tag x={185} y={30} anchor="middle">stop — take only what you need</Tag>
      </At>
      <N n={1} x={30} y={60} />
      <N n={2} x={60} y={95} />
      <N n={3} x={30} y={60} />
      <N n={4} x={30} y={60} />
    </Figure>
  );
}

export function FretCrownDiagram() {
  const fret = (x: number, kind: "round" | "flat" | "crowned") => {
    const top = kind === "flat" ? `M ${x - 22} 130 L ${x - 18} 100 L ${x + 18} 100 L ${x + 22} 130 Z` : `M ${x - 22} 130 C ${x - 20} 95 ${x + 20} 95 ${x + 22} 130 Z`;
    return (
      <g>
        <rect x={x - 32} y={130} width={64} height={22} fill={C.woodFill} stroke={C.woodDark} />
        <path d={top} fill={C.metalFill} stroke={C.line} />
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
      <Hl n={1}>{fret(60, "round")}</Hl>
      <Hl n={2}>
        {fret(180, "flat")}
        <rect x={162} y={99} width={36} height={3} fill={C.accent} />
      </Hl>
      <Hl n={[3, 4]}>
        {fret(300, "crowned")}
        <At n={[3, 4]}>
          <rect x={297} y={100} width={6} height={3} fill={C.accent} />
        </At>
      </Hl>
      <T x={60} y={168} anchor="middle" color={C.ink}>new</T>
      <T x={180} y={168} anchor="middle" color={C.bad} weight={700}>after leveling</T>
      <T x={300} y={168} anchor="middle" color={C.good} weight={700}>crowned</T>
      <At n={1}>
        <line x1={20} y1={96} x2={100} y2={96} stroke={C.string} strokeWidth={2} />
        <circle cx={60} cy={97} r={4} fill="none" stroke={C.good} strokeWidth={1.5} />
        <Tag x={60} y={60} anchor="middle" color={C.good}>string touches one point</Tag>
      </At>
      <At n={2}>
        <line x1={140} y1={98} x2={220} y2={98} stroke={C.string} strokeWidth={2} />
        <Arrow x1={162} y1={88} x2={198} y2={88} both color={C.bad} />
        <Tag x={180} y={60} anchor="middle" color={C.bad}>wide flat top: sharp, dull notes</Tag>
      </At>
      <At n={3}>
        <path d="M 252 84 L 282 112" stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
        <path d="M 348 84 L 318 112" stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
        <Tag x={300} y={60} anchor="middle">crowning file: round both sides</Tag>
        <Tag x={300} y={190} anchor="middle" color={C.good}>leave a thin ink line on top</Tag>
      </At>
      <At n={4}>
        <Tag x={300} y={60} anchor="middle">polish: 1500 → 3600 → 8000 → 12000</Tag>
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={258 + k * 22} y={74} width={18} height={10} rx={2} fill={["#8c8c8c", "#a7a7a7", "#c9c9c9", "#ececec"][k]} />
        ))}
      </At>
      <N n={1} x={110} y={128} />
      <N n={2} x={130} y={128} />
      <N n={3} x={240} y={128} />
      <N n={4} x={240} y={128} />
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
      <rect x={60} y={90} width={240} height={60} fill={C.woodFill} stroke={C.woodDark} />
      <T x={180} y={164} anchor="middle" size={9}>fretboard and fret, looking along the neck</T>
      <At n={1}>
        <path d="M 70 90 L 312 90 L 312 70 L 70 70 Z" fill={C.metalFill} stroke={C.line} />
        <rect x={300} y={70} width={12} height={20} fill={C.bad} opacity={0.6} />
        <Tag x={312} y={52} anchor="end" color={C.bad}>fret sticks out past the board</Tag>
        <Tag x={120} y={30} anchor="middle">humidify to 45–55% RH first</Tag>
      </At>
      <At n={[2, 3, 4]}>
        <path d="M 70 90 L 270 90 L 300 70 L 70 70 Z" fill={C.metalFill} stroke={C.line} />
      </At>
      <At n={2}>
        <rect x={290} y={90} width={14} height={60} fill="#e8d36a" opacity={0.7} />
        <line x1={300} y1={70} x2={300} y2={150} stroke={C.line} strokeDasharray="3 3" />
        <line x1={250} y1={104} x2={330} y2={50} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
        <path d="M 300 110 A 40 40 0 0 0 278 82" fill="none" stroke={C.accent} strokeWidth={1.5} />
        <T x={312} y={104} color={C.accent} weight={700}>30–35°</T>
        <Tag x={150} y={30} anchor="middle">file held at the bevel angle</Tag>
      </At>
      <Hl n={2}>
        <path d="M 270 90 L 300 70" stroke={C.accent} strokeWidth={3} />
      </Hl>
      <At n={3}>
        <Zoom x={110} y={50} r={30} cx={278} cy={76} scale={3} label="corner rounded off" labelAt="above">
          <path d="M 260 90 L 270 90 L 284 80 Q 288 76 284 72 L 260 70 Z" fill={C.metalFill} stroke={C.line} />
        </Zoom>
        <circle cx={276} cy={78} r={6} fill="none" stroke={C.good} strokeWidth={1.5} />
      </At>
      <At n={4}>
        <Tag x={150} y={30} anchor="middle" color={C.good}>polish the ends smooth</Tag>
        <Tag x={150} y={52} anchor="middle" color={C.bad}>shallower than 30° → strings slip off</Tag>
      </At>
      <N n={1} x={40} y={120} />
      <N n={2} x={320} y={136} />
      <N n={3} x={250} y={56} />
      <N n={4} x={40} y={120} />
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
      <rect x={160} y={110} width={190} height={30} fill={C.woodFill} stroke={C.woodDark} />
      <T x={260} y={152} anchor="middle" size={9}>fretboard →</T>
      <path d="M 10 100 L 140 122 L 140 152 L 10 130 Z" fill={C.woodDarkFill} />
      <T x={60} y={150} size={9}>← headstock</T>
      <Hl n={[1, 3]}>
        <path d="M 140 85 L 162 85 L 162 140 L 140 140 Z" fill="#f1ead8" stroke={C.line} />
      </Hl>
      <Hl n={2}>
        <path d="M 140 104 L 162 96" stroke={C.accent} strokeWidth={3} />
      </Hl>
      <T x={150} y={76} anchor="middle" color={C.ink}>nut</T>
      <path d="M 210 110 Q 216 102 222 110 Z" fill={C.metalFill} />
      <line x1={20} y1={125} x2={162} y2={95} stroke={C.string} strokeWidth={2.5} />
      <line x1={162} y1={95} x2={350} y2={92} stroke={C.string} strokeWidth={2.5} />
      <At n={1}>
        <circle cx={162} cy={95} r={5} fill="none" stroke={C.good} strokeWidth={2} />
        <Tag x={200} y={60} color={C.good}>contact at the front edge only</Tag>
        <Arrow x1={210} y1={69} x2={166} y2={92} color={C.good} />
        <Zoom x={70} y={50} r={30} cx={155} cy={98} scale={3.5} label="no contact behind it" labelAt="above">
          <path d="M 140 85 L 162 85 L 162 140 L 140 140 Z" fill="#f1ead8" />
          <path d="M 140 104 L 162 96 L 162 100 L 140 108 Z" fill={C.woodDarkFill} opacity={0.5} />
          <line x1={130} y1={103} x2={162} y2={95} stroke={C.string} strokeWidth={2.5} />
        </Zoom>
      </At>
      <At n={2}>
        <path d="M 120 120 A 30 30 0 0 1 128 108" fill="none" stroke={C.accent} strokeWidth={1.5} />
        <Tag x={90} y={40} anchor="middle">slot floor slopes back 6–15°</Tag>
      </At>
      <At n={3}>
        <Zoom x={270} y={50} r={32} cx={151} cy={88} scale={3} label="end view of the slot" labelAt="above">
          <rect x={136} y={82} width={30} height={14} fill="#f1ead8" />
          <path d="M 146 82 L 147 88 Q 151 92 155 88 L 156 82 Z" fill="var(--color-card)" />
          <circle cx={151} cy={86} r={4} fill={C.string} stroke="#999" strokeWidth={0.4} />
        </Zoom>
        <Tag x={90} y={60} anchor="middle">about half the string in the slot</Tag>
      </At>
      <At n={4}>
        <Gap x={216} y1={93} y2={102} label="gap over fret 1: 3rd-fret test" side="right" />
        <Tag x={150} y={40} anchor="middle" color={C.bad}>cut a little at a time — too low can't be undone</Tag>
      </At>
      <N n={1} x={186} y={124} />
      <N n={2} x={186} y={124} />
      <N n={3} x={186} y={124} />
      <N n={4} x={300} y={124} />
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
      <rect x={30} y={40} width={140} height={140} rx={14} fill={C.woodDarkFill} />
      <T x={100} y={30} anchor="middle">headstock</T>
      <rect x={90} y={70} width={24} height={80} rx={4} fill={C.metalFill} stroke={C.line} />
      <T x={102} y={166} anchor="middle" color={C.ink} size={9}>post (side view)</T>
      <At n={1}>
        <line x1={102} y1={80} x2={340} y2={100} stroke={C.string} strokeWidth={2.2} />
        <line x1={102} y1={80} x2={60} y2={77} stroke={C.string} strokeWidth={2.2} strokeDasharray="3 2" />
        <Arrow x1={260} y1={80} x2={200} y2={80} />
        <Tag x={250} y={56} anchor="middle">pull back 2–3 in for slack</Tag>
        <Tag x={250} y={130} anchor="middle" color={C.dim}>≈ to the next post along</Tag>
      </At>
      <At n={[2, 3, 4]}>
        <Hl n={[2, 3]}>
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={102} cy={92 + i * 12} rx={16} ry={4} fill="none" stroke={C.string} strokeWidth={2.2} />
          ))}
        </Hl>
        <line x1={118} y1={132} x2={340} y2={110} stroke={C.string} strokeWidth={2.2} />
        <T x={250} y={130} anchor="middle" size={9}>to the nut</T>
      </At>
      <At n={2}>
        <Arrow x1={135} y1={84} x2={135} y2={134} />
        <Tag x={142} y={70}>each wrap below the last</Tag>
      </At>
      <At n={3}>
        <Tag x={250} y={46} anchor="middle">wound: 2–3 wraps</Tag>
        <Tag x={250} y={68} anchor="middle">plain: 3–5 wraps</Tag>
        <Tag x={250} y={90} anchor="middle" color={C.dim}>locking: ½–1 wrap</Tag>
      </At>
      <At n={4}>
        <path d="M 300 113 A 40 40 0 0 0 296 100" fill="none" stroke={C.accent} strokeWidth={1.5} />
        <Tag x={250} y={60} anchor="middle" color={C.good}>steeper break angle over the nut</Tag>
        <Arrow x1={210} y1={150} x2={300} y2={140} both color={C.ink} />
        <Tag x={255} y={170} anchor="middle">stretch gently, retune a few times</Tag>
      </At>
      <N n={1} x={186} y={100} />
      <N n={2} x={60} y={110} />
      <N n={3} x={60} y={110} />
      <N n={4} x={320} y={86} />
    </Figure>
  );
}
