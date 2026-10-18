/** Setup diagrams: relief, action, nut, truss rod, intonation, radius, pickup height, saddle, neck angle, bridges. */
import { Arrow, C, Figure, fretXs, Gap, N, T, Turn } from "./kit";

/* ------------------------------------------------------------------ relief */

export function ReliefDiagram() {
  const xs = fretXs(40, 330, 21);
  const sag = 11; // exaggerated
  const boardY = (x: number) => 128 + sag * Math.sin((Math.PI * (x - xs[1]!)) / (xs[21]! - xs[1]!));
  const fretTop = (i: number) => boardY(xs[i]!) - 6;
  const s0 = { x: xs[1]!, y: fretTop(1) - 1 };
  const s1 = { x: xs[21]!, y: fretTop(21) - 1 };
  const stringY = (x: number) => s0.y + ((x - s0.x) / (s1.x - s0.x)) * (s1.y - s0.y);
  const board = Array.from({ length: 61 }, (_, i) => {
    const x = 30 + (i * 305) / 60;
    return `${i ? "L" : "M"} ${x} ${x < xs[1]! ? boardY(xs[1]!) : x > xs[21]! ? boardY(xs[21]!) : boardY(x)}`;
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
      <path d={`${board} L 335 160 L 30 160 Z`} fill={C.wood} stroke={C.woodDark} />
      <rect x={22} y={113} width={9} height={20} fill="#f1ead8" stroke={C.line} />
      <T x={26} y={104} anchor="middle">nut</T>
      {xs.slice(1).map((x, i) => (
        <rect key={i} x={x - 1.5} y={fretTop(i + 1)} width={3} height={6} rx={1} fill={C.metal} />
      ))}
      <line x1={26} y1={113} x2={s0.x} y2={s0.y} stroke={C.string} strokeWidth={1.6} />
      <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} stroke={C.string} strokeWidth={1.6} />
      {/* capo */}
      <rect x={s0.x - 7} y={s0.y - 16} width={14} height={14} rx={3} fill={C.dim} />
      <N n={1} x={s0.x} y={s0.y - 28} />
      {/* finger */}
      <ellipse cx={s1.x} cy={s1.y - 9} rx={9} ry={7} fill="#d9a77c" stroke={C.woodDark} />
      <N n={2} x={s1.x} y={s1.y - 28} />
      {/* feeler gauge at 8th */}
      <rect x={f8 - 2} y={stringY(f8) + 1.5} width={4} height={fretTop(8) - stringY(f8) - 2} fill={C.accent} opacity={0.9} />
      <line x1={f8} y1={stringY(f8) + 2} x2={f8 + 40} y2={58} stroke={C.accent} strokeWidth={1} strokeDasharray="2 2" />
      <T x={f8 + 43} y={56} color={C.accent} weight={700}>feeler gauge</T>
      <Gap x={f8 - 12} y1={stringY(f8) + 1} y2={fretTop(8)} label="relief" side="left" />
      <N n={3} x={f8} y={stringY(f8) - 20} />
      <T x={f8} y={175} anchor="middle">8th fret</T>
      <T x={s0.x} y={175} anchor="middle">1st</T>
      <T x={s1.x} y={175} anchor="middle">last fret</T>
      <N n={4} x={300} y={40} />
      <T x={290} y={40} anchor="end" color={C.ink}>gap = relief</T>
    </Figure>
  );
}

/* ------------------------------------------------------------------ action */

export function ActionDiagram() {
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
      <rect x={20} y={150} width={320} height={22} fill={C.wood} stroke={C.woodDark} />
      {[70, 175, 270].map((x) => (
        <rect key={x} x={x - 3} y={140} width={6} height={10} rx={2} fill={C.metal} />
      ))}
      <T x={175} y={185} anchor="middle">reference fret</T>
      <line x1={20} y1={112} x2={340} y2={100} stroke={C.string} strokeWidth={2.5} />
      {/* rule */}
      <rect x={180} y={40} width={22} height={100} fill="#d7dbe0" stroke={C.line} />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={180} y1={140 - i * 8} x2={180 + (i % 4 === 0 ? 10 : 5)} y2={140 - i * 8} stroke="#333" strokeWidth={1} />
      ))}
      <N n={2} x={215} y={135} />
      <Gap x={165} y1={107.5} y2={140} label="action" side="left" />
      {/* eye */}
      <ellipse cx={300} cy={107} rx={14} ry={7} fill="none" stroke={C.ink} />
      <circle cx={300} cy={107} r={3} fill={C.ink} />
      <line x1={286} y1={107} x2={204} y2={107} stroke={C.ink} strokeDasharray="3 3" />
      <N n={3} x={318} y={88} />
      <N n={1} x={175} y={160} />
      <N n={4} x={40} y={80} />
      <T x={52} y={80} color={C.ink}>low E & high E</T>
    </Figure>
  );
}

