/** Electronics and acoustic-care diagrams (pots, soldering, coils, switching, grounding, humidity, cracks, screw holes). */
import { Arrow, At, C, Figure, Hl, N, T, Tag, Turn, Zoom } from "./kit";
import { outlineFor, pot, type Schemes } from "./wiring";
import { swatch } from "@/lib/luthier/types";

export function PotLugsDiagram() {
  const v = pot(100, 120);
  const t = pot(260, 120);
  const body = (p: ReturnType<typeof pot>) => (
    <g>
      <circle cx={p.x} cy={p.y} r={30} fill={C.potFill} stroke={C.line} />
      {[p.l1, p.l2, p.l3].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3.5} y={y - 6} width={7} height={13} fill={C.metalFill} stroke={C.line} />
          <T x={x} y={y - 14} anchor="middle" color={C.ink} weight={700}>
            {i + 1}
          </T>
        </g>
      ))}
    </g>
  );
  return (
    <Figure
      viewBox="0 0 360 210"
      title="Pot lugs: which is which"
      how={[
        "Hold the pot from the BACK (shaft pointing away from you) with the lugs facing up: lug 1 left, lug 2 middle (the wiper), lug 3 right. Turning the knob clockwise moves the wiper toward lug 3.",
        "Volume: signal IN on lug 3 (from the pickup or switch), OUT on lug 2 (to the jack or switch), lug 1 to ground (bend it onto the pot back).",
        "Tone: signal into lug 2; lug 1 goes to the capacitor, and the cap's other leg goes to ground. Lug 3 stays empty.",
        "The metal back (casing) is the ground point: scuff it lightly and solder ground wires there.",
      ]}
      note="Volume pots are usually audio (log) taper; 250k for single coils, 500k for humbuckers, 25k for EMG actives."
    >
      <Hl n={[1, 2, 4]}>{body(v)}</Hl>
      <Hl n={[1, 3, 4]}>{body(t)}</Hl>
      <T x={v.x} y={182} anchor="middle" color={C.ink} weight={700}>VOLUME</T>
      <T x={t.x} y={182} anchor="middle" color={C.ink} weight={700}>TONE</T>
      <At n={1}>
        <Tag x={180} y={22} anchor="middle">seen from the BACK, lugs up</Tag>
        <Turn cx={v.x} cy={v.y + 4} r={14} cw />
        <T x={v.x} y={v.y + 44} anchor="middle" size={8} color={C.ink}>knob clockwise: wiper → lug 3</T>
        <Arrow x1={v.l1[0] - 30} y1={v.l1[1] - 30} x2={v.l3[0] + 30} y2={v.l3[1] - 30} color={C.dim} w={1} />
        <T x={v.x} y={v.l2[1] - 38} anchor="middle" size={8}>1 · 2 · 3, left to right</T>
      </At>
      <At n={2}>
        <path d={`M ${v.l3[0]} ${v.l3[1] - 6} L ${v.l3[0] + 40} ${v.l3[1] - 40}`} stroke="#f0b429" strokeWidth={2.4} />
        <Tag x={v.l3[0] + 40} y={v.l3[1] - 46} color={C.good}>3: IN</Tag>
        <path d={`M ${v.l2[0]} ${v.l2[1] - 6} L ${v.l2[0]} ${v.l2[1] - 40}`} stroke="#3b82f6" strokeWidth={2.4} />
        <Tag x={v.l2[0]} y={v.l2[1] - 50} anchor="middle">2: OUT</Tag>
        <path d={`M ${v.l1[0]} ${v.l1[1] + 6} Q ${v.l1[0] - 4} ${v.y - 6} ${v.x - 12} ${v.y - 6}`} fill="none" stroke={C.metal} strokeWidth={2.4} />
        <Tag x={v.l1[0] - 20} y={v.y + 20} anchor="end" color={C.dim}>1: bent to the back</Tag>
      </At>
      <At n={3}>
        <path d={`M ${t.l2[0]} ${t.l2[1] - 6} L ${t.l2[0]} ${t.l2[1] - 40}`} stroke="#3b82f6" strokeWidth={2.4} />
        <Tag x={t.l2[0]} y={t.l2[1] - 50} anchor="middle" color={C.good}>2: IN</Tag>
        <path d={`M ${t.l1[0]} ${t.l1[1] - 6} L ${t.l1[0] - 18} ${t.l1[1] - 22}`} stroke="#c9cdd3" strokeWidth={1.4} />
        <ellipse cx={t.l1[0] - 26} cy={t.l1[1] - 28} rx={9} ry={6} fill="#e0a23a" stroke="#8a5a14" />
        <path d={`M ${t.l1[0] - 34} ${t.l1[1] - 32} Q ${t.x - 60} ${t.y} ${t.x - 22} ${t.y + 8}`} fill="none" stroke="#c9cdd3" strokeWidth={1.4} />
        <Tag x={t.l1[0] - 40} y={t.l1[1] - 44} anchor="end">1: cap → pot back</Tag>
        <Tag x={t.l3[0] + 10} y={t.l3[1] - 20} color={C.dim}>3: empty</Tag>
      </At>
      <At n={4}>
        {[v, t].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y + 6} r={10} fill="#9aa1aa" stroke={C.accent} strokeWidth={1.5} strokeDasharray="2 2" />
            <ellipse cx={p.x} cy={p.y + 6} rx={6} ry={4} fill="#d6d9de" />
          </g>
        ))}
        <Tag x={180} y={22} anchor="middle" color={C.good}>pot back = ground point: scuff, then solder</Tag>
      </At>
      <N n={1} x={30} y={110} />
      <N n={2} x={160} y={150} />
      <N n={3} x={330} y={150} />
      <N n={4} x={180} y={120} />
    </Figure>
  );
}

