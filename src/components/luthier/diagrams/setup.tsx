/**
 * Setup diagrams: relief, action, nut, truss rod, intonation, radius, pickup height, acoustic
 * saddle, neck angle, trems and bridges. Each is one drawing paged through step by step: the
 * step's parts light up (Hl), its labels and close-ups appear (n=…), the rest fades back.
 */
import { Arrow, At, C, Figure, fretXs, Gap, Hl, N, T, Tag, Turn, Zoom } from "./kit";

/* ------------------------------------------------------------------ shared bits */

/** A fret seen from the side: a crowned bead of wire sitting on the board. */
const Fret = ({ x, y, w = 5, h = 6 }: { x: number; y: number; w?: number; h?: number }) => (
  <path d={`M ${x - w / 2} ${y} C ${x - w / 2} ${y - h}, ${x + w / 2} ${y - h}, ${x + w / 2} ${y} Z`} fill={C.metalFill} stroke="#8d939b" strokeWidth={0.6} />
);
const Finger = ({ x, y }: { x: number; y: number }) => <path d={`M ${x - 9} ${y - 22} Q ${x - 10} ${y - 2} ${x} ${y} Q ${x + 10} ${y - 2} ${x + 9} ${y - 22} Z`} fill="#d9a77c" stroke="#9a6a45" strokeWidth={0.8} />;
const Capo = ({ x, y }: { x: number; y: number }) => (
  <g>
    <rect x={x - 8} y={y - 18} width={16} height={12} rx={3} fill="#3a3f46" stroke={C.line} />
    <rect x={x - 6} y={y - 7} width={12} height={5} rx={2} fill="#1d1f22" />
  </g>
);
const Eye = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M ${x - 14} ${y} Q ${x} ${y - 10} ${x + 14} ${y} Q ${x} ${y + 10} ${x - 14} ${y} Z`} fill="var(--color-card)" stroke={C.ink} />
    <circle cx={x} cy={y} r={3.5} fill={C.ink} />
  </g>
);
const Tuner = ({ x, y, cents, label }: { x: number; y: number; cents: number; label: string }) => (
  <g>
    <rect x={x - 30} y={y - 16} width={60} height={32} rx={5} fill="#1d2024" stroke={C.line} />
    <line x1={x} y1={y + 8} x2={x + cents * 1.2} y2={y - 8} stroke={cents === 0 ? C.good : C.bad} strokeWidth={2} />
    <text x={x} y={y + 25} textAnchor="middle" fontSize={8} fill={C.dim}>
      {label}
    </text>
    <text x={x + 26} y={y - 10} textAnchor="end" fontSize={8} fontWeight={700} fill={cents === 0 ? C.good : C.bad}>
      {cents === 0 ? "0¢" : `${cents > 0 ? "+" : ""}${cents}¢`}
    </text>
  </g>
);

/* ------------------------------------------------------------------ relief */

export function ReliefDiagram() {
  const xs = fretXs(46, 318, 21);
  const sag = 11; // exaggerated
  const boardY = (x: number) => 130 + sag * Math.sin((Math.PI * Math.min(Math.max(x - xs[1]!, 0), xs[21]! - xs[1]!)) / (xs[21]! - xs[1]!));
  const top = (i: number) => boardY(xs[i]!) - 6;
  const s0 = { x: xs[1]!, y: top(1) - 1 };
  const s1 = { x: xs[21]!, y: top(21) - 1 };
  const sy = (x: number) => s0.y + ((x - s0.x) / (s1.x - s0.x)) * (s1.y - s0.y);
  const board = Array.from({ length: 61 }, (_, i) => {
    const x = 36 + (i * 284) / 60;
    return `${i ? "L" : "M"} ${x} ${boardY(x)}`;
  }).join(" ");
  const f8 = xs[8]!;
  return (
    <Figure
      title="Measure neck relief"
      how={[
        "Tune to pitch in playing position, then put a capo at the 1st fret.",
        "Hold the low E down at the last fret (or where the neck meets the body). The string is now a straight edge.",
        "Slide a feeler gauge between the string and the top of the 8th fret (some makers use the 7th). The thickest blade that slips in without lifting the string is your relief.",
        "Compare with your spec — e.g. Fender 0.010 in (0.25 mm) on a 9.5–12 in radius neck. More gap = more forward bow: tighten the rod. No gap / string touching = back-bow: loosen it.",
      ]}
      note="The bow is drawn hugely exaggerated — real relief is about the thickness of two or three sheets of paper."
    >
      {/* headstock, neck and body */}
      <path d="M 8 118 L 30 124 L 30 150 L 8 146 Z" fill={C.woodDarkFill} />
      <path d={`${board} L 320 162 L 36 162 Z`} fill={C.woodFill} stroke={C.woodDark} />
      <path d="M 300 120 Q 330 110 352 120 L 352 175 L 300 175 Z" fill={C.woodDarkFill} opacity={0.7} />
      <T x={330} y={186} anchor="middle" size={8}>body</T>
      <rect x={30} y={115} width={7} height={18} fill="#f1ead8" stroke={C.line} />
      {xs.slice(1).map((x, i) => (
        <Fret key={i} x={x} y={boardY(x)} />
      ))}
      <line x1={12} y1={110} x2={33} y2={115} stroke={C.string} strokeWidth={1.8} />
      <line x1={33} y1={115} x2={s0.x} y2={s0.y} stroke={C.string} strokeWidth={1.8} />
      <Hl n={[2, 3]}>
        <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} stroke={C.string} strokeWidth={1.8} />
      </Hl>
      <T x={s0.x} y={176} anchor="middle" size={9}>1st</T>
      <T x={f8} y={176} anchor="middle" size={9} color={C.ink} weight={700}>8th fret</T>
      <T x={s1.x} y={176} anchor="middle" size={9}>last fret</T>

      <Hl n={1}>
        <Capo x={s0.x} y={s0.y} />
      </Hl>
      <Tag x={s0.x - 8} y={70} n={1}>capo on the 1st fret</Tag>
      <Tag x={s0.x - 8} y={48} n={1} color={C.good}>tuned to pitch</Tag>
      <N n={1} x={s0.x} y={92} />

      <Hl n={2}>
        <Finger x={s1.x} y={s1.y - 1} />
      </Hl>
      <Tag x={s1.x + 8} y={70} n={2} anchor="end">press at the last fret</Tag>
      <T x={180} y={sy(180) - 9} anchor="middle" size={9} color={C.accent} weight={700} n={2}>
        string = straight edge
      </T>
      <N n={2} x={s1.x} y={92} />

      <Hl n={3}>
        <rect x={f8 - 2} y={sy(f8) + 1.2} width={4} height={top(8) - sy(f8) - 1.6} fill={C.accent} />
      </Hl>
      <Zoom n={[3, 4]} x={262} y={60} r={36} cx={f8} cy={(sy(f8) + top(8)) / 2} scale={2.6} label="8th fret, close up" labelAt="above">
        <rect x={f8 - 20} y={boardY(f8)} width={40} height={10} fill={C.woodFill} />
        <Fret x={f8} y={boardY(f8)} />
        <line x1={f8 - 20} y1={sy(f8 - 20)} x2={f8 + 20} y2={sy(f8 + 20)} stroke={C.string} strokeWidth={1.4} />
        <rect x={f8 - 9} y={sy(f8) + 1.1} width={18} height={top(8) - sy(f8) - 1.4} fill={C.accent} opacity={0.85} />
        <text x={f8 - 8} y={sy(f8) + 4.5} fontSize={3} fontWeight={700} fill="#222">.010</text>
      </Zoom>
      <Tag x={f8 - 6} y={70} n={3} anchor="end">feeler gauge</Tag>
      <N n={3} x={f8} y={92} />

      <Gap x={f8 - 12} y1={sy(f8) + 1} y2={top(8)} label="relief" side="left" n={4} />
      <Tag x={10} y={26} n={4}>Fender 9.5–12 in: 0.010 in</Tag>
      <Tag x={10} y={48} n={4} color={C.good}>too much → tighten ↻</Tag>
      <Tag x={10} y={70} n={4} color={C.bad}>none → loosen ↺</Tag>
      <N n={4} x={170} y={92} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ action */

export function ActionDiagram() {
  const f = 175;
  const stringAt = (x: number) => 112 - (x - 20) * 0.04;
  const sF = stringAt(f);
  return (
    <Figure
      title="Measure the action (string height)"
      how={[
        "Tune to pitch, no capo. Find your maker's reference fret: Fender 17th, Gibson / PRS / Taylor / Martin 12th, Ibanez 14th.",
        "Stand a steel rule on top of that fret — on the metal, not the wood — next to the string. Use a rule whose zero is the very end of the blade.",
        "Get your eye level with the string and read the mark at the BOTTOM of the string.",
        "Do the low E and the high E. Write both down in 64ths of an inch or mm (1/64 in = 0.4 mm).",
      ]}
      note="Fender 9.5–12 in radius: 4/64 in (1.6 mm) at the 17th fret on both E strings. Gibson Les Paul (DeCola): 5/64 in low E, 3/64 in high E at the 12th."
    >
      <rect x={10} y={150} width={340} height={22} fill={C.woodFill} stroke={C.woodDark} />
      {[60, f, 280].map((x) => (
        <Hl key={x} n={x === f ? 1 : 99}>
          <Fret x={x} y={150} w={7} h={9} />
        </Hl>
      ))}
      <T x={f} y={184} anchor="middle" size={9} color={C.ink} weight={700}>reference fret</T>
      <Tag x={f} y={30} n={1} anchor="middle">Fender 17th · Gibson 12th · Ibanez 14th</Tag>
      <N n={1} x={f - 24} y={160} />
      <line x1={10} y1={stringAt(10)} x2={350} y2={stringAt(350)} stroke={C.string} strokeWidth={2.6} />
      <At n={4}>
        <line x1={10} y1={stringAt(10) + 12} x2={350} y2={stringAt(350) + 15} stroke={C.string} strokeWidth={1.4} opacity={0.8} />
        <T x={16} y={stringAt(10) + 4} size={8}>low E</T>
        <T x={16} y={stringAt(10) + 20} size={8}>high E (lower)</T>
      </At>
      <Hl n={[2, 3]}>
        <rect x={f + 5} y={40} width={22} height={101} fill="#d7dbe0" stroke={C.line} />
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1={f + 5} y1={141 - i * 8} x2={f + 5 + (i % 4 === 0 ? 11 : 6)} y2={141 - i * 8} stroke="#333" strokeWidth={1} />
        ))}
      </Hl>
      <Tag x={f + 32} y={60} n={2}>end of rule ON the fret</Tag>
      <N n={2} x={f + 46} y={130} />
      <Hl n={3}>
        <Eye x={300} y={sF} />
        <line x1={286} y1={sF} x2={f + 28} y2={sF} stroke={C.ink} strokeDasharray="3 3" />
      </Hl>
      <Zoom n={3} x={80} y={56} r={34} cx={f + 8} cy={sF + 3} scale={3.4} label="read at the string's underside" labelAt="above">
        <rect x={f + 5} y={sF - 14} width={22} height={30} fill="#d7dbe0" />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={f + 5} y1={sF + 13 - i * 4} x2={f + 9 + (i % 2) * 4} y2={sF + 13 - i * 4} stroke="#333" strokeWidth={0.5} />
        ))}
        <line x1={f - 10} y1={sF} x2={f + 30} y2={sF} stroke={C.string} strokeWidth={2.6} />
        <line x1={f} y1={sF + 1.3} x2={f + 30} y2={sF + 1.3} stroke={C.accent} strokeWidth={0.5} />
      </Zoom>
      <N n={3} x={320} y={sF - 22} />
      <Gap x={f - 12} y1={sF + 1.3} y2={141} label="action" side="left" n={[3, 4]} />
      <Tag x={340} y={30} n={4} anchor="end">write down: low E __ · high E __</Tag>
      <N n={4} x={330} y={130} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ nut */

export function NutCheckDiagram() {
  const f = [125, 185, 238];
  const nutTop = 113;
  const pressY = 121;
  const y = (x: number) => nutTop + ((x - 60) / (f[2]! - 60)) * (pressY - nutTop);
  const mini = (x: number, gap: number, label: string, color: string) => (
    <g>
      <rect x={x - 34} y={36} width={68} height={10} fill={C.woodFill} />
      <Fret x={x} y={36} w={5} h={5} />
      <line x1={x - 34} y1={31 - gap} x2={x + 34} y2={31 - gap + 2} stroke={C.string} strokeWidth={1.6} />
      <T x={x} y={58} anchor="middle" size={8} color={color} weight={700}>
        {label}
      </T>
    </g>
  );
  return (
    <Figure
      title="Check the nut slots: the 3rd-fret test"
      how={[
        "Press one string down just behind the 3rd fret.",
        "Look at the gap between the string and the top of the 1st fret.",
        "A very small but visible gap = good. No gap (string touches fret 1) = slot too low: open string buzzes. A big gap = slot too high: first position feels stiff and chords go sharp.",
        "Do every string. Wound strings sit a little higher than plain ones.",
      ]}
      note="StewMac's target for open strings over the 1st fret: plain 0.007–0.012 in, wound 0.013–0.020 in."
    >
      <path d="M 6 118 L 58 124 L 58 150 L 6 146 Z" fill={C.woodDarkFill} />
      <rect x={58} y={127} width={292} height={23} fill={C.woodFill} stroke={C.woodDark} />
      <rect x={52} y={nutTop} width={9} height={37} fill="#f1ead8" stroke={C.line} />
      <T x={56} y={101} anchor="middle" size={9}>nut</T>
      {f.map((x, i) => (
        <g key={x}>
          <Hl n={i === 0 ? 2 : i === 2 ? 1 : 99}>
            <Fret x={x} y={127} w={6} h={7} />
          </Hl>
          <T x={x} y={170} anchor="middle" size={9}>
            {["1st", "2nd", "3rd"][i]} fret
          </T>
        </g>
      ))}
      <line x1={8} y1={nutTop - 8} x2={56} y2={nutTop} stroke={C.string} strokeWidth={2} />
      <line x1={56} y1={nutTop} x2={f[2]! - 4} y2={pressY} stroke={C.string} strokeWidth={2} />
      <line x1={f[2]! - 4} y1={pressY} x2={350} y2={pressY - 16} stroke={C.string} strokeWidth={2} />
      <Hl n={1}>
        <Finger x={f[2]! - 8} y={pressY} />
      </Hl>
      <Tag x={f[2]! + 10} y={50} n={1} anchor="middle">press just behind the 3rd fret</Tag>
      <N n={1} x={f[2]! - 8} y={80} />
      <Zoom n={2} x={300} y={64} r={36} cx={f[0]!} cy={y(f[0]!) + 3} scale={4} label="gap over the 1st fret" labelAt="above">
        <rect x={f[0]! - 15} y={127} width={30} height={10} fill={C.woodFill} />
        <Fret x={f[0]!} y={127} w={6} h={7} />
        <line x1={f[0]! - 15} y1={y(f[0]! - 15)} x2={f[0]! + 15} y2={y(f[0]! + 15)} stroke={C.string} strokeWidth={2} />
      </Zoom>
      <N n={2} x={f[0]!} y={92} />
      <At n={3}>
        {mini(70, 2, "small gap: good", C.good)}
        {mini(180, -0.5, "touching: too low", C.bad)}
        {mini(290, 9, "big gap: too high", C.bad)}
      </At>
      <N n={3} x={20} y={30} />
      <Tag x={120} y={92} n={4}>repeat on every string — wound sit higher</Tag>
      <N n={4} x={102} y={92} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ truss rod */

const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => `${cx + r * Math.cos((Math.PI / 3) * i)},${cy + r * Math.sin((Math.PI / 3) * i)}`).join(" ");

export function TrussRodDiagram() {
  const panel = (x0: number, bow: number, title: string, n: number) => {
    const pts = Array.from({ length: 21 }, (_, i) => `${i ? "L" : "M"} ${x0 + 10 + i * 7.5} ${88 + bow * Math.sin((Math.PI * i) / 20)}`).join(" ");
    return (
      <g>
        <T x={x0 + 85} y={18} anchor="middle" color={C.ink} weight={700}>
          {title}
        </T>
        <T x={x0 + 85} y={112} anchor="middle" size={9}>
          {bow > 0 ? "high action mid-neck" : "buzz low on the neck"}
        </T>
        <Hl n={[n, 4]}>
        <line x1={x0 + 10} y1={78} x2={x0 + 160} y2={78} stroke={C.string} strokeWidth={1.6} />
        <path d={pts} fill="none" stroke={C.woodDark} strokeWidth={9} strokeLinecap="round" />
        <path d={pts} fill="none" stroke={C.wood} strokeWidth={5} strokeLinecap="round" />
        </Hl>
      </g>
    );
  };
  return (
    <Figure
      viewBox="0 0 360 210"
      title="Which way to turn the truss rod"
      how={[
        "Too much relief (neck bowed forward, high action mid-neck): TIGHTEN — turn the rod nut clockwise.",
        "Back-bow (neck bowed back, buzzing low on the neck, no relief): LOOSEN — turn anticlockwise.",
        "Clockwise means as you look straight at the nut you're turning — that holds whether the nut is at the headstock or at the heel.",
        "Go 1/8 turn at a time (rarely more than 1/4), retune, wait a few minutes (longer on old necks), and measure again.",
      ]}
      note="Slacken the strings a little before tightening. If the nut is very stiff, stop — forcing it can strip it or snap the rod."
    >
      {panel(5, 11, "Too much relief", 1)}
      {panel(190, -11, "Back-bow", 2)}
      <At n={1}>
        <polygon points={hex(90, 152, 13)} fill={C.metalFill} stroke={C.line} />
        <circle cx={90} cy={152} r={5} fill="#2a2d31" />
        <Turn cx={90} cy={152} r={22} cw color={C.good} />
        <Tag x={90} y={196} anchor="middle" color={C.good}>tighten: clockwise ↻</Tag>
      </At>
      <At n={2}>
        <polygon points={hex(275, 152, 13)} fill={C.metalFill} stroke={C.line} />
        <circle cx={275} cy={152} r={5} fill="#2a2d31" />
        <Turn cx={275} cy={152} r={22} cw={false} color={C.bad} />
        <Tag x={275} y={196} anchor="middle" color={C.bad}>loosen: anticlockwise ↺</Tag>
      </At>
      <At n={3}>
        <rect x={10} y={130} width={340} height={76} rx={8} fill="var(--color-card)" stroke={C.line} />
        <Eye x={60} y={168} />
        <line x1={76} y1={168} x2={150} y2={168} stroke={C.ink} strokeDasharray="3 3" />
        <polygon points={hex(180, 168, 16)} fill={C.metalFill} stroke={C.line} />
        <circle cx={180} cy={168} r={6} fill="#2a2d31" />
        <Turn cx={180} cy={168} r={26} cw color={C.good} />
        <T x={214} y={150} size={9} color={C.ink} weight={700}>look straight at the nut:</T>
        <T x={214} y={166} size={9}>clockwise = tighten,</T>
        <T x={214} y={180} size={9}>at the headstock or the heel</T>
      </At>
      <At n={4}>
        <rect x={20} y={130} width={320} height={76} rx={8} fill="var(--color-card)" stroke={C.line} />
        <circle cx={70} cy={168} r={24} fill="#2a2d31" stroke={C.line} />
        <path d="M 70 168 L 70 144 A 24 24 0 0 1 87 151 Z" fill={C.accent} />
        <T x={70} y={200} anchor="middle" size={9} color={C.accent} weight={700}>1/8 turn</T>
        <T x={110} y={150} size={9} color={C.ink}>1. turn 1/8</T>
        <T x={110} y={166} size={9} color={C.ink}>2. retune</T>
        <T x={110} y={182} size={9} color={C.ink}>3. wait a few minutes</T>
        <T x={230} y={150} size={9} color={C.ink}>4. measure relief again</T>
        <T x={230} y={166} size={9} color={C.bad}>never force a stiff nut</T>
      </At>
      <N n={1} x={20} y={18} />
      <N n={2} x={205} y={18} />
      <N n={3} x={36} y={145} />
      <N n={4} x={36} y={145} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ intonation */

export function IntonationDiagram() {
  return (
    <Figure
      title="Set intonation (saddle forward or back)"
      how={[
        "Fit fresh strings and tune the open string exactly.",
        "Play the 12th-fret harmonic, then the fretted note at the 12th fret, and read both on a tuner.",
        "Fretted note SHARP → move the saddle BACK, away from the neck (longer string). Fretted note FLAT → move it FORWARD, toward the neck.",
        "Retune after every move and check again until both read the same. Do every string.",
      ]}
      note="Saddles usually end up in a stagger: thicker strings further back. Set intonation after the action, because changing height changes intonation."
    >
      <rect x={20} y={86} width={170} height={44} fill={C.woodFill} stroke={C.woodDark} />
      <rect x={14} y={86} width={7} height={44} fill="#f1ead8" stroke={C.line} />
      <T x={17} y={78} anchor="middle" size={9}>nut</T>
      <Hl n={2}>
        <rect x={182} y={82} width={5} height={52} fill={C.metalFill} />
      </Hl>
      <T x={185} y={146} anchor="middle" size={9} color={C.ink} weight={700}>12th fret (halfway)</T>
      <rect x={196} y={96} width={140} height={30} rx={6} fill={C.woodDarkFill} opacity={0.5} />
      <T x={300} y={146} anchor="middle" size={9}>bridge</T>
      <Hl n={3}>
        <rect x={262} y={98} width={26} height={24} rx={3} fill={C.metalFill} stroke={C.line} />
        <line x1={288} y1={110} x2={330} y2={110} stroke="#8d939b" strokeWidth={2} />
        <circle cx={331} cy={110} r={3.5} fill="#8d939b" />
      </Hl>
      <T x={275} y={92} anchor="middle" size={8}>saddle</T>
      <T x={331} y={124} anchor="middle" size={8}>screw</T>
      <line x1={18} y1={108} x2={275} y2={108} stroke={C.string} strokeWidth={2} />
      <At n={1}>
        <Tuner x={90} y={40} cents={0} label="open string" />
        <Tag x={150} y={36}>fresh strings, tuned</Tag>
      </At>
      <At n={2}>
        <Tuner x={110} y={38} cents={0} label="12th harmonic" />
        <Tuner x={250} y={38} cents={8} label="12th fretted" />
        <Tag x={180} y={70} anchor="middle">compare the two</Tag>
      </At>
      <At n={3}>
        <Arrow x1={292} y1={74} x2={326} y2={74} color={C.bad} />
        <T x={309} y={62} anchor="middle" color={C.bad} weight={700} size={9}>sharp → back</T>
        <Arrow x1={258} y1={74} x2={224} y2={74} color={C.good} />
        <T x={241} y={62} anchor="middle" color={C.good} weight={700} size={9}>flat → forward</T>
        <Turn cx={331} cy={110} r={11} cw />
      </At>
      <At n={4}>
        <Tuner x={110} y={38} cents={0} label="12th harmonic" />
        <Tuner x={250} y={38} cents={0} label="12th fretted" />
        <Tag x={180} y={70} anchor="middle" color={C.good}>both the same = done</Tag>
      </At>
      <N n={1} x={20} y={36} />
      <N n={2} x={185} y={168} />
      <N n={3} x={275} y={168} />
      <N n={4} x={20} y={36} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ radius */

export function RadiusDiagram() {
  const cx = 180;
  const R = 300;
  const yTop = 126;
  const arcY = (x: number, lift = 0) => yTop - lift + (R - Math.sqrt(R * R - (x - cx) ** 2));
  const xsS = [84, 122, 161, 199, 238, 276];
  return (
    <Figure
      title="Match the strings to the fretboard radius"
      how={[
        "Set the two E strings to your action spec first.",
        "Rest an under-string radius gauge of your board's radius (e.g. 9.5 in) under the strings near the bridge pickup.",
        "Raise or lower each middle saddle until all six strings just touch the gauge — the strings now follow the same curve as the frets.",
        "Re-check the two E strings, then intonate.",
      ]}
      note="Common radii: vintage Fender 7.25 in, modern Fender 9.5 in, Gibson 12 in, many superstrats 15–17 in or compound."
    >
      <path d={`M 60 ${arcY(60)} ${Array.from({ length: 31 }, (_, i) => `L ${60 + i * 8} ${arcY(60 + i * 8)}`).join(" ")} L 300 182 L 60 182 Z`} fill={C.woodFill} stroke={C.woodDark} />
      <path d={`M 64 ${arcY(64, 2)} ${Array.from({ length: 30 }, (_, i) => `L ${64 + i * 8} ${arcY(64 + i * 8, 2)}`).join(" ")}`} fill="none" stroke={C.metal} strokeWidth={3} />
      <T x={180} y={166} anchor="middle" size={9} color={C.ink}>fretboard and fret (end view)</T>
      <At n={[2, 3]}>
        <path d={`M 70 ${arcY(70, 24)} ${Array.from({ length: 28 }, (_, i) => `L ${70 + i * 8} ${arcY(70 + i * 8, 24)}`).join(" ")}`} fill="none" stroke={C.accent} strokeWidth={6} opacity={0.55} />
      </At>
      <Tag x={180} y={40} n={2} anchor="middle">9.5 in radius gauge, under the strings</Tag>
      {xsS.map((x, i) => {
        const outer = i === 0 || i === 5;
        const off = !outer && (i === 2 ? 6 : i === 3 ? -4 : 0);
        return (
          <Hl key={x} n={outer ? [1, 4] : 3}>
            <circle cx={x} cy={arcY(x, 30) - (typeof off === "number" ? off : 0)} r={i < 3 ? 4 - i * 0.5 : 2.4 - (i - 3) * 0.35} fill={C.string} stroke="#999" />
          </Hl>
        );
      })}
      <At n={3}>
        <Arrow x1={161} y1={arcY(161, 30) - 8} x2={161} y2={arcY(161, 30) + 2} />
        <Arrow x1={199} y1={arcY(199, 30) + 14} x2={199} y2={arcY(199, 30) + 4} />
        <Tag x={180} y={40} anchor="middle">raise or lower each middle saddle to touch the gauge</Tag>
      </At>
      <At n={[1, 4]}>
        <Gap x={70} y1={arcY(84, 30)} y2={arcY(84)} side="left" label="spec" />
        <Gap x={290} y1={arcY(276, 30)} y2={arcY(276)} side="right" label="spec" />
      </At>
      <Tag x={180} y={40} anchor="middle" n={1}>set the low E and high E heights first</Tag>
      <Tag x={180} y={40} anchor="middle" n={4} color={C.good}>re-check both E strings, then intonate</Tag>
      <N n={1} x={84} y={70} />
      <N n={2} x={330} y={86} />
      <N n={3} x={180} y={64} />
      <N n={4} x={276} y={70} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ pickup height */

export function PickupHeightDiagram() {
  return (
    <Figure
      title="Set pickup height"
      how={[
        "Hold the low E and the high E down at the LAST fret (that's where the string sits closest to the pickup).",
        "Measure from the top of the pole piece to the bottom of the string, on the bass side and the treble side.",
        "Turn the pickup's height screws: clockwise lowers on most pickups. Bass side usually sits a little lower (further away) than the treble side.",
        "Listen: too close gives a warbly, out-of-tune sound on the low strings and buzz; too far is weak. Balance the pickups' volumes by ear.",
      ]}
      note="Fender American/Mexican Standard single coils: 5/64 in bass side, 4/64 in treble side. Fender humbuckers: 4/64 in. Seymour Duncan: start around 1/8 in bass, 1/16 in treble."
    >
      <rect x={30} y={146} width={300} height={10} rx={2} fill="#ece7da" stroke={C.line} />
      <T x={180} y={170} anchor="middle" size={8}>pickguard (end view, looking from the bridge)</T>
      <rect x={60} y={120} width={240} height={30} rx={6} fill="#ece7da" stroke={C.line} />
      {[85, 125, 165, 205, 245, 285].map((x) => (
        <circle key={x} cx={x - 5} cy={120} r={5.5} fill="#9aa1aa" stroke={C.line} />
      ))}
      <Hl n={3}>
        {[44, 316].map((x) => (
          <g key={x}>
            <line x1={x} y1={110} x2={x} y2={156} stroke="#8d939b" strokeWidth={3} />
            <ellipse cx={x} cy={108} rx={6} ry={3} fill="#c9cdd3" stroke={C.line} />
          </g>
        ))}
      </Hl>
      <Hl n={[1, 2]}>
        <circle cx={80} cy={84} r={4.2} fill={C.string} stroke="#999" />
        <circle cx={280} cy={98} r={2.6} fill={C.string} stroke="#999" />
      </Hl>
      <T x={80} y={70} anchor="middle" size={9}>low E</T>
      <T x={280} y={84} anchor="middle" size={9}>high E</T>
      <Tag x={180} y={28} n={1} anchor="middle">hold both E strings down at the LAST fret</Tag>
      <N n={1} x={180} y={52} />
      <Gap x={95} y1={88.5} y2={114.5} label="bass side" side="right" n={[2, 4]} />
      <Gap x={265} y1={100.8} y2={114.5} label="treble" side="left" n={[2, 4]} />
      <N n={2} x={180} y={100} />
      <At n={3}>
        <Turn cx={44} cy={98} r={10} cw />
        <Turn cx={316} cy={98} r={10} cw />
        <Tag x={180} y={28} anchor="middle">screws clockwise = pickup DOWN</Tag>
      </At>
      <N n={3} x={44} y={66} />
      <Tag x={180} y={28} n={4} anchor="middle">too close: warble & buzz · too far: weak</Tag>
      <N n={4} x={180} y={52} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ acoustic saddle 2:1 */

export function SaddleRuleDiagram() {
  const nut = { x: 20, y: 120 };
  const hi = { x: 330, y: 50 };
  const lo = { x: 330, y: 80 };
  const mid = (a: { x: number; y: number }) => nut.y + ((175 - nut.x) / (a.x - nut.x)) * (a.y - nut.y);
  return (
    <Figure
      title="Acoustic saddle: remove twice the change you want"
      how={[
        "Measure the action at the 12th fret (low E and high E).",
        "Decide how much lower you want it, then double it: lowering the 12th-fret action by 1/64 in means taking 1/32 in off the saddle (the 12th fret is halfway, so it moves half as much).",
        "Mark a line along the saddle's bottom, sand the bottom on sandpaper taped to a flat surface, keeping it flat and square. Never sand the top.",
        "Refit, tune, measure, and repeat in small steps. To raise the action, shim under the saddle or make a taller saddle.",
      ]}
      note="Frets.com and Taylor's 2:1 rule. Check humidity first: a dry guitar reads low and a damp one high."
    >
      <rect x={10} y={130} width={330} height={14} fill={C.woodFill} stroke={C.woodDark} />
      <T x={20} y={155} size={9}>nut</T>
      <T x={175} y={155} anchor="middle" size={9} color={C.ink}>12th fret</T>
      <Fret x={175} y={130} w={6} h={7} />
      <rect x={300} y={100} width={50} height={30} rx={3} fill={C.woodDarkFill} />
      <T x={325} y={160} anchor="middle" size={9}>bridge</T>
      <At n={[2, 3, 4]}>
        <rect x={326} y={hi.y} width={8} height={130 - hi.y} fill="#f1ead8" stroke={C.line} opacity={0.3} strokeDasharray="3 2" />
      </At>
      <At n={[2, 3, 4]}>
        <Hl n={[2, 3]}>
          <rect x={326} y={lo.y} width={8} height={130 - lo.y} fill="#f1ead8" stroke={C.line} />
        </Hl>
      </At>
      <At n={1}>
        <rect x={326} y={hi.y} width={8} height={130 - hi.y} fill="#f1ead8" stroke={C.line} />
        <line x1={nut.x} y1={nut.y} x2={hi.x} y2={hi.y} stroke={C.string} strokeWidth={2} />
      </At>
      <At n={[2, 3, 4]}>
        <line x1={nut.x} y1={nut.y} x2={hi.x} y2={hi.y} stroke={C.string} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.5} />
        <T x={300} y={44} anchor="end" size={8}>before</T>
      </At>
      <Hl n={[2, 4]}>
        <At n={[2, 3, 4]}>
          <line x1={nut.x} y1={nut.y} x2={lo.x} y2={lo.y} stroke={C.string} strokeWidth={2} />
        </At>
      </Hl>
      <At n={1}>
        <Gap x={168} y1={mid(hi)} y2={124} label="action" side="left" />
        <Tag x={180} y={30} anchor="middle">measure low E and high E at the 12th</Tag>
      </At>
      <At n={2}>
        <Gap x={348} y1={hi.y} y2={lo.y} label="2×" side="left" />
        <Gap x={160} y1={mid(hi)} y2={mid(lo)} label="1×" side="left" color={C.good} />
        <Tag x={180} y={30} anchor="middle">saddle 2× = action 1× at the 12th</Tag>
      </At>
      <At n={3}>
        <rect x={40} y={14} width={220} height={60} rx={6} fill="var(--color-card)" stroke={C.line} />
        <rect x={56} y={52} width={190} height={8} fill="#b9a988" />
        <T x={151} y={68} anchor="middle" size={8}>sandpaper taped to a flat surface</T>
        <rect x={110} y={26} width={80} height={26} rx={3} fill="#f1ead8" stroke={C.line} />
        <line x1={110} y1={46} x2={190} y2={46} stroke={C.bad} strokeDasharray="3 2" />
        <T x={196} y={46} size={8} color={C.bad}>pencil line</T>
        <Arrow x1={96} y1={40} x2={210} y2={40} both color={C.ink} w={1} />
      </At>
      <At n={4}>
        <Tag x={180} y={30} anchor="middle">refit, tune, measure — repeat in small steps</Tag>
        <Tag x={180} y={52} anchor="middle" color={C.good}>too low? shim it or make a taller saddle</Tag>
      </At>
      <N n={1} x={60} y={70} />
      <N n={2} x={260} y={100} />
      <N n={3} x={28} y={44} />
      <N n={4} x={30} y={80} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ neck shim */

export function NeckShimDiagram() {
  return (
    <Figure
      title="Neck shim / Micro-Tilt (bolt-on necks)"
      how={[
        "Only shim when the saddles have run out of adjustment: bottomed out with the action still too high, or cranked very high to get the action you want.",
        "Slacken the strings, take the neck off, and look for an old shim in the pocket.",
        "A shim under the heel END (the end nearest the bridge) tilts the neck back: the strings get closer to the frets, so you raise the saddles to get back to spec. Shim at the other end does the opposite.",
        "A full-pocket tapered shim supports the whole heel better than a small strip. Fender: a 0.010 in strip raises the action about 1/32 in; on Micro-Tilt necks, 1/4 turn of the hex screw does the same.",
      ]}
    >
      <rect x={150} y={100} width={200} height={60} fill={C.woodFill} stroke={C.woodDark} />
      <T x={300} y={175} anchor="middle" size={9}>body</T>
      <rect x={150} y={100} width={90} height={10} fill="var(--color-card)" />
      <T x={300} y={124} anchor="middle" size={9}>neck pocket</T>
      <At n={1}>
        <rect x={286} y={78} width={22} height={14} rx={2} fill={C.metalFill} stroke={C.line} />
        <line x1={292} y1={92} x2={292} y2={100} stroke="#8d939b" strokeWidth={2} />
        <line x1={302} y1={92} x2={302} y2={100} stroke="#8d939b" strokeWidth={2} />
        <T x={297} y={70} anchor="middle" size={8}>saddle</T>
        <Tag x={120} y={30} anchor="middle" color={C.bad}>saddle screwed all the way down…</Tag>
        <Tag x={120} y={52} anchor="middle" color={C.bad}>…and the action is still too high</Tag>
      </At>
      <Hl n={[2, 3]}>
        <g transform={`translate(0 ${0}) rotate(${-3} 240 100)`}>
          <rect x={10} y={84} width={230} height={16} rx={2} fill={C.woodDarkFill} />
        </g>
      </Hl>
      <At n={2}>
        <g transform="translate(0 -34)" opacity={0.6}>
          <rect x={10} y={84} width={230} height={16} rx={2} fill="none" stroke={C.ink} strokeDasharray="4 3" />
        </g>
        <Arrow x1={130} y1={82} x2={130} y2={58} color={C.ink} />
        <Tag x={300} y={60} anchor="middle">strings slack, neck off</Tag>
      </At>
      <rect x={10} y={84} width={230} height={16} fill="none" stroke={C.line} strokeDasharray="4 3" opacity={0.6} />
      <Hl n={3}>
        <polygon points="214,100 240,100 240,95.5" fill={C.accent} />
      </Hl>
      <At n={3}>
        <Arrow x1={210} y1={150} x2={228} y2={104} />
        <Tag x={200} y={150} anchor="end">shim under the heel end</Tag>
        <Arrow x1={22} y1={62} x2={22} y2={84} color={C.good} />
        <Tag x={36} y={56} color={C.good}>headstock end drops back</Tag>
      </At>
      <At n={4}>
        <rect x={20} y={14} width={320} height={56} rx={6} fill="var(--color-card)" stroke={C.line} />
        <polygon points="40,52 150,52 150,40" fill={C.accent} />
        <T x={95} y={62} anchor="middle" size={8} color={C.good} weight={700}>full-pocket taper: better</T>
        <rect x={232} y={44} width={24} height={8} fill={C.accent} />
        <T x={244} y={62} anchor="middle" size={8} color={C.dim}>small strip: quick fix</T>
        <T x={180} y={26} anchor="middle" size={9} color={C.ink}>0.010 in strip ≈ 1/32 in · Micro-Tilt 1/4 turn ≈ 1/32 in</T>
      </At>
      <N n={1} x={330} y={70} />
      <N n={2} x={175} y={44} />
      <N n={3} x={250} y={135} />
      <N n={4} x={340} y={88} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ trem */

export function TremFloatDiagram() {
  return (
    <Figure
      title="Strat-style trem: float and spring balance"
      how={[
        "The bridge pivots on its front screws (or two studs). String tension pulls the top forward; the springs in the back pull the block back.",
        "Floating: tune to pitch and measure the gap under the back edge of the bridge plate — Fender: about 1/8 in (3.2 mm) for a floating setup.",
        "Gap too big (back edge high) → screw the two claw screws IN (more spring pull). Gap too small → screw them OUT. Retune after every half turn — tuning and float move together.",
        "Decked (flat on the body): tune with the plate down, then Fender adds 1/2 turn to each claw screw so it stays down when you bend.",
      ]}
      note="Changing string gauge or tuning changes the balance; re-set the float afterwards. Three springs is the usual starting point."
    >
      <rect x={10} y={80} width={340} height={92} fill={C.woodFill} stroke={C.woodDark} />
      <rect x={60} y={120} width={250} height={42} rx={3} fill="#25282d" stroke={C.line} />
      <T x={185} y={186} anchor="middle" size={8}>side view — spring cavity in the back of the body</T>
      <g transform="rotate(-6 210 78)">
        <rect x={210} y={70} width={110} height={8} fill={C.metalFill} stroke={C.line} />
        <rect x={232} y={78} width={22} height={72} fill="#9aa1aa" stroke={C.line} />
      </g>
      <circle cx={210} cy={78} r={3} fill={C.ink} />
      <T x={204} y={92} anchor="end" size={8}>pivot</T>
      <line x1={120} y1={60} x2={318} y2={60} stroke={C.string} strokeWidth={1.6} />
      <Hl n={[1, 3]}>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M 238 ${132 + i * 8} ${Array.from({ length: 14 }, (_, k) => `L ${232 - k * 10} ${132 + i * 8 + (k % 2 ? -3 : 3)}`).join(" ")} L 92 ${132 + i * 8}`} fill="none" stroke={C.metal} strokeWidth={1.4} />
        ))}
      </Hl>
      <Hl n={3}>
        <rect x={80} y={126} width={10} height={26} fill={C.metalFill} stroke={C.line} />
        <line x1={72} y1={132} x2={44} y2={132} stroke={C.ink} strokeWidth={2.4} />
        <line x1={72} y1={146} x2={44} y2={146} stroke={C.ink} strokeWidth={2.4} />
      </Hl>
      <T x={85} y={116} anchor="middle" size={8}>claw</T>
      <At n={1}>
        <Arrow x1={200} y1={46} x2={150} y2={46} color={C.ink} />
        <T x={206} y={46} size={9} color={C.ink}>strings pull the top forward</T>
        <Arrow x1={170} y1={168} x2={110} y2={168} color={C.ink} />
        <T x={176} y={168} size={9} color={C.ink}>springs pull the block back</T>
      </At>
      <At n={2}>
        <Gap x={325} y1={67} y2={80} label="float" side="right" />
        <Tag x={300} y={26} anchor="end">Fender float: about 1/8 in at the back edge</Tag>
      </At>
      <At n={3}>
        <Turn cx={36} cy={139} r={11} cw />
        <Tag x={14} y={26}>gap too big → claw screws IN</Tag>
        <Tag x={14} y={48} color={C.bad}>gap too small → screws OUT</Tag>
      </At>
      <At n={4}>
        <g transform="rotate(6 210 78)" opacity={0.45}>
          <rect x={210} y={71} width={110} height={8} fill="none" stroke={C.good} strokeDasharray="3 2" />
        </g>
        <Tag x={14} y={26} color={C.good}>decked: plate flat on the body</Tag>
        <Tag x={14} y={48}>then +1/2 turn on each claw screw</Tag>
      </At>
      <N n={1} x={130} y={46} />
      <N n={2} x={345} y={40} />
      <N n={3} x={36} y={110} />
      <N n={4} x={150} y={100} />
    </Figure>
  );
}