/* ------------------------------------------------------------------ nut */

export function NutCheckDiagram() {
  const f = [125, 185, 238];
  const nutTop = 113;
  const pressY = 121;
  const y = (x: number) => nutTop + ((x - 60) / (f[2]! - 60)) * (pressY - nutTop);
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
      <path d="M 10 120 L 60 120 L 60 150 L 10 150 Z" fill={C.woodDark} />
      <rect x={60} y={127} width={290} height={23} fill={C.wood} stroke={C.woodDark} />
      <rect x={54} y={nutTop} width={9} height={37} fill="#f1ead8" stroke={C.line} />
      <T x={58} y={101} anchor="middle">nut</T>
      {f.map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y={121} width={6} height={6} rx={2} fill={C.metal} />
          <T x={x} y={170} anchor="middle">{["1st", "2nd", "3rd"][i]} fret</T>
        </g>
      ))}
      <line x1={10} y1={nutTop - 6} x2={58} y2={nutTop} stroke={C.string} strokeWidth={2} />
      <line x1={58} y1={nutTop} x2={f[2]!} y2={pressY} stroke={C.string} strokeWidth={2} />
      <line x1={f[2]!} y1={pressY} x2={350} y2={pressY - 18} stroke={C.string} strokeWidth={2} />
      <ellipse cx={f[2]! - 9} cy={pressY - 10} rx={10} ry={8} fill="#d9a77c" stroke={C.woodDark} />
      <N n={1} x={f[2]! - 9} y={pressY - 32} />
      <Gap x={f[0]! + 14} y1={y(f[0]!) + 1} y2={121} side="right" />
      <circle cx={f[0]!} cy={119} r={13} fill="none" stroke={C.accent} strokeWidth={1.5} />
      <N n={2} x={f[0]! + 10} y={85} />
      <T x={f[0]! + 22} y={85} color={C.ink}>small gap here</T>
      <N n={3} x={300} y={80} />
      <N n={4} x={300} y={55} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ truss rod */