export function SolderJointDiagram() {
  const lug = (x: number) => <rect x={x - 4} y={70} width={8} height={70} fill={C.metalFill} stroke={C.line} />;
  return (
    <Figure
      title="Good and bad solder joints"
      how={[
        "Tin first: put a little solder on the wire end and on the lug before joining them.",
        "Heat the joint (iron on the lug and wire together), then feed solder into the joint — not onto the iron. About 350 °C (660 °F) for leaded solder.",
        "Good joint: smooth, shiny, a concave fillet that flows onto both parts, wire outline visible.",
        "Cold joint: dull, grainy or a ball sitting on top — it crackles and fails. Reheat it with a touch of fresh solder (rosin core) and hold still while it cools.",
      ]}
      note="30–40 W pencil iron, 0.032 in (0.8 mm) rosin-core solder. Ventilate, and wash your hands after handling leaded solder."
    >
      <At n={[1, 2]}>
        {lug(180)}
        <line x1={110} y1={100} x2={176} y2={100} stroke="#b07a45" strokeWidth={3} />
        <rect x={60} y={95} width={50} height={10} rx={3} fill="#2f3237" />
        <T x={85} y={118} anchor="middle" size={9}>wire</T>
        <T x={180} y={154} anchor="middle" size={9}>lug</T>
      </At>
      <At n={1}>
        <rect x={150} y={97} width={26} height={6} rx={2} fill="#d6d9de" />
        <rect x={176} y={88} width={8} height={24} fill="#d6d9de" opacity={0.85} />
        <Tag x={180} y={40} anchor="middle">a thin coat of solder on BOTH first</Tag>
        <Arrow x1={140} y1={60} x2={160} y2={94} />
        <Arrow x1={220} y1={60} x2={186} y2={90} />
      </At>
      <At n={2}>
        <g transform="rotate(35 200 80)">
          <rect x={196} y={20} width={10} height={56} rx={3} fill="#3a3f46" />
          <path d="M 196 76 L 206 76 L 201 90 Z" fill="#9aa1aa" />
        </g>
        <line x1={150} y1={40} x2={178} y2={92} stroke="#d6d9de" strokeWidth={2} />
        <Tag x={120} y={30} anchor="middle">feed solder into the joint</Tag>
        <Tag x={300} y={70} anchor="middle" color={C.bad}>iron heats lug + wire</Tag>
        <Tag x={290} y={150} anchor="middle" color={C.dim}>≈ 350 °C / 660 °F</Tag>
      </At>
      <At n={[3, 4]}>
        <Hl n={3}>
          {lug(70)}
          <line x1={30} y1={100} x2={70} y2={100} stroke="#b07a45" strokeWidth={3} />
          <path d="M 52 100 Q 66 84 70 80 L 78 80 Q 82 96 92 104 Q 70 112 52 100 Z" fill="#d6d9de" stroke="#999" />
          <path d="M 60 96 Q 66 90 70 88" stroke="#fff" strokeWidth={1.2} opacity={0.8} fill="none" />
        </Hl>
        <T x={70} y={160} anchor="middle" color={C.good} weight={700}>good: shiny, concave</T>
        <Hl n={4}>
          {lug(180)}
          <line x1={140} y1={100} x2={180} y2={100} stroke="#b07a45" strokeWidth={3} />
          <circle cx={180} cy={98} r={14} fill="#8d8f92" stroke="#666" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={172 + i * 4} cy={94 + (i % 2) * 6} r={1.2} fill="#666" />
          ))}
          {lug(290)}
          <line x1={250} y1={100} x2={290} y2={100} stroke="#b07a45" strokeWidth={3} />
          <path d="M 280 99 L 290 97 L 292 101 L 282 102 Z" fill="#d6d9de" />
        </Hl>
        <T x={180} y={160} anchor="middle" color={C.bad} weight={700}>cold: dull ball</T>
        <T x={290} y={160} anchor="middle" color={C.bad} weight={700}>too little: loose</T>
      </At>
      <Tag x={70} y={40} n={3} anchor="middle" color={C.good}>wire outline visible</Tag>
      <Tag x={235} y={40} n={4} anchor="middle" color={C.bad}>reheat + a touch of fresh solder</Tag>
      <N n={1} x={30} y={40} />
      <N n={2} x={30} y={40} />
      <N n={3} x={130} y={60} />
      <N n={4} x={180} y={185} />
    </Figure>
  );
}

