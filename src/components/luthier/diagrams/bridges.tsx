/** Bridge pictures: the intonation rules that hold for every bridge, and a sagging Tune-o-matic. */
import { Arrow, At, C, Figure, Gap, Hl, N, T, Tag, Turn, Zoom } from "./kit";

/** A saddle seen from above with its intonation screw; the screw head is on the `head` side. */
const Saddle = ({ x, y, head }: { x: number; y: number; head: "back" | "front" }) => {
  const hx = head === "back" ? x + 40 : x - 40;
  return (
    <g>
      <line x1={Math.min(x, hx)} y1={y} x2={Math.max(x, hx)} y2={y} stroke="#8d939b" strokeWidth={2.2} />
      <rect x={x - 10} y={y - 8} width={20} height={16} rx={2} fill={C.metalFill} stroke={C.line} />
      <circle cx={hx} cy={y} r={5} fill="#c9cdd3" stroke={C.line} />
      <line x1={hx - 3} y1={y} x2={hx + 3} y2={y} stroke={C.line} strokeWidth={1} />
    </g>
  );
};

export function IntonationRulesDiagram() {
  return (
    <Figure
      title="Intonation on any bridge: which way to move the saddle"
      viewBox="0 0 360 200"
      how={[
        "Tune the open string, then compare the 12th-fret harmonic with the note fretted at the 12th. Fretted note SHARP: the string is too short, so move the saddle BACK, away from the neck. Fretted note FLAT: move it FORWARD.",
        "On any saddle with a screw (Strat, Tele, hardtail, Tune-o-matic, most basses), turning the screw clockwise pulls the saddle toward the screw's head. Strat, Tele and most hardtails have the head at the back, so clockwise = back = flatter fretted note.",
        "Tune-o-matic: look at which side the screw heads face before you turn. If a saddle runs out of travel, turn that saddle around (or flip the screw) so it can go further — loosen the string first.",
        "No screws (acoustic saddles, wraparounds with a fixed lightning bar, rocking bridges): the take-off point is moved instead — file the saddle's peak back or forward, or move/angle the whole bridge.",
      ]}
      note="Retune after every move and re-check. Fresh strings, playing position, and set action and relief first — they all change intonation."
    >
      {/* neck on the left, bridge on the right (top view) */}
      <T x={20} y={190} size={8}>← neck</T>
      <T x={340} y={190} anchor="end" size={8}>tail →</T>
      <At n={1}>
        <line x1={20} y1={100} x2={340} y2={100} stroke={C.string} strokeWidth={1.6} />
        <rect x={246} y={88} width={20} height={24} rx={2} fill={C.metalFill} stroke={C.line} />
        <rect x={286} y={88} width={20} height={24} rx={2} fill="none" stroke={C.good} strokeDasharray="3 2" />
        <Arrow x1={262} y1={126} x2={290} y2={126} color={C.good} w={2} />
        <T x={276} y={142} anchor="middle" size={8} color={C.good}>back</T>
        <rect x={190} y={88} width={20} height={24} rx={2} fill="none" stroke={C.bad} strokeDasharray="3 2" />
        <Arrow x1={250} y1={76} x2={214} y2={76} color={C.bad} w={2} />
        <T x={230} y={68} anchor="middle" size={8} color={C.bad}>forward</T>
        <g transform="translate(36 30)">
          <rect x={0} y={0} width={110} height={52} rx={6} fill="#1d2024" stroke={C.line} />
          <T x={55} y={16} anchor="middle" size={8} color="#e5e7eb" halo={false}>fretted 12th vs harmonic</T>
          <T x={55} y={32} anchor="middle" size={8.5} color={C.good} weight={700} halo={false}>sharp → saddle back</T>
          <T x={55} y={45} anchor="middle" size={8.5} color={C.bad} weight={700} halo={false}>flat → saddle forward</T>
        </g>
      </At>
      <At n={2}>
        <rect x={150} y={60} width={150} height={90} rx={4} fill={C.metalFill} stroke={C.line} opacity={0.35} />
        {[76, 92, 108, 124, 140].map((y, k) => (
          <g key={y}>
            <line x1={20} y1={y} x2={300} y2={y} stroke={C.string} strokeWidth={1.6 - k * 0.2} />
            <Hl n={2} dim={0.5} glow={k === 2}>
              <Saddle x={210 + (k % 2) * 8} y={y} head="back" />
            </Hl>
          </g>
        ))}
        <Turn cx={266} cy={44} r={9} cw />
        <Arrow x1={216} y1={164} x2={246} y2={164} color={C.good} w={2} />
        <Tag x={180} y={22} anchor="middle">clockwise pulls the saddle toward the screw head</Tag>
        <T x={300} y={178} anchor="end" size={8} color={C.good}>head at the back: clockwise = back</T>
      </At>
      <At n={3}>
        <rect x={110} y={80} width={150} height={40} rx={6} fill={C.metalFill} stroke={C.line} />
        <Saddle x={160} y={100} head="front" />
        <T x={120} y={134} anchor="middle" size={8}>head facing the neck</T>
        <Arrow x1={164} y1={150} x2={136} y2={150} color={C.ink} />
        <T x={150} y={164} anchor="middle" size={8}>clockwise = toward the neck</T>
        <Zoom x={310} y={92} r={36} cx={160} cy={100} scale={1.6} label="out of travel? turn the saddle round" labelAt="below">
          <rect x={140} y={92} width={40} height={16} fill={C.metalFill} />
          <path d="M 146 100 A 10 10 0 1 1 166 104" fill="none" stroke={C.accent} strokeWidth={2} />
        </Zoom>
        <Tag x={180} y={30} anchor="middle">Tune-o-matic: check which way the heads face</Tag>
      </At>
      <At n={4}>
        <rect x={140} y={70} width={170} height={60} rx={6} fill={C.woodDarkFill} stroke={C.woodDark} />
        <path d="M 190 80 L 236 120 L 248 120 L 202 80 Z" fill="#f1ead8" stroke={C.line} />
        {[84, 94, 104, 114].map((y, k) => (
          <line key={y} x1={20} y1={y} x2={196 + (y - 80) * 1.0 + (k % 2) * 4} y2={y} stroke={C.string} strokeWidth={1.6 - k * 0.25} />
        ))}
        <Zoom x={80} y={150} r={30} cx={214} cy={104} scale={2.4}>
          <path d="M 204 96 L 226 116 L 232 116 L 210 96 Z" fill="#f1ead8" />
          <path d="M 214 103 L 220 108" stroke={C.accent} strokeWidth={1.6} />
        </Zoom>
        <Tag x={230} y={40} anchor="middle">no screws: move where the string leaves the saddle</Tag>
        <T x={118} y={160} size={8} color={C.accent}>peak filed back</T>
        <T x={118} y={171} size={8} color={C.accent}>on one string</T>
        <Gap x={300} y1={84} y2={114} label="slanted saddle" side="left" color={C.dim} />
      </At>
      <N n={1} x={180} y={150} />
      <N n={2} x={120} y={164} />
      <N n={3} x={80} y={100} />
      <N n={4} x={120} y={60} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ sagging Tune-o-matic */

export function TomSagDiagram() {
  return (
    <Figure
      title="A sagging Tune-o-matic"
      how={[
        "Sight along the bridge from the side, or lay a straightedge on it: an old zinc bridge that has collapsed dips in the middle, so the middle strings sit lower than the radius wants and buzz.",
        "Check the posts: they should stand straight up. A post leaning toward the neck, or loose in its insert, lets the bridge tip and changes the action and intonation.",
        "Don't bend it back — the metal is tired. Fit a replacement with the same post spacing and the right radius (steel or aluminium bodies sag less).",
        "After the swap, set the height to the action you want, check that the saddle radius follows the fretboard, then intonate.",
      ]}
    >
      <rect x={20} y={150} width={320} height={20} fill={C.woodFill} stroke={C.woodDark} />
      <T x={180} y={184} anchor="middle" size={8}>body (side view of the bridge, from the neck)</T>
      {/* posts */}
      <Hl n={2} dim={0.6}>
        <rect x={56} y={100} width={8} height={50} fill="#9aa1aa" stroke={C.line} />
        <At n={[1, 3, 4]}>
          <rect x={296} y={100} width={8} height={50} fill="#9aa1aa" stroke={C.line} />
        </At>
        <At n={2}>
          <g transform="rotate(-10 300 150)">
            <rect x={296} y={100} width={8} height={50} fill="#9aa1aa" stroke={C.bad} />
          </g>
        </At>
      </Hl>
      {/* bridge body */}
      <At n={[1, 2]}>
        <path d="M 50 96 Q 180 112 310 96 L 310 108 Q 180 124 50 108 Z" fill={C.metalFill} stroke={C.line} />
        <path d="M 50 90 Q 180 80 310 90" fill="none" stroke={C.good} strokeDasharray="4 3" />
        <T x={180} y={74} anchor="middle" size={8} color={C.good}>where the radius should be</T>
      </At>
      <At n={1}>
        <Gap x={180} y1={84} y2={104} label="sagged" side="right" color={C.bad} />
        <Tag x={180} y={40} anchor="middle" color={C.bad}>middle dips: middle strings buzz</Tag>
      </At>
      <At n={2}>
        <Tag x={220} y={40} anchor="middle" color={C.bad}>post leaning or loose in its insert</Tag>
        <Arrow x1={300} y1={60} x2={290} y2={94} color={C.bad} />
      </At>
      <At n={[3, 4]}>
        <path d="M 50 92 Q 180 80 310 92 L 310 104 Q 180 92 50 104 Z" fill={C.metalFill} stroke={C.good} />
      </At>
      <At n={3}>
        <Tag x={180} y={40} anchor="middle" color={C.good}>new bridge: same post spacing, right radius</Tag>
        <Arrow x1={60} y1={138} x2={300} y2={138} both color={C.ink} />
        <T x={180} y={128} anchor="middle" size={8}>post spacing</T>
      </At>
      <At n={4}>
        <Turn cx={60} cy={70} r={9} cw />
        <Turn cx={300} cy={70} r={9} cw />
        <Tag x={180} y={40} anchor="middle">set height → check radius → intonate</Tag>
      </At>
      <N n={1} x={40} y={60} />
      <N n={2} x={40} y={60} />
      <N n={3} x={40} y={60} />
      <N n={4} x={180} y={64} />
    </Figure>
  );
}