export function TrussRodDiagram() {
  const panel = (x0: number, bow: number, title: string, fix: string, cw: boolean, color: string) => {
    const pts = Array.from({ length: 21 }, (_, i) => {
      const x = x0 + 10 + i * 7.5;
      return `${i ? "L" : "M"} ${x} ${110 + bow * Math.sin((Math.PI * i) / 20)}`;
    }).join(" ");
    return (
      <g>
        <T x={x0 + 85} y={22} anchor="middle" color={C.ink} weight={700}>
          {title}
        </T>
        <line x1={x0 + 10} y1={100} x2={x0 + 160} y2={100} stroke={C.string} strokeWidth={1.6} />
        <path d={pts} fill="none" stroke={C.woodDark} strokeWidth={8} strokeLinecap="round" />
        <T x={x0 + 85} y={140} anchor="middle">
          {bow > 0 ? "string far from frets mid-neck" : "frets push up into the string"}
        </T>
        <polygon points={hex(x0 + 85, 172, 10)} fill={C.metal} stroke={C.line} />
        <Turn cx={x0 + 85} cy={172} r={17} cw={cw} color={color} />
        <T x={x0 + 85} y={198} anchor="middle" color={color} weight={700}>
          {fix}
        </T>
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
      {panel(5, 10, "Too much relief", "tighten ↻ clockwise", true, C.good)}
      {panel(190, -10, "Back-bow", "loosen ↺ anticlockwise", false, C.bad)}
    </Figure>
  );
}
const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => `${cx + r * Math.cos((Math.PI / 3) * i)},${cy + r * Math.sin((Math.PI / 3) * i)}`).join(" ");

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
      <rect x={20} y={70} width={170} height={60} fill={C.wood} stroke={C.woodDark} />
      <rect x={14} y={70} width={7} height={60} fill="#f1ead8" stroke={C.line} />
      <T x={17} y={60} anchor="middle">nut</T>
      <rect x={182} y={66} width={5} height={68} fill={C.metal} />
      <T x={185} y={56} anchor="middle" color={C.ink} weight={700}>12th fret</T>
      <T x={185} y={146} anchor="middle">(halfway)</T>
      <rect x={270} y={88} width={26} height={24} rx={3} fill={C.metal} stroke={C.line} />
      <T x={283} y={125} anchor="middle">saddle</T>
      <line x1={18} y1={100} x2={283} y2={100} stroke={C.string} strokeWidth={2} />
      <Arrow x1={300} y1={78} x2={330} y2={78} color={C.bad} />
      <T x={318} y={64} anchor="middle" color={C.bad} weight={700} size={9}>sharp: back</T>
      <Arrow x1={266} y1={78} x2={236} y2={78} color={C.good} />
      <T x={246} y={64} anchor="middle" color={C.good} weight={700} size={9}>flat: forward</T>
      <N n={1} x={40} y={160} />
      <N n={2} x={185} y={172} />
      <N n={3} x={283} y={160} />
      <N n={4} x={235} y={172} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ radius */