export function HumbuckerCoilsDiagram({ s, split = false }: { s: Schemes; split?: boolean }) {
  const col = (role: string, fallback: string) => {
    const c = s.hb?.wires.find((w) => w.role === role)?.color;
    return { c: c ? swatch(c) : fallback, name: c ?? null };
  };
  const hot = col("hot", "#f0b429");
  const gnd = col("ground", "#7c8591");
  const nf = col("nFinish", "#d946ef");
  const sf = col("sFinish", "#22c3ee");
  const coil = (x: number, label: string, faded: boolean) => (
    <g opacity={faded ? 0.35 : 1}>
      <rect x={x} y={40} width={110} height={44} rx={22} fill="#25282d" stroke={C.line} />
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={i} cx={x + 55} cy={62} rx={46 - i * 5} ry={16 - i * 2} fill="none" stroke="#b87333" strokeWidth={1} />
      ))}
      <T x={x + 55} y={28} anchor="middle" color={C.ink} weight={700}>
        {label}
      </T>
    </g>
  );
  const lead = (x: number, c: string, label: string, name: string | null, y2 = 150) => (
    <g>
      <path d={`M ${x} 84 L ${x} ${y2}`} stroke={outlineFor(c)} strokeWidth={4.4} />
      <path d={`M ${x} 84 L ${x} ${y2}`} stroke={c} strokeWidth={2.6} />
      <T x={x} y={y2 + 12} anchor="middle" size={9} color={C.ink}>
        {label}
      </T>
      {name ? (
        <T x={x} y={y2 + 24} anchor="middle" size={8}>
          {name}
        </T>
      ) : null}
    </g>
  );
  return (
    <Figure
      viewBox="0 0 360 210"
      title={split ? "Coil split: grounding the series link" : "Inside a 4-conductor humbucker"}
      how={
        split
          ? [
              "Normal: the two coils are in series (north finish joined to south finish).",
              "Split: connect that joined series-link pair to ground (with a push-pull or mini switch).",
              "The south coil is now shorted out — only the north coil (the one on the hot lead) makes sound: thinner, brighter, single-coil-like, and no longer hum-cancelling.",
              "Want the other coil instead? Connect the link pair to the hot side rather than ground (see the coil-split guide).",
            ]
          : [
              "Two coils, each with a start and a finish wire, plus a bare shield wire.",
              "HOT = north coil start → to the volume pot / switch.",
              "SERIES LINK = north finish + south finish soldered together and taped. This joins the coils so they work as one humbucker.",
              "GROUND = south coil start, together with the bare shield → to ground.",
            ]
      }
      note={s.hb ? `Colours shown: ${s.hb.brand}.${s.hb.splitNote ? ` ${s.hb.splitNote}` : ""}` : "Pick your pickup brand above the steps to see its real wire colours."}
    >
      {split ? (
        <>
          {coil(40, "north coil", false)}
          <At n={[1, 2]}>{coil(210, "south coil", false)}</At>
          <At n={[3, 4]}>{coil(210, "south coil", true)}</At>
          <Hl n={3}>{lead(60, hot.c, "hot", hot.name)}</Hl>
          <Hl n={[1, 2, 4]}>
            {lead(130, nf.c, "N finish", nf.name, 118)}
            {lead(230, sf.c, "S finish", sf.name, 118)}
            <path d="M 130 118 L 130 130 L 230 130 L 230 118" fill="none" stroke="#9aa1aa" strokeWidth={2} />
            <rect x={172} y={124} width={16} height={12} rx={3} fill="#1d1d1d" stroke="#555" />
          </Hl>
          {lead(300, gnd.c, "ground", gnd.name)}
          <T x={180} y={148} anchor="middle" size={9} color={C.ink}>series link</T>
          <At n={1}>
            <Arrow x1={95} y1={92} x2={265} y2={92} color={C.good} />
            <Tag x={180} y={190} anchor="middle" color={C.good}>both coils on: full humbucker</Tag>
          </At>
          <At n={[2, 3]}>
            <line x1={180} y1={136} x2={180} y2={170} stroke="#7c8591" strokeWidth={2.4} />
            <path d="M 168 170 L 192 170 M 172 175 L 188 175 M 176 180 L 184 180" stroke={C.ink} strokeWidth={1.6} />
            <Tag x={200} y={176} n={2}>switch: link → ground</Tag>
          </At>
          <At n={3}>
            <Tag x={265} y={104} anchor="middle" color={C.bad}>shorted out</Tag>
            <Tag x={95} y={104} anchor="middle" color={C.good}>only this coil sounds</Tag>
          </At>
          <At n={4}>
            <path d="M 180 136 L 180 160 L 60 160 L 60 150" fill="none" stroke={C.accent} strokeWidth={2} strokeDasharray="4 3" />
            <Tag x={180} y={182} anchor="middle">link → HOT instead = keep the other coil</Tag>
          </At>
        </>
      ) : (
        <>
          <Hl n={[1, 2]}>{coil(40, "north coil", false)}</Hl>
          <Hl n={[1, 4]}>{coil(210, "south coil", false)}</Hl>
          <Hl n={2}>{lead(60, hot.c, "hot", hot.name)}</Hl>
          <Hl n={3}>
            {lead(130, nf.c, "N finish", nf.name, 118)}
            {lead(230, sf.c, "S finish", sf.name, 118)}
            <path d="M 130 118 L 130 130 L 230 130 L 230 118" fill="none" stroke="#9aa1aa" strokeWidth={2} />
            <rect x={172} y={124} width={16} height={12} rx={3} fill="#1d1d1d" stroke="#555" />
          </Hl>
          <Hl n={4}>
            {lead(300, gnd.c, "ground", gnd.name)}
            <path d="M 318 84 L 318 150" stroke="#c9cdd3" strokeWidth={1.6} strokeDasharray="2 1" />
            <T x={326} y={118} size={8}>bare</T>
          </Hl>
          <T x={180} y={148} anchor="middle" size={9} color={C.ink}>series link (taped)</T>
          <Tag x={180} y={108} n={1} anchor="middle">2 coils · 4 colours + bare shield</Tag>
          <Tag x={60} y={190} n={2} anchor="middle">→ volume / switch</Tag>
          <Tag x={180} y={170} n={3} anchor="middle">solder together, tape, don't ground</Tag>
          <Tag x={300} y={190} n={4} anchor="end">+ bare → pot back (ground)</Tag>
        </>
      )}
      <N n={1} x={20} y={62} />
      <N n={2} x={split ? 120 : 30} y={split ? 172 : 150} />
      <N n={3} x={split ? 30 : 150} y={split ? 150 : 192} />
      <N n={4} x={split ? 30 : 342} y={split ? 150 : 40} />
    </Figure>
  );
}

