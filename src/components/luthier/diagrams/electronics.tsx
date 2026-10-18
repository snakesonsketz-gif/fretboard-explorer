/** Electronics and acoustic-care diagrams (pots, soldering, coils, switching, grounding, humidity, cracks, screw holes). */
import { Arrow, C, Figure, N, T, Turn } from "./kit";
import { outlineFor, pot, type Schemes } from "./wiring";
import { swatch } from "@/lib/luthier/types";

export function PotLugsDiagram() {
  const v = pot(100, 120);
  const t = pot(260, 120);
  const body = (p: ReturnType<typeof pot>) => (
    <g>
      <circle cx={p.x} cy={p.y} r={30} fill="#59606a" stroke={C.line} />
      {[p.l1, p.l2, p.l3].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3.5} y={y - 6} width={7} height={13} fill={C.metal} stroke={C.line} />
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
      {body(v)}
      {body(t)}
      <T x={v.x} y={182} anchor="middle" color={C.ink} weight={700}>VOLUME</T>
      <T x={t.x} y={182} anchor="middle" color={C.ink} weight={700}>TONE</T>
      <T x={v.l3[0] + 4} y={52} color={C.good} size={9}>3: in</T>
      <T x={v.l2[0]} y={40} anchor="middle" color={C.accent} size={9}>2: out</T>
      <T x={v.l1[0] - 4} y={52} anchor="end" color={C.dim} size={9}>1: ground</T>
      <T x={t.l2[0]} y={40} anchor="middle" color={C.good} size={9}>2: in</T>
      <T x={t.l1[0] - 4} y={52} anchor="end" color={C.accent} size={9}>1: cap → ground</T>
      <T x={t.l3[0] + 4} y={52} color={C.dim} size={9}>3: empty</T>
      <Turn cx={v.x} cy={v.y + 4} r={14} cw />
      <T x={v.x} y={v.y + 44} anchor="middle" size={8}>↻ knob clockwise: wiper → lug 3</T>
      <N n={1} x={30} y={110} />
      <N n={2} x={160} y={150} />
      <N n={3} x={320} y={150} />
      <N n={4} x={t.x} y={t.y + 4} />
    </Figure>
  );
}