export function FloydLevelDiagram() {
  return (
    <Figure
      title="Floyd Rose / Edge: level the bridge"
      how={[
        "Tune to pitch. Lay a straight edge or look along the base plate: it should sit parallel to the top of the body.",
        "Back (fine-tuner end) tipped UP = the strings are winning → turn the claw screws IN a little.",
        "Back tipped DOWN = the springs are winning → turn the claw screws OUT.",
        "Unlock the nut, retune, check again — small turns, many rounds. Lock the nut and use the fine tuners only once it's level.",
      ]}
      note="Action on a Floyd is set at the two front studs (no individual saddle heights). On Ibanez Edge bridges loosen the stud lock screws first."
    >
      <rect x={10} y={110} width={340} height={62} fill={C.woodFill} stroke={C.woodDark} />
      <T x={180} y={184} anchor="middle" size={8}>side view</T>
      <circle cx={75} cy={98} r={4} fill={C.ink} />
      <T x={70} y={80} anchor="middle" size={8}>knife edge on stud</T>
      <Hl n={1}>
        <line x1={50} y1={95} x2={320} y2={95} stroke={C.good} strokeDasharray="5 4" />
      </Hl>
      <Tag x={180} y={34} n={1} anchor="middle" color={C.good}>base plate parallel to the body</Tag>
      <g transform={undefined}>
        <rect x={70} y={88} width={210} height={10} fill={C.metalFill} stroke={C.line} />
        <rect x={150} y={98} width={40} height={60} fill="#9aa1aa" stroke={C.line} />
        {[250, 262, 274].map((x) => (
          <rect key={x} x={x - 3} y={78} width={6} height={10} rx={2} fill="#b8bec6" />
        ))}
      </g>
      <At n={2}>
        <g transform="rotate(-5 75 98)">
          <rect x={70} y={88} width={210} height={10} fill="none" stroke={C.bad} strokeWidth={1.5} strokeDasharray="3 2" />
        </g>
        <Arrow x1={290} y1={86} x2={290} y2={66} color={C.bad} />
        <Tag x={14} y={30}>tipped UP → claw screws IN</Tag>
      </At>
      <At n={3}>
        <g transform="rotate(4 75 98)">
          <rect x={70} y={88} width={210} height={10} fill="none" stroke={C.bad} strokeWidth={1.5} strokeDasharray="3 2" />
        </g>
        <Arrow x1={290} y1={100} x2={290} y2={118} color={C.bad} />
        <Tag x={14} y={30}>tipped DOWN → claw screws OUT</Tag>
      </At>
      <At n={4}>
        <Tag x={14} y={30}>unlock nut → retune → check level</Tag>
        <Tag x={14} y={52} color={C.good}>level? lock the nut, fine-tune</Tag>
      </At>
      <N n={1} x={330} y={60} />
      <N n={2} x={320} y={66} />
      <N n={3} x={320} y={126} />
      <N n={4} x={330} y={60} />
    </Figure>
  );
}