export function Strat5WayDiagram() {
  const pos = [
    { n: 1, on: ["bridge"] },
    { n: 2, on: ["bridge", "middle"] },
    { n: 3, on: ["middle"] },
    { n: 4, on: ["middle", "neck"] },
    { n: 5, on: ["neck"] },
  ];
  return (
    <Figure
      viewBox="0 0 360 200"
      title="Strat 5-way switch positions"
      how={[
        "Position 1 is the lever pushed toward the bridge: bridge pickup alone.",
        "Positions 2 and 4 are the in-between 'quack' sounds: two pickups in parallel.",
        "Position 3 is the middle pickup alone, position 5 the neck pickup alone.",
        "Positions 2 and 4 cancel hum when the middle pickup is reverse-wound / reverse-polarity (RWRP).",
      ]}
    >
      {pos.map((p, i) => {
        const x = 34 + i * 62;
        const lit = [[1], [2, 4], [3], [2, 4], [3]][i]!;
        return (
          <Hl key={p.n} n={p.n === 5 ? [3] : p.n === 1 ? [1] : lit}>
          <g>
            {["neck", "middle", "bridge"].map((pk, k) => {
              const on = p.on.includes(pk);
              return (
                <rect key={pk} x={x - 26} y={40 + k * 34} width={52} height={16} rx={8} fill={on ? C.accent : "#3a3f46"} stroke={C.line} />
              );
            })}
          </g>
          </Hl>
        );
      })}
      {pos.map((p, i) => (
        <T key={p.n} x={34 + i * 62} y={20} anchor="middle" color={C.ink} weight={700}>
          {p.n}
        </T>
      ))}
      {["neck", "middle", "bridge"].map((pk, k) => (
        <T key={pk} x={312} y={48 + k * 34} size={9}>
          {pk}
        </T>
      ))}
      <Arrow x1={282} y1={160} x2={40} y2={160} color={C.dim} />
      <T x={170} y={176} anchor="middle" size={9}>lever: toward the bridge (1) … toward the neck (5)</T>
      <Tag x={34} y={142} n={1} anchor="middle">bridge alone</Tag>
      <Tag x={96} y={142} n={2} anchor="middle">bridge + middle</Tag>
      <Tag x={220} y={142} n={2} anchor="middle">middle + neck</Tag>
      <Tag x={158} y={142} n={3} anchor="middle">middle alone</Tag>
      <Tag x={282} y={142} n={3} anchor="middle">neck alone</Tag>
      <At n={4}>
        <Tag x={158} y={142} anchor="middle" color={C.good}>RWRP middle → 2 and 4 cancel hum</Tag>
        <rect x={306} y={72} width={44} height={20} rx={6} fill="none" stroke={C.good} strokeWidth={2} />
      </At>
      <N n={1} x={18} y={176} />
      <N n={2} x={18} y={176} />
      <N n={3} x={18} y={176} />
      <N n={4} x={18} y={176} />
    </Figure>
  );
}

