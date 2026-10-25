/** Pickup height pictures: which way the screws turn, and what to do when a pickup won't go up. */
import { Arrow, At, C, Figure, Gap, Hl, N, T, Tag, Turn } from "./kit";

/** A height screw drawn from the side: head at the top, thread down to y2. */
const Screw = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => (
  <g>
    <rect x={x - 1.6} y={y1} width={3.2} height={y2 - y1} fill="#8d939b" />
    {Array.from({ length: Math.floor((y2 - y1 - 4) / 3) }, (_, k) => (
      <line key={k} x1={x - 2.2} y1={y1 + 5 + k * 3} x2={x + 2.2} y2={y1 + 6.5 + k * 3} stroke="#5d636b" strokeWidth={0.6} />
    ))}
    <rect x={x - 5} y={y1 - 3} width={10} height={3.5} rx={1.5} fill="#c9cdd3" stroke={C.line} strokeWidth={0.6} />
  </g>
);
/** A spring drawn as a zigzag between y1 and y2. */
const Spring = ({ x, y1, y2, color = "#b9c0c8" }: { x: number; y1: number; y2: number; color?: string }) => {
  const turns = 5;
  const h = (y2 - y1) / turns;
  const d = Array.from({ length: turns }, (_, k) => `L ${x + 4} ${y1 + h * (k + 0.25)} L ${x - 4} ${y1 + h * (k + 0.75)}`).join(" ");
  return <path d={`M ${x} ${y1} ${d} L ${x} ${y2}`} fill="none" stroke={color} strokeWidth={1.2} />;
};
/** A pickup bobbin seen from the side. */
const Pickup = ({ x, y, w = 70, h = 20 }: { x: number; y: number; w?: number; h?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={3} fill="#2a2d31" stroke={C.line} />
    {[0.18, 0.38, 0.62, 0.82].map((f) => (
      <rect key={f} x={x + w * f - 2} y={y - 2.5} width={4} height={3} fill="#9aa1aa" />
    ))}
  </g>
);

/* ------------------------------------------------------------------ which way */

export function PickupRaiseDiagram() {
  return (
    <Figure
      title="Raise or lower a pickup: which way the screws turn"
      viewBox="0 0 360 210"
      how={[
        "Look at where the screws go. If they pass through a pickguard, a humbucker ring or a Tele bridge plate and thread INTO the pickup, a spring (or rubber tubing) between the guard and the pickup pushes the pickup away from the guard, and the screw holds it up.",
        "On those, turning clockwise pulls the pickup UP toward the strings; counter-clockwise lets the spring push it down.",
        "If the screws pass through the pickup and thread into the WOOD (direct-mount humbuckers, P-90 soapbars, Jazzmaster pickups, P and J bass pickups), the spring or foam sits under the pickup: clockwise pulls it DOWN, counter-clockwise lets it rise. A Tele neck pickup can be either — screw heads in the pickguard mean it hangs from the guard.",
        "Set one side at a time to tilt the pickup: the bass side a little lower than the treble side, because the thick strings swing wider. Raise or lower individual pole pieces to even out string volume.",
      ]}
      note="Small steps: half a turn, retune, play, measure at the last fret. Strings pulling on magnets too strongly cause warble — back off if the low strings sound out of tune."
    >
      <At n={[1, 2, 3]}>
        {/* LEFT: screw through pickguard into pickup */}
        <T x={90} y={14} anchor="middle" size={9} color={C.ink} weight={700}>through pickguard → into pickup</T>
        <rect x={20} y={70} width={140} height={6} fill="#ece7da" stroke={C.line} />
        <T x={90} y={64} anchor="middle" size={7.5}>pickguard / ring</T>
        <rect x={20} y={150} width={140} height={16} fill={C.woodFill} stroke={C.woodDark} />
        <T x={22} y={178} size={7.5}>body cavity floor</T>
        <Hl n={[1, 2]}>
          <Pickup x={55} y={92} />
          <Screw x={48} y1={66} y2={102} />
          <Screw x={132} y1={66} y2={102} />
          <Spring x={48} y1={77} y2={92} />
          <Spring x={132} y1={77} y2={92} />
        </Hl>
        {/* RIGHT: screw through pickup into wood */}
        <T x={270} y={14} anchor="middle" size={9} color={C.ink} weight={700}>through pickup → into wood</T>
        <rect x={200} y={150} width={140} height={16} fill={C.woodFill} stroke={C.woodDark} />
        <T x={202} y={178} size={7.5}>body (screws bite the wood)</T>
        <Hl n={[3]}>
          <rect x={228} y={86} width={84} height={6} rx={2} fill="#3a3f46" />
          <Pickup x={235} y={92} />
          <Screw x={230} y1={84} y2={162} />
          <Screw x={310} y1={84} y2={162} />
          <Spring x={230} y1={112} y2={150} />
          <Spring x={310} y1={112} y2={150} />
        </Hl>
        <T x={270} y={80} anchor="middle" size={7.5}>mounting ears</T>
      </At>
      <At n={1}>
        <Tag x={90} y={36} anchor="middle">spring pushes it away from the guard</Tag>
        <Tag x={90} y={136} anchor="middle" color={C.dim}>the screw holds it up</Tag>
      </At>
      <At n={2}>
        <Turn cx={48} cy={48} r={9} cw />
        <Turn cx={132} cy={48} r={9} cw />
        <Arrow x1={90} y1={136} x2={90} y2={116} color={C.good} w={2} />
        <Tag x={90} y={30} anchor="middle" color={C.good}>clockwise = pickup UP</Tag>
      </At>
      <At n={3}>
        <Turn cx={230} cy={64} r={9} cw />
        <Turn cx={310} cy={64} r={9} cw />
        <Arrow x1={270} y1={118} x2={270} y2={142} color={C.bad} w={2} />
        <Tag x={270} y={36} anchor="middle" color={C.bad}>clockwise = pickup DOWN</Tag>
      </At>

      {/* step 4: tilt, seen end-on from the bridge */}
      <At n={4}>
        <rect x={40} y={150} width={280} height={14} rx={2} fill="#ece7da" stroke={C.line} />
        <T x={180} y={180} anchor="middle" size={8}>end view, looking from the bridge</T>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <circle key={k} cx={80 + k * 40} cy={60 - k * 2} r={4 - k * 0.4} fill={C.string} stroke="#999" />
        ))}
        <T x={80} y={46} anchor="middle" size={8}>low E</T>
        <T x={280} y={36} anchor="middle" size={8}>high E</T>
        <path d="M 60 112 L 300 98 L 300 128 L 60 142 Z" fill="#2a2d31" stroke={C.line} />
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const x = 80 + k * 40;
          const top = 112 - ((x - 60) / 240) * 14;
          const up = k === 4 ? 5 : 0;
          return <rect key={k} x={x - 4} y={top - 4 - up} width={8} height={4 + up} fill={k === 4 ? C.accent : "#9aa1aa"} />;
        })}
        <Gap x={62} y1={64} y2={106} label="bass: farther" side="right" color={C.accent} />
        <Gap x={298} y1={52} y2={95} label="treble: closer" side="left" color={C.accent} />
        <T x={240} y={84} anchor="middle" size={7.5} color={C.accent}>pole raised</T>
        <Turn cx={44} cy={128} r={8} cw={false} />
        <Turn cx={316} cy={112} r={8} cw />
        <Tag x={180} y={14} anchor="middle">tilt: bass side a little lower</Tag>
      </At>
      <N n={1} x={180} y={100} />
      <N n={2} x={20} y={46} />
      <N n={3} x={180} y={100} />
      <N n={4} x={180} y={80} />
    </Figure>
  );
}