export function RadiusDiagram() {
  const cx = 180;
  const R = 300; // drawing radius
  const yTop = 120;
  const arcY = (x: number, lift = 0) => yTop - lift + (R - Math.sqrt(R * R - (x - cx) ** 2));
  const xsS = [80, 120, 160, 200, 240, 280];
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
      <path d={`M 60 ${arcY(60)} ${Array.from({ length: 31 }, (_, i) => `L ${60 + i * 8} ${arcY(60 + i * 8)}`).join(" ")} L 300 175 L 60 175 Z`} fill={C.wood} stroke={C.woodDark} />
      <T x={180} y={160} anchor="middle" color={C.ink}>fretboard (end view)</T>
      <path d={`M 66 ${arcY(66, 26)} ${Array.from({ length: 29 }, (_, i) => `L ${66 + i * 8} ${arcY(66 + i * 8, 26)}`).join(" ")}`} fill="none" stroke={C.accent} strokeWidth={5} opacity={0.5} />
      <T x={330} y={arcY(300, 26) - 4} anchor="end" color={C.accent} weight={700}>radius gauge</T>
      {xsS.map((x, i) => (
        <circle key={x} cx={x} cy={arcY(x, 31)} r={i < 3 ? 4 - i * 0.5 : 2.2 - (i - 3) * 0.3} fill={C.string} stroke="#999" />
      ))}
      <T x={80} y={arcY(80, 31) - 14} anchor="middle">low E</T>
      <T x={280} y={arcY(280, 31) - 14} anchor="middle">high E</T>
      <N n={1} x={80} y={40} />
      <N n={2} x={340} y={95} />
      <N n={3} x={180} y={52} />
      <N n={4} x={280} y={40} />
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
      <rect x={60} y={120} width={240} height={34} rx={6} fill="#222" stroke={C.line} />
      {[85, 125, 165, 205, 245, 285].map((x) => (
        <circle key={x} cx={x - 5} cy={120} r={6} fill={C.metal} stroke={C.line} />
      ))}
      <T x={180} y={170} anchor="middle">pickup (end view, looking from the bridge)</T>
      <circle cx={80} cy={84} r={4} fill={C.string} stroke="#999" />
      <circle cx={280} cy={98} r={2.5} fill={C.string} stroke="#999" />
      <T x={80} y={70} anchor="middle">low E</T>
      <T x={280} y={84} anchor="middle">high E</T>
      <Gap x={66} y1={88} y2={114} label="bass side" side="left" />
      <Gap x={294} y1={100.5} y2={114} label="treble" side="right" />
      <N n={1} x={180} y={40} />
      <T x={192} y={40} color={C.ink}>strings held at the last fret</T>
      <N n={2} x={108} y={100} />
      <N n={3} x={180} y={135} />
      <N n={4} x={180} y={70} />
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
      <rect x={10} y={130} width={330} height={14} fill={C.wood} stroke={C.woodDark} />
      <T x={20} y={155}>nut</T>
      <T x={175} y={155} anchor="middle" color={C.ink}>12th fret</T>
      <rect x={172} y={124} width={6} height={6} fill={C.metal} />
      <rect x={300} y={100} width={50} height={30} fill={C.woodDark} />
      <T x={325} y={160} anchor="middle">bridge</T>
      <rect x={326} y={hi.y} width={8} height={130 - hi.y} fill="#f1ead8" stroke={C.line} opacity={0.35} strokeDasharray="3 2" />
      <rect x={326} y={lo.y} width={8} height={130 - lo.y} fill="#f1ead8" stroke={C.line} />
      <line x1={nut.x} y1={nut.y} x2={hi.x} y2={hi.y} stroke={C.string} strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={nut.x} y1={nut.y} x2={lo.x} y2={lo.y} stroke={C.string} strokeWidth={2} />
      <Gap x={346} y1={hi.y} y2={lo.y} label="2×" side="right" />
      <Gap x={160} y1={mid(hi)} y2={mid(lo)} label="1×" side="left" color={C.good} />
      <N n={1} x={190} y={100} />
      <N n={2} x={310} y={35} />
      <N n={3} x={300} y={185} />
      <N n={4} x={60} y={60} />
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
      <rect x={150} y={100} width={200} height={60} fill={C.wood} stroke={C.woodDark} />
      <T x={300} y={175} anchor="middle">body</T>
      <rect x={150} y={100} width={90} height={10} fill={C.card} />
      <T x={300} y={124} anchor="middle">neck pocket →</T>
      <g transform="rotate(-3 240 100)">
        <rect x={10} y={84} width={230} height={16} fill={C.woodDark} />
        <T x={60} y={72} color={C.ink}>neck (tilted back)</T>
      </g>
      <rect x={10} y={84} width={230} height={16} fill="none" stroke={C.line} strokeDasharray="4 3" />
      <polygon points="215,100 240,100 240,96" fill={C.accent} />
      <Arrow x1={210} y1={150} x2={230} y2={104} />
      <T x={200} y={156} anchor="end" color={C.accent} weight={700}>shim under the heel end</T>
      <Arrow x1={20} y1={60} x2={20} y2={86} color={C.good} />
      <T x={30} y={55} color={C.good} weight={700}>headstock end drops back</T>
      <N n={1} x={330} y={60} />
      <N n={2} x={175} y={40} />
      <N n={3} x={250} y={135} />
      <N n={4} x={120} y={175} />
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
      <rect x={10} y={80} width={340} height={90} fill={C.wood} stroke={C.woodDark} />
      <rect x={60} y={120} width={250} height={40} fill={C.card} stroke={C.line} />
      <T x={185} y={165} anchor="middle">spring cavity (back of the body)</T>
      <g transform="rotate(-6 210 78)">
        <rect x={210} y={70} width={110} height={8} fill={C.metal} stroke={C.line} />
        <rect x={230} y={78} width={22} height={70} fill="#9aa1aa" stroke={C.line} />
      </g>
      <circle cx={210} cy={78} r={3} fill={C.ink} />
      <T x={204} y={92} anchor="end">pivot</T>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M 238 ${130 + i * 7} ${Array.from({ length: 14 }, (_, k) => `L ${232 - k * 10} ${130 + i * 7 + (k % 2 ? -3 : 3)}`).join(" ")} L 90 ${130 + i * 7}`} fill="none" stroke={C.metal} strokeWidth={1.4} />
      ))}
      <rect x={78} y={124} width={10} height={24} fill={C.metal} stroke={C.line} />
      <T x={75} y={112} anchor="middle">claw</T>
      <line x1={70} y1={130} x2={45} y2={130} stroke={C.ink} strokeWidth={2} />
      <line x1={70} y1={144} x2={45} y2={144} stroke={C.ink} strokeWidth={2} />
      <Arrow x1={42} y1={100} x2={18} y2={100} color={C.good} />
      <T x={30} y={92} anchor="middle" color={C.good} weight={700} size={9}>screw in</T>
      <Gap x={325} y1={68} y2={80} label="float" side="right" />
      <line x1={140} y1={60} x2={330} y2={60} stroke={C.string} strokeWidth={1.5} />
      <N n={1} x={210} y={42} />
      <N n={2} x={345} y={45} />
      <N n={3} x={55} y={180} />
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
      <rect x={10} y={110} width={340} height={60} fill={C.wood} stroke={C.woodDark} />
      <line x1={60} y1={95} x2={300} y2={95} stroke={C.good} strokeDasharray="5 4" />
      <T x={305} y={95} color={C.good} weight={700}>parallel</T>
      <rect x={70} y={88} width={210} height={10} fill={C.metal} stroke={C.line} />
      <rect x={150} y={98} width={40} height={60} fill="#9aa1aa" stroke={C.line} />
      <circle cx={75} cy={98} r={4} fill={C.ink} />
      <T x={70} y={78} anchor="middle">knife edge / stud</T>
      <g opacity={0.45} transform="rotate(-5 75 98)">
        <rect x={70} y={88} width={210} height={10} fill="none" stroke={C.bad} strokeDasharray="3 2" />
      </g>
      <T x={285} y={62} anchor="end" color={C.bad} size={9}>tipped up: claw screws in</T>
      <N n={1} x={120} y={130} />
      <N n={2} x={300} y={66} />
      <N n={3} x={300} y={125} />
      <N n={4} x={40} y={60} />
    </Figure>
  );
}

export function TomDiagram() {
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
      <rect x={10} y={140} width={340} height={40} fill={C.wood} stroke={C.woodDark} />
      <path d="M 70 92 Q 180 72 290 92 L 290 110 L 70 110 Z" fill={C.metal} stroke={C.line} />
      {[90, 128, 166, 204, 242, 280].map((x, i) => (
        <circle key={x} cx={x - 10} cy={86 - (i === 0 || i === 5 ? 0 : i === 1 || i === 4 ? 6 : 9) + (i < 3 ? 2 - i * 0.4 : 0)} r={i < 3 ? 3.5 - i * 0.5 : 2.2 - (i - 3) * 0.3} fill={C.string} stroke="#999" />
      ))}
      {[80, 280].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={110} width={6} height={30} fill={C.metal} />
          <rect x={x - 14} y={112} width={28} height={9} rx={2} fill="#b8bec6" stroke={C.line} />
          <Turn cx={x} cy={116} r={18} cw />
        </g>
      ))}
      <T x={80} y={160} anchor="middle" color={C.ink}>bass-side wheel</T>
      <T x={280} y={160} anchor="middle" color={C.ink}>treble-side wheel</T>
      <N n={1} x={180} y={40} />
      <N n={2} x={40} y={110} />
      <N n={3} x={180} y={125} />
      <N n={4} x={320} y={110} />
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
      <rect x={10} y={120} width={340} height={30} fill={C.wood} stroke={C.woodDark} />
      <T x={40} y={165}>top (soundboard)</T>
      <polygon points="140,120 150,100 270,100 280,112 280,113 140,120" fill={C.woodDark} />
      <rect x={186} y={88} width={6} height={12} fill="#f1ead8" />
      <T x={205} y={80} anchor="middle">bridge</T>
      <polygon points="262,119 296,117 296,121 262,121" fill={C.accent} />
      <path d="M 280 113 L 280 120" stroke={C.bad} strokeWidth={1.2} />
      <T x={268} y={132} anchor="middle" color={C.bad} size={8} weight={700}>gap at the back edge</T>
      <Arrow x1={330} y1={98} x2={298} y2={116} />
      <T x={334} y={90} anchor="end" color={C.accent} weight={700}>feeler / paper</T>
      <line x1={20} y1={92} x2={189} y2={88} stroke={C.string} strokeWidth={1.5} />
      <N n={1} x={110} y={60} />
      <N n={2} x={335} y={140} />
      <N n={3} x={250} y={55} />
      <N n={4} x={60} y={135} />
    </Figure>
  );
}