export function DcrAtJackDiagram() {
  return (
    <Figure
      title="Test the whole guitar from the cable"
      how={[
        "Plug a cable into the guitar, volume on full, amp unplugged.",
        "Set a multimeter to resistance (20k range or auto). Touch one probe to the cable plug's TIP and the other to its SLEEVE.",
        "In each switch position you should read close to the selected pickup's resistance (a little less, because the pots sit across it). Two pickups in parallel read about half; series combinations read the sum.",
        "OL / infinite = a broken wire or joint (or open coil). Near 0 Ω = a short to ground. Wiggle the cable and switch while watching for flicker.",
      ]}
      note="Typical figures: vintage Strat 5.8–6.3 kΩ, Tele bridge 6.2–6.6 kΩ, Gibson PAF about 8.4 kΩ, Seymour Duncan JB 16.4 kΩ, Fender Jazz Bass 8.5 kΩ. Active pickups can't be measured this way."
    >
      <Hl n={1}>
        <rect x={6} y={60} width={40} height={54} rx={10} fill={C.woodFill} stroke={C.woodDark} />
        <circle cx={34} cy={87} r={7} fill="#2b2f35" stroke={C.line} />
        <rect x={20} y={80} width={140} height={14} rx={7} fill="#2b2f35" />
      </Hl>
      <T x={26} y={126} anchor="middle" size={8}>guitar</T>
      <rect x={160} y={78} width={40} height={18} rx={3} fill="#9aa1aa" />
      <Hl n={2}>
        <rect x={200} y={82} width={30} height={10} fill={C.metalFill} />
        <rect x={230} y={83} width={12} height={8} rx={4} fill="#d8b04a" />
      </Hl>
      <T x={236} y={70} anchor="middle" color={C.ink} size={9}>tip</T>
      <T x={214} y={106} anchor="middle" color={C.ink} size={9}>sleeve</T>
      <rect x={250} y={110} width={90} height={80} rx={8} fill="#e6c229" stroke="#8a7410" />
      <rect x={262} y={120} width={66} height={24} rx={3} fill="#c9d6c3" />
      <text x={295} y={133} textAnchor="middle" dominantBaseline="middle" fill="#1a1a1a" fontWeight={700} fontSize={12}>
        <At n={[1, 2, 3]}>6.12 kΩ</At>
        <At n={4}>OL</At>
      </text>
      <text x={295} y={176} textAnchor="middle" dominantBaseline="middle" fill="#1a1a1a" fontSize={9}>
        Ω · 20k
      </text>
      <At n={[2, 3, 4]}>
        <path d="M 236 86 C 300 40, 320 60, 280 112" fill="none" stroke="#c0392b" strokeWidth={2} />
        <path d="M 214 92 C 220 150, 270 160, 310 150" fill="none" stroke="#222" strokeWidth={2} />
      </At>
      <Tag x={150} y={40} n={1} anchor="middle">volume on full · amp unplugged</Tag>
      <Tag x={110} y={150} n={2} anchor="middle">red → tip · black → sleeve</Tag>
      <At n={3}>
        <Tag x={110} y={130} anchor="middle" color={C.good}>≈ the pickup's resistance</Tag>
        <Tag x={110} y={152} anchor="middle" color={C.dim}>2 in parallel ≈ half</Tag>
        <Tag x={110} y={174} anchor="middle" color={C.dim}>series = the sum</Tag>
      </At>
      <At n={4}>
        <Tag x={110} y={130} anchor="middle" color={C.bad}>OL = open (broken wire / joint)</Tag>
        <Tag x={110} y={152} anchor="middle" color={C.bad}>≈ 0 Ω = short to ground</Tag>
        <Tag x={110} y={174} anchor="middle" color={C.dim}>wiggle cable + switch, watch it</Tag>
      </At>
      <N n={1} x={26} y={40} />
      <N n={2} x={340} y={90} />
      <N n={3} x={226} y={136} />
      <N n={4} x={226} y={136} />
    </Figure>
  );
}

export function StarGroundDiagram() {
  const spokes = [
    { a: -140, l: "pickup grounds" },
    { a: -100, l: "pickup shields" },
    { a: -60, l: "tone pot back" },
    { a: -20, l: "jack sleeve" },
    { a: 25, l: "bridge / claw" },
    { a: 155, l: "shielding" },
    { a: 200, l: "switch frame" },
  ];
  return (
    <Figure
      viewBox="0 0 360 220"
      title="Star grounding: every ground to one point"
      how={[
        "Pick one ground point — usually the back of the volume pot.",
        "Run every ground to it: pickup grounds and shields, other pot backs, the jack sleeve, the bridge or trem-claw wire, the switch frame and the shielding.",
        "Check with a meter: about 0 Ω from the strings, every pot back and the shielding to the jack sleeve.",
        "Touch-the-strings test: hum that drops when you touch the strings is normal on single coils; hum that gets LOUDER, or doesn't change, points to a missing ground.",
      ]}
    >
      <Hl n={1}>
        <circle cx={180} cy={120} r={26} fill={C.potFill} stroke={C.line} />
      </Hl>
      <T x={180} y={120} anchor="middle" color={C.ink} weight={700} size={9}>volume back</T>
      {spokes.map((sp) => {
        const r = (sp.a * Math.PI) / 180;
        const x2 = 180 + 88 * Math.cos(r);
        const y2 = 120 + 80 * Math.sin(r);
        return (
          <g key={sp.l}>
            <Hl n={2}>
              <line x1={180 + 26 * Math.cos(r)} y1={120 + 26 * Math.sin(r)} x2={x2} y2={y2} stroke="#7c8591" strokeWidth={2.4} />
            </Hl>
            <circle cx={x2} cy={y2} r={3} fill={C.metalFill} />
            <T x={x2 + (Math.cos(r) >= 0 ? 6 : -6)} y={y2} anchor={Math.cos(r) >= 0 ? "start" : "end"} size={9} color={C.ink}>
              {sp.l}
            </T>
          </g>
        );
      })}
      <Tag x={180} y={170} n={1} anchor="middle">one point: the volume pot's back</Tag>
      <Tag x={180} y={210} n={2} anchor="middle">every ground wire runs here</Tag>
      <At n={3}>
        <rect x={250} y={170} width={70} height={42} rx={6} fill="#e6c229" stroke="#8a7410" />
        <text x={285} y={190} textAnchor="middle" dominantBaseline="middle" fontWeight={700} fontSize={12} fill="#1a1a1a">0.2 Ω</text>
        <Tag x={150} y={200} anchor="middle" color={C.good}>each ground → jack sleeve ≈ 0 Ω</Tag>
      </At>
      <At n={4}>
        <Tag x={180} y={176} anchor="middle" color={C.good}>touch strings, hum drops = normal</Tag>
        <Tag x={180} y={200} anchor="middle" color={C.bad}>louder / no change = missing ground</Tag>
      </At>
      <N n={1} x={180} y={86} />
      <N n={2} x={30} y={30} />
      <N n={3} x={330} y={30} />
      <N n={4} x={180} y={86} />
    </Figure>
  );
}