/* ------------------------------------------------------------------ won't go up / won't stay */

const Strings = () => (
  <g>
    <line x1={20} y1={34} x2={340} y2={34} stroke={C.string} strokeWidth={1.4} />
    <line x1={20} y1={40} x2={340} y2={40} stroke={C.string} strokeWidth={0.9} />
    <T x={338} y={28} anchor="end" size={7.5}>strings</T>
  </g>
);

export function PickupFixDiagram() {
  return (
    <Figure
      title="When a pickup won't go high enough (or won't stay put)"
      how={[
        "Springs too short or soft, so the pickup rattles or sinks: swap in longer, stiffer springs, or slide pieces of rubber (vacuum) tubing over the screws instead — tubing holds height and stops vibration.",
        "Pickup sits too deep in the cavity even at full height: put foam under it (direct-mount) or a thin shim under the ring or base plate.",
        "Humbucker ring too short for a carved or angled top: fit a taller ring (rings come in heights and slanted versions) so the pickup can reach the strings and sit level with them.",
        "Screw runs out of thread before the pickup is high enough: use longer height screws of the same thread. If a screw spins in wood, plug the hole with a glued hardwood dowel and re-drill.",
      ]}
      note="Before forcing it higher, check the neck isn't over-shimmed or the action unusually high — that leaves the strings far from every pickup."
    >
      <Strings />
      <At n={1}>
        <rect x={20} y={70} width={320} height={6} fill="#ece7da" stroke={C.line} />
        <rect x={20} y={160} width={320} height={16} fill={C.woodFill} stroke={C.woodDark} />
        <Pickup x={60} y={100} />
        <Screw x={54} y1={66} y2={112} />
        <Screw x={136} y1={66} y2={112} />
        <Spring x={54} y1={77} y2={100} />
        <Spring x={136} y1={77} y2={100} />
        <T x={95} y={140} anchor="middle" size={8} color={C.bad}>short, soft springs: sinks, rattles</T>
        <Pickup x={220} y={86} />
        <Screw x={214} y1={66} y2={100} />
        <Screw x={296} y1={66} y2={100} />
        <rect x={210} y={77} width={8} height={9} rx={2} fill="#2d2d2d" />
        <rect x={292} y={77} width={8} height={9} rx={2} fill="#2d2d2d" />
        <T x={258} y={140} anchor="middle" size={8} color={C.good}>rubber tubing: holds firm</T>
        <Arrow x1={160} y1={120} x2={200} y2={120} />
        <Tag x={180} y={56} anchor="middle">longer springs or rubber tubing</Tag>
      </At>
      <At n={2}>
        <path d="M 20 110 L 120 110 L 120 172 L 240 172 L 240 110 L 340 110 L 340 186 L 20 186 Z" fill={C.woodFill} stroke={C.woodDark} />
        <T x={60} y={124} size={8}>body</T>
                <rect x={130} y={140} width={100} height={32} fill="#e3c45a" opacity={0.85} stroke={C.line} />
        <T x={180} y={160} anchor="middle" size={8} color="#2a2d31" halo={false}>foam / shim</T>
        <Pickup x={135} y={118} w={90} h={22} />
        <Arrow x1={252} y1={166} x2={252} y2={122} color={C.good} w={2} />
        <Tag x={180} y={70} anchor="middle">lift the whole pickup from below</Tag>
      </At>
      <At n={3}>
        <path d="M 20 160 L 340 120 L 340 186 L 20 186 Z" fill={C.woodFill} stroke={C.woodDark} />
        <T x={40} y={176} size={8}>carved / angled top</T>
        {/* tall slanted ring: flat top, pickup level with the strings */}
        <path d="M 110 146 L 250 128.5 L 250 98 L 110 98 Z" fill="#1f1f1f" stroke={C.line} />
        <Pickup x={125} y={76} w={110} h={22} />
        <T x={262} y={96} size={7.5} color={C.good}>tall, slanted ring</T>
        <Gap x={244} y1={42} y2={73} label="even gap" side="right" color={C.good} />
        <Tag x={150} y={58} anchor="middle">pickup level with the strings</Tag>
      </At>
      <At n={4}>
        <rect x={20} y={70} width={320} height={6} fill="#ece7da" stroke={C.line} />
        <rect x={20} y={168} width={320} height={16} fill={C.woodFill} stroke={C.woodDark} />
        <Pickup x={70} y={92} w={60} />
        <Screw x={64} y1={66} y2={98} />
        <T x={100} y={134} anchor="middle" size={8} color={C.bad}>screw too short</T>
        <Pickup x={190} y={86} w={60} />
        <Screw x={184} y1={66} y2={118} />
        <T x={220} y={134} anchor="middle" size={8} color={C.good}>longer, same thread</T>
        <rect x={290} y={168} width={14} height={16} fill={C.woodDarkFill} stroke={C.good} />
        <T x={297} y={160} anchor="middle" size={8} color={C.good}>dowel plug</T>
        <Tag x={180} y={56} anchor="middle">out of thread? longer screws</Tag>
      </At>
      <N n={1} x={180} y={100} />
      <N n={2} x={290} y={140} />
      <N n={3} x={40} y={110} />
      <N n={4} x={300} y={110} />
    </Figure>
  );
}