export function SolderJointDiagram() {
  const lug = (x: number) => <rect x={x - 4} y={70} width={8} height={70} fill={C.metal} stroke={C.line} />;
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
      {lug(70)}
      <line x1={30} y1={100} x2={70} y2={100} stroke="#b07a45" strokeWidth={3} />
      <path d="M 52 100 Q 66 84 70 80 L 78 80 Q 82 96 92 104 Q 70 112 52 100 Z" fill="#d6d9de" stroke="#999" />
      <T x={70} y={160} anchor="middle" color={C.good} weight={700}>good: shiny, concave</T>
      {lug(180)}
      <line x1={140} y1={100} x2={180} y2={100} stroke="#b07a45" strokeWidth={3} />
      <circle cx={180} cy={98} r={14} fill="#8d8f92" stroke="#666" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={172 + i * 4} cy={94 + (i % 2) * 6} r={1.2} fill="#666" />
      ))}
      <T x={180} y={160} anchor="middle" color={C.bad} weight={700}>cold: dull ball</T>
      {lug(290)}
      <line x1={250} y1={100} x2={290} y2={100} stroke="#b07a45" strokeWidth={3} />
      <path d="M 280 99 L 290 97 L 292 101 L 282 102 Z" fill="#d6d9de" />
      <T x={290} y={160} anchor="middle" color={C.bad} weight={700}>too little: wire loose</T>
      <N n={1} x={30} y={60} />
      <N n={2} x={120} y={60} />
      <N n={3} x={70} y={185} />
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
    <g opacity={faded ? 0.3 : 1}>
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
      {coil(40, "north coil", false)}
      {coil(210, "south coil", split)}
      {lead(60, hot.c, "hot", hot.name)}
      {lead(130, nf.c, "N finish", nf.name, 118)}
      {lead(230, sf.c, "S finish", sf.name, 118)}
      {lead(300, gnd.c, "ground", gnd.name)}
      <path d="M 130 118 L 130 130 L 230 130 L 230 118" fill="none" stroke="#9aa1aa" strokeWidth={2} />
      <rect x={172} y={124} width={16} height={12} rx={3} fill="#1d1d1d" stroke="#555" />
      <T x={180} y={148} anchor="middle" size={9} color={C.ink}>
        {split ? "series link" : "series link (taped)"}
      </T>
      {split ? (
        <g>
          <line x1={180} y1={136} x2={180} y2={176} stroke="#7c8591" strokeWidth={2.4} />
          <path d="M 168 176 L 192 176 M 172 181 L 188 181 M 176 186 L 184 186" stroke={C.ink} strokeWidth={1.6} />
          <T x={196} y={180} size={9} color={C.accent} weight={700}>to ground = split</T>
        </g>
      ) : null}
      <N n={1} x={20} y={62} />
      <N n={2} x={60} y={196} />
      <N n={3} x={180} y={110} />
      <N n={4} x={300} y={196} />
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
        const x = 40 + i * 70;
        return (
          <g key={p.n}>
            <T x={x} y={20} anchor="middle" color={C.ink} weight={700}>
              {p.n}
            </T>
            {["neck", "middle", "bridge"].map((pk, k) => {
              const on = p.on.includes(pk);
              return (
                <rect key={pk} x={x - 26} y={40 + k * 34} width={52} height={16} rx={8} fill={on ? C.accent : "#3a3f46"} stroke={C.line} />
              );
            })}
          </g>
        );
      })}
      {["neck", "middle", "bridge"].map((pk, k) => (
        <T key={pk} x={350} y={48 + k * 34} anchor="end" size={8}>
          {pk}
        </T>
      ))}
      <Arrow x1={300} y1={160} x2={40} y2={160} color={C.dim} />
      <T x={170} y={176} anchor="middle" size={9}>lever: toward the bridge (1) … toward the neck (5)</T>
      <N n={1} x={40} y={188} />
      <N n={2} x={110} y={188} />
      <N n={3} x={180} y={188} />
      <N n={4} x={320} y={188} />
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
      <rect x={20} y={80} width={140} height={14} rx={7} fill="#2b2f35" />
      <rect x={160} y={78} width={40} height={18} rx={3} fill="#9aa1aa" />
      <rect x={200} y={82} width={30} height={10} fill={C.metal} />
      <rect x={230} y={83} width={12} height={8} rx={4} fill="#d8b04a" />
      <T x={236} y={70} anchor="middle" color={C.ink} size={9}>tip</T>
      <T x={214} y={106} anchor="middle" color={C.ink} size={9}>sleeve</T>
      <rect x={250} y={110} width={90} height={80} rx={8} fill="#e6c229" stroke="#8a7410" />
      <rect x={262} y={120} width={66} height={24} rx={3} fill="#c9d6c3" />
      <T x={295} y={133} anchor="middle" color="#1a1a1a" weight={700} size={12}>6.12 kΩ</T>
      <path d="M 236 86 C 300 40, 320 60, 280 112" fill="none" stroke="#c0392b" strokeWidth={2} />
      <path d="M 214 92 C 220 150, 270 160, 310 150" fill="none" stroke="#222" strokeWidth={2} />
      <T x={295} y={176} anchor="middle" color="#1a1a1a" size={9}>Ω</T>
      <N n={1} x={80} y={60} />
      <N n={2} x={340} y={100} />
      <N n={3} x={220} y={150} />
      <N n={4} x={150} y={150} />
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
      <circle cx={180} cy={120} r={26} fill="#59606a" stroke={C.line} />
      <T x={180} y={120} anchor="middle" color={C.ink} weight={700} size={9}>volume back</T>
      {spokes.map((sp) => {
        const r = (sp.a * Math.PI) / 180;
        const x2 = 180 + 88 * Math.cos(r);
        const y2 = 120 + 80 * Math.sin(r);
        return (
          <g key={sp.l}>
            <line x1={180 + 26 * Math.cos(r)} y1={120 + 26 * Math.sin(r)} x2={x2} y2={y2} stroke="#7c8591" strokeWidth={2.4} />
            <circle cx={x2} cy={y2} r={3} fill={C.metal} />
            <T x={x2 + (Math.cos(r) >= 0 ? 6 : -6)} y={y2} anchor={Math.cos(r) >= 0 ? "start" : "end"} size={9} color={C.ink}>
              {sp.l}
            </T>
          </g>
        );
      })}
      <N n={1} x={180} y={160} />
      <N n={2} x={60} y={60} />
      <N n={3} x={320} y={190} />
      <N n={4} x={40} y={200} />
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
      {wave(55, false, C.good)}
      {wave(95, false, C.good)}
      <T x={110} y={128} anchor="middle" color={C.ink}>= stronger</T>
      <T x={270} y={20} anchor="middle" color={C.bad} weight={700}>out of phase</T>
      <g transform="translate(170 0)">
        {wave(55, false, C.bad)}
        {wave(95, true, C.bad)}
      </g>
      <T x={270} y={128} anchor="middle" color={C.ink}>= thin, hollow</T>
      <N n={1} x={110} y={160} />
      <N n={2} x={270} y={160} />
      <N n={3} x={40} y={185} />
      <N n={4} x={320} y={185} />
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
      <T x={x(50)} y={52} anchor="middle" color={C.good} weight={700}>45–55% target</T>
      <T x={20} y={140} color={C.bad} weight={700}>dry: cracks, sharp frets, low action</T>
      <T x={340} y={140} anchor="end" color="#5b8def" weight={700}>wet: swelling, high action</T>
      <N n={1} x={x(50)} y={30} />
      <N n={2} x={x(10)} y={165} />
      <N n={3} x={x(85)} y={165} />
      <N n={4} x={x(50)} y={165} />
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
      <rect x={20} y={30} width={320} height={150} rx={10} fill={C.wood} stroke={C.woodDark} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={20} y1={40 + i * 12} x2={340} y2={40 + i * 12} stroke={C.woodDark} strokeWidth={0.6} opacity={0.5} />
      ))}
      <T x={30} y={22} size={9}>top seen from inside — grain runs left to right</T>
      <path d="M 60 104 L 120 101 L 180 106 L 240 102 L 300 105" stroke="#222" strokeWidth={2.4} fill="none" />
      <T x={330} y={128} anchor="end" color={C.bad} weight={700} size={9}>crack (along the grain)</T>
      {[90, 150, 210, 270].map((x) => (
        <g key={x} transform={`rotate(-45 ${x} 104)`}>
          <rect x={x - 6} y={92} width={12} height={24} rx={2} fill="#e8cf9c" stroke={C.woodDark} />
          {[0, 1, 2].map((k) => (
            <line key={k} x1={x - 3 + k * 3} y1={93} x2={x - 3 + k * 3} y2={115} stroke={C.woodDark} strokeWidth={0.6} />
          ))}
        </g>
      ))}
      <T x={150} y={150} anchor="middle" color={C.accent} weight={700}>cleats across the crack</T>
      <N n={1} x={40} y={60} />
      <N n={2} x={120} y={80} />
      <N n={3} x={210} y={140} />
      <N n={4} x={300} y={60} />
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
      <rect x={20} y={70} width={320} height={100} fill={C.wood} stroke={C.woodDark} />
      {[0, 1, 2, 3].map((k) => {
        const x = 50 + k * 80;
        return (
          <g key={k}>
            {k === 0 ? <path d={`M ${x - 8} 70 L ${x + 8} 70 L ${x + 6} 130 L ${x - 6} 130 Z`} fill="#3a2a1a" /> : null}
            {k === 1 ? <rect x={x - 9} y={70} width={18} height={62} fill="#2a1f14" /> : null}
            {k >= 2 ? <rect x={x - 9} y={70} width={18} height={62} fill="#e3c38d" stroke={C.woodDark} /> : null}
            {k === 3 ? <rect x={x - 2} y={70} width={4} height={50} fill="#3a2a1a" /> : null}
            <T x={x} y={185} anchor="middle" size={9} color={C.ink}>
              {["stripped", "drill out 3/16", "glue dowel, flush", "pilot 7/64"][k]}
            </T>
            <N n={k + 1} x={x} y={50} />
          </g>
        );
      })}
    </Figure>
  );
}