export function PhaseDiagram() {
  const wave = (y: number, inv: boolean, color: string) => (
    <path d={Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"} ${30 + i * 3.4} ${y + (inv ? -1 : 1) * 12 * Math.sin((i / 40) * Math.PI * 4)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} />
  );
  return (
    <Figure
      title="In phase and out of phase"
      how={[
        "Two pickups (or coils) in phase push the signal the same way at the same time: their sound adds up — full and strong.",
        "Out of phase, one is reversed: much of the sound cancels, especially the bass. You hear a thin, hollow, quieter tone (some players want this on purpose).",
        "Hum-cancelling needs opposite wind AND opposite magnet polarity (RWRP) — then the hum cancels but the string signal adds.",
        "Swapping a 4-conductor humbucker's hot and ground (and its link) flips its phase — the phase-switch guide shows how.",
      ]}
    >
      <T x={110} y={20} anchor="middle" color={C.good} weight={700}>in phase</T>
      <T x={110} y={172} anchor="middle" color={C.ink}>= stronger</T>
      <T x={270} y={20} anchor="middle" color={C.bad} weight={700}>out of phase</T>
      <T x={270} y={172} anchor="middle" color={C.ink}>= thin, hollow</T>
      <Hl n={[1, 3]}>
        {wave(50, false, C.good)}
        {wave(88, false, C.good)}
        <path d={Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"} ${30 + i * 3.4} ${140 + 22 * Math.sin((i / 40) * Math.PI * 4)}`).join(" ")} fill="none" stroke={C.good} strokeWidth={2.6} />
      </Hl>
      <Hl n={[2, 4]}>
        <g transform="translate(170 0)">
          {wave(50, false, C.bad)}
          {wave(88, true, C.bad)}
        </g>
        <line x1={200} y1={140} x2={336} y2={140} stroke={C.bad} strokeWidth={2.6} />
      </Hl>
      <T x={180} y={69} anchor="middle" size={14} color={C.dim}>+</T>
      <T x={180} y={116} anchor="middle" size={14} color={C.dim}>=</T>
      <Tag x={110} y={190} n={1} anchor="middle" color={C.good}>same direction: adds up</Tag>
      <Tag x={270} y={190} n={2} anchor="middle" color={C.bad}>one reversed: cancels</Tag>
      <Tag x={110} y={190} n={3} anchor="middle" color={C.good}>RWRP: hum cancels, notes add</Tag>
      <Tag x={270} y={190} n={4} anchor="middle">swap hot ↔ ground = flip phase</Tag>
      <N n={1} x={20} y={20} />
      <N n={2} x={340} y={20} />
      <N n={3} x={20} y={20} />
      <N n={4} x={340} y={20} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ acoustic care & wood */

export function HumidityDiagram() {
  const x = (rh: number) => 20 + rh * 3.2;
  return (
    <Figure
      viewBox="0 0 360 190"
      title="Humidity: keep the guitar in the green"
      how={[
        "Keep a digital hygrometer in the case (or the room). Martin and Taylor both recommend 45–55% relative humidity.",
        "Too dry: the wood shrinks — fret ends stick out, the top sinks and the action drops, and cracks can open. Humidify (soundhole or case humidifier, two-way packs).",
        "Too wet: the wood swells — the top bulges, the action rises and the tone goes dull. Dehumidify the room or use two-way packs.",
        "Change things slowly (Taylor: give it about three days), and check the hygrometer before any setup work — never lower a saddle in a dry spell.",
      ]}
    >
      <defs>
        <linearGradient id="rhgrad" x1="0" x2="1">
          <stop offset="0" stopColor="#c0392b" />
          <stop offset="0.38" stopColor="#e0a23a" />
          <stop offset="0.45" stopColor="#2ea05a" />
          <stop offset="0.55" stopColor="#2ea05a" />
          <stop offset="0.65" stopColor="#e0a23a" />
          <stop offset="1" stopColor="#2f6fe0" />
        </linearGradient>
      </defs>
      <rect x={x(0)} y={70} width={x(100) - x(0)} height={26} rx={6} fill="url(#rhgrad)" />
      <rect x={x(45)} y={64} width={x(55) - x(45)} height={38} rx={4} fill="none" stroke={C.ink} strokeWidth={2} />
      {[0, 20, 45, 55, 80, 100].map((v) => (
        <T key={v} x={x(v)} y={112} anchor="middle" size={8}>
          {v}%
        </T>
      ))}
      <At n={[1, 4]}>
        <T x={x(50)} y={52} anchor="middle" color={C.good} weight={700}>45–55% target</T>
      </At>
      <At n={1}>
        <rect x={x(50) - 40} y={124} width={80} height={44} rx={8} fill="#1d2024" stroke={C.line} />
        <text x={x(50)} y={146} textAnchor="middle" dominantBaseline="middle" fill={C.good} fontWeight={700} fontSize={16}>49%</text>
        <T x={x(50)} y={178} anchor="middle" size={8}>hygrometer in the case</T>
      </At>
      <At n={2}>
        <Arrow x1={x(40)} y1={58} x2={x(20)} y2={58} color={C.bad} />
        <Tag x={20} y={134} color={C.bad}>dry: cracks · sharp fret ends · low action</Tag>
        <Tag x={20} y={158} color={C.good}>→ humidify (soundhole / case packs)</Tag>
      </At>
      <At n={3}>
        <Arrow x1={x(60)} y1={58} x2={x(80)} y2={58} color="#5b8def" />
        <Tag x={340} y={134} anchor="end" color="#5b8def">wet: top bulges · high action · dull</Tag>
        <Tag x={340} y={158} anchor="end" color={C.good}>→ dehumidify the room / two-way packs</Tag>
      </At>
      <At n={4}>
        <Tag x={180} y={140} anchor="middle">change slowly — about 3 days</Tag>
        <Tag x={180} y={164} anchor="middle" color={C.bad}>check before any setup work</Tag>
      </At>
      <N n={1} x={x(50)} y={30} />
      <N n={2} x={x(10)} y={30} />
      <N n={3} x={x(85)} y={30} />
      <N n={4} x={x(50)} y={30} />
    </Figure>
  );
}

export function CrackCleatDiagram() {
  return (
    <Figure
      title="Top crack: glue it, then cleat it from inside"
      how={[
        "Humidify the guitar to normal first — a crack often closes up by itself when the wood swells back.",
        "Clean the crack, then work glue in and clamp the two sides level (no step between them). Leave it 24 h before restringing.",
        "From the inside, glue small cleats (about 3/32–1/8 in thick) across the crack, spaced along it — they stop it opening again.",
        "Cleat grain runs ACROSS the crack: StewMac says about 45°; many luthiers use 90° to the top's grain. Never parallel to the crack.",
      ]}
      note="Mirror and light help you see inside. Long or open cracks, or ones near the bridge, are luthier work."
    >
      <rect x={20} y={30} width={320} height={150} rx={10} fill={C.woodFill} stroke={C.woodDark} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={20} y1={40 + i * 12} x2={340} y2={40 + i * 12} stroke={C.woodDark} strokeWidth={0.6} opacity={0.5} />
      ))}
      <T x={30} y={22} size={9}>top seen from inside — grain runs left to right</T>
      <At n={1}>
        <path d="M 60 102 L 120 99 L 180 104 L 240 100 L 300 103 L 300 107 L 240 104 L 180 108 L 120 103 L 60 106 Z" fill="#111" />
        <Tag x={180} y={60} anchor="middle">humidify first — it may close up</Tag>
        <Tag x={180} y={160} anchor="middle" color={C.dim}>open crack, seen from inside</Tag>
      </At>
      <Hl n={[2, 3, 4]}>
        <path d="M 60 104 L 120 101 L 180 106 L 240 102 L 300 105" stroke="#222" strokeWidth={2.4} fill="none" />
      </Hl>
      <T x={330} y={124} anchor="end" color={C.bad} weight={700} size={9}>crack (along the grain)</T>
      <At n={2}>
        <path d="M 60 104 L 120 101 L 180 106 L 240 102 L 300 105" stroke="#f3e9c6" strokeWidth={1.4} fill="none" strokeDasharray="2 3" />
        <Tag x={180} y={60} anchor="middle">glue in, clamp both sides level</Tag>
        <Zoom x={300} y={60} r={26} cx={120} cy={101} scale={3} label="no step">
          <rect x={100} y={92} width={40} height={20} fill={C.woodFill} />
          <line x1={100} y1={101} x2={140} y2={101} stroke="#222" strokeWidth={1.2} />
        </Zoom>
        <Tag x={180} y={160} anchor="middle" color={C.dim}>wait 24 h before restringing</Tag>
      </At>
      <At n={[3, 4]}>
        {[90, 150, 210, 270].map((x) => (
          <g key={x} transform={`rotate(-45 ${x} 104)`}>
            <rect x={x - 6} y={92} width={12} height={24} rx={2} fill="#e8cf9c" stroke={C.woodDark} />
            {[0, 1, 2].map((k) => (
              <line key={k} x1={x - 3 + k * 3} y1={93} x2={x - 3 + k * 3} y2={115} stroke={C.woodDark} strokeWidth={0.6} />
            ))}
          </g>
        ))}
      </At>
      <Tag x={180} y={160} n={3} anchor="middle">small cleats across, spaced along the crack</Tag>
      <At n={4}>
        <Tag x={180} y={160} anchor="middle" color={C.good}>cleat grain ACROSS the crack (45–90°)</Tag>
        <Tag x={180} y={60} anchor="middle" color={C.bad}>never parallel to the crack</Tag>
      </At>
      <N n={1} x={40} y={60} />
      <N n={2} x={40} y={60} />
      <N n={3} x={40} y={60} />
      <N n={4} x={40} y={60} />
    </Figure>
  );
}

export function DowelPlugDiagram() {
  return (
    <Figure
      title="Fix a stripped screw hole (strap button, neck, pickguard)"
      how={[
        "Drill the stripped hole out to a clean, round size — StewMac's strap-button fix: 3/16 in.",
        "Glue in a snug hardwood dowel of the same size (3/16 in), grain running along the hole. Let it set — wood glue at least 1 h (overnight is better), super glue about 20 min.",
        "Trim the dowel flush and touch up the finish if needed.",
        "Drill a new pilot hole in the centre — 7/64 in for a strap-button screw — then refit the screw. Don't overtighten.",
      ]}
      note="Toothpicks and glue work in a pinch, but a dowel gives the screw solid long-grain wood to bite."
    >
      <rect x={20} y={90} width={320} height={90} fill={C.woodFill} stroke={C.woodDark} />
      <T x={30} y={190} size={8}>cut-away view of the wood</T>
      {/* hole, as it is in each step */}
      <At n={1}>
        <path d="M 172 90 L 188 90 L 186 150 L 174 150 Z" fill="#2a1f14" />
        <path d="M 172 90 L 168 96 M 188 90 L 192 97 M 174 110 L 170 114 M 186 120 L 190 124" stroke="#2a1f14" strokeWidth={2} />
        <rect x={160} y={42} width={40} height={10} rx={3} fill={C.metalFill} stroke={C.line} />
        <rect x={155} y={20} width={50} height={22} rx={10} fill="#3a3f46" />
        <Tag x={260} y={60}>stripped: screw spins</Tag>
        <path d="M 180 48 L 180 120" stroke="#9aa1aa" strokeWidth={4} strokeDasharray="2 2" />
        <Tag x={260} y={140}>drill to a clean 3/16 in</Tag>
        <Arrow x1={250} y1={140} x2={196} y2={130} />
      </At>
      <At n={2}>
        <rect x={171} y={90} width={18} height={62} fill="#2a1f14" />
        <rect x={171} y={36} width={18} height={60} fill="#e3c38d" stroke={C.woodDark} />
        {[0, 1, 2].map((k) => (
          <line key={k} x1={175 + k * 5} y1={38} x2={175 + k * 5} y2={94} stroke={C.woodDark} strokeWidth={0.6} />
        ))}
        <Arrow x1={150} y1={40} x2={150} y2={90} />
        <Tag x={260} y={50}>3/16 hardwood dowel + glue</Tag>
        <Tag x={260} y={74} color={C.dim}>grain along the hole</Tag>
        <Tag x={260} y={140} color={C.dim}>wood glue 1 h+ · CA ≈ 20 min</Tag>
      </At>
      <At n={[3, 4]}>
        <rect x={171} y={90} width={18} height={62} fill="#e3c38d" stroke={C.woodDark} />
      </At>
      <At n={3}>
        <rect x={171} y={70} width={18} height={20} fill="#e3c38d" stroke={C.woodDark} opacity={0.4} strokeDasharray="2 2" />
        <line x1={140} y1={90} x2={220} y2={90} stroke={C.accent} strokeWidth={2} strokeDasharray="4 2" />
        <Tag x={260} y={60}>trim flush, touch up finish</Tag>
      </At>
      <At n={4}>
        <rect x={178} y={90} width={4} height={50} fill="#3a2a1a" />
        <Tag x={260} y={60}>7/64 in pilot, dead centre</Tag>
        <Tag x={260} y={84} color={C.bad}>don't overtighten</Tag>
        <Zoom x={70} y={50} r={30} cx={180} cy={110} scale={2} label="solid long grain">
          <rect x={160} y={90} width={40} height={40} fill={C.woodFill} />
          <rect x={171} y={90} width={18} height={40} fill="#e3c38d" />
          <rect x={178} y={90} width={4} height={40} fill="#3a2a1a" />
        </Zoom>
      </At>
      <N n={1} x={140} y={130} />
      <N n={2} x={130} y={60} />
      <N n={3} x={140} y={130} />
      <N n={4} x={140} y={130} />
    </Figure>
  );
}