export function TomDiagram() {
  const strings = [
    { x: 92, dy: 0, r: 3.4 },
    { x: 129, dy: -6, r: 2.9 },
    { x: 166, dy: -9, r: 2.5 },
    { x: 203, dy: -9, r: 2 },
    { x: 240, dy: -6, r: 1.6 },
    { x: 277, dy: 0, r: 1.3 },
  ];
  return (
    <Figure
      title="Tune-o-matic: set the height at the thumbwheels"
      how={[
        "Slacken the strings a little (or use a bridge jack) so the posts don't lean while you turn the wheels.",
        "Turn the bass-side wheel to set the low E height and the treble-side wheel for the high E.",
        "Individual string heights come from the saddle notches and the bridge's radius — the wheels only move each side.",
        "Retune, measure at the 12th fret, then set intonation. The stopbar behind it doesn't change the action.",
      ]}
      note="Gibson Les Paul starting point (Jim DeCola): 5/64 in low E, 3/64 in high E at the 12th fret. Saddle intonation screws should face the pickups."
    >
      <rect x={10} y={146} width={340} height={36} fill={C.woodFill} stroke={C.woodDark} />
      <T x={180} y={192} anchor="middle" size={8}>front view, looking from the neck</T>
      <Hl n={3}>
        <path d="M 70 98 Q 184 76 298 98 L 298 114 L 70 114 Z" fill={C.metalFill} stroke={C.line} />
        {strings.map((s, i) => (
          <rect key={i} x={s.x - 9} y={94 + s.dy} width={18} height={10} rx={2} fill="#b8bec6" stroke={C.line} />
        ))}
      </Hl>
      {strings.map((s, i) => (
        <circle key={i} cx={s.x} cy={92 + s.dy - s.r} r={s.r} fill={C.string} stroke="#999" />
      ))}
      {[80, 288].map((x) => (
        <Hl key={x} n={2}>
          <rect x={x - 3} y={114} width={6} height={32} fill={C.metalFill} />
          <rect x={x - 15} y={116} width={30} height={9} rx={2} fill="#b8bec6" stroke={C.line} />
        </Hl>
      ))}
      <T x={60} y={121} anchor="end" size={8} color={C.ink}>bass wheel</T>
      <T x={308} y={121} size={8} color={C.ink}>treble wheel</T>
      <At n={1}>
        <Tag x={180} y={34} anchor="middle">slacken the strings a little (or use a bridge jack)</Tag>
        {strings.map((s, i) => (
          <Arrow key={i} x1={s.x} y1={68 + s.dy} x2={s.x} y2={82 + s.dy} color={C.accent} w={1.2} />
        ))}
      </At>
      <At n={2}>
        <Turn cx={80} cy={120} r={15} cw />
        <Turn cx={288} cy={120} r={15} cw />
        <Tag x={180} y={34} anchor="middle">bass wheel → low E height · treble wheel → high E</Tag>
      </At>
      <Tag x={180} y={34} anchor="middle" n={3}>the saddles' curve sets the strings in between</Tag>
      <At n={4}>
        <Tag x={180} y={34} anchor="middle">retune → measure at 12th → intonate</Tag>
        <Tag x={180} y={56} anchor="middle" color={C.dim}>stopbar height doesn't change action</Tag>
      </At>
      <N n={1} x={30} y={34} />
      <N n={2} x={184} y={134} />
      <N n={3} x={184} y={128} />
      <N n={4} x={30} y={34} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ acoustic bridge */

export function BridgeLiftDiagram() {
  return (
    <Figure
      title="Is the acoustic bridge lifting?"
      how={[
        "Tune to pitch. Look along the back edge of the bridge (the edge toward the end pin) with a light behind it.",
        "Try to slide a thin feeler gauge or a piece of paper under the back edge. It shouldn't go in at all.",
        "If it slides in more than a little, the glue joint is failing: slacken the strings to take the load off and have it reglued.",
        "Also look for a bulge behind the bridge and a dip in front of it (top belly), and check the action — both often come with a lifting bridge.",
      ]}
      note="Don't push glue into the gap: a proper reglue means removing the bridge, cleaning both surfaces and clamping it (luthier job)."
    >

      <rect x={10} y={120} width={340} height={30} fill={C.woodFill} stroke={C.woodDark} />
      <T x={30} y={164} size={9}>top (soundboard), side view</T>
      <T x={340} y={164} anchor="end" size={9}>end pin →</T>
      <Hl n={[1, 2]}>
        <polygon points="140,120 150,100 270,100 280,112 280,114 140,120" fill={C.woodDarkFill} />
      </Hl>
      <rect x={186} y={88} width={6} height={12} fill="#f1ead8" />
      <T x={205} y={80} anchor="middle" size={9}>bridge</T>
      <line x1={20} y1={92} x2={189} y2={88} stroke={C.string} strokeWidth={1.5} />
      <At n={1}>
        <circle cx={330} cy={60} r={9} fill="#f6e27a" />
        <line x1={322} y1={66} x2={286} y2={110} stroke="#f6e27a" strokeWidth={1} strokeDasharray="2 2" />
        <Zoom x={80} y={56} r={30} cx={276} cy={116} scale={4} label="light under the back edge = gap" labelAt="above">
          <rect x={250} y={120} width={40} height={10} fill={C.woodFill} />
          <polygon points="250,104 280,112 280,114 250,120" fill={C.woodDarkFill} />
          <polygon points="262,119 280,114 280,120" fill="#f6e27a" opacity={0.8} />
        </Zoom>
      </At>
      <At n={2}>
        <polygon points="262,119 296,117 296,121 262,121" fill={C.accent} />
        <Arrow x1={330} y1={96} x2={298} y2={116} />
        <Tag x={340} y={84} anchor="end">feeler or paper</Tag>
        <Tag x={20} y={40} color={C.good}>won't go in = OK</Tag>
        <Tag x={20} y={62} color={C.bad}>slides in = lifting</Tag>
      </At>
      <At n={3}>
        <Tag x={180} y={40} anchor="middle" color={C.bad}>slacken the strings now</Tag>
        <Tag x={180} y={62} anchor="middle">then have the bridge reglued (luthier)</Tag>
      </At>
      <At n={4}>
        <path d="M 30 120 Q 90 128 140 121 M 280 119 Q 315 106 345 119" fill="none" stroke={C.bad} strokeWidth={2} strokeDasharray="4 3" />
        <Tag x={300} y={70} anchor="middle" color={C.bad}>bulge behind the bridge?</Tag>
        <Arrow x1={300} y1={80} x2={312} y2={108} color={C.bad} />
        <Tag x={80} y={70} anchor="middle" color={C.bad}>dip in front?</Tag>
        <Arrow x1={80} y1={80} x2={86} y2={118} color={C.bad} />
        <Tag x={180} y={40} anchor="middle">check the action too</Tag>
      </At>
      <N n={1} x={150} y={60} />
      <N n={2} x={300} y={140} />
      <N n={3} x={100} y={100} />
      <N n={4} x={30} y={40} />
    </Figure>
  );
}
