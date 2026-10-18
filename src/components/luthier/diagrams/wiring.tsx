/**
 * Wiring diagrams. Every part is drawn as seen from the BACK (the side you solder on): pots with
 * their lugs facing up, lug 1 on the left, lug 2 (the wiper) in the middle, lug 3 on the right.
 * Pickup leads take the colours of the brand chosen above the steps, so the picture matches the
 * wires in your hand.
 */
import type { ReactNode } from "react";
import type { ColorScheme } from "@/lib/luthier/types";
import { swatch } from "@/lib/luthier/types";
import { At, C, Figure, Hl, N, T, Tag, Zoom, type StepTag } from "./kit";

type P = readonly [number, number];
export interface Schemes {
  hb: ColorScheme | null;
  sc: ColorScheme | null;
}

/** Fallback colours when no brand is chosen (or the brand has no such lead). */
const ROLE_DEFAULT: Record<string, string> = {
  hot: "#f0b429",
  ground: "#7c8591",
  nFinish: "#d946ef",
  sFinish: "#22c3ee",
  bare: "#c8ccd2",
  scHot: "#f0b429",
  scGround: "#7c8591",
  signal: "#f0b429",
  gnd: "#7c8591",
};
const ROLE_LABEL: Record<string, string> = {
  hot: "hot",
  ground: "ground",
  nFinish: "north finish",
  sFinish: "south finish",
  bare: "bare shield",
  scHot: "hot",
  scGround: "ground",
};

function roleColor(role: string, s: Schemes): { color: string; name: string | null } {
  const scheme = role.startsWith("sc") ? s.sc : s.hb;
  const c = scheme?.wires.find((w) => w.role === role)?.color;
  return c ? { color: swatch(c), name: c } : { color: ROLE_DEFAULT[role] ?? "#f0b429", name: null };
}

/* ------------------------------------------------------------------ parts */

export function pot(x: number, y: number) {
  return { l1: [x - 14, y - 27] as P, l2: [x, y - 29] as P, l3: [x + 14, y - 27] as P, gnd: [x, y + 6] as P, x, y };
}
function Pot({ p, label }: { p: ReturnType<typeof pot>; label: string }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={22} fill="#59606a" stroke={C.line} />
      {[p.l1, p.l2, p.l3].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3} y={y} width={6} height={9} fill={C.metal} stroke={C.line} />
          <T x={x} y={y - 7} anchor="middle" size={8}>
            {i + 1}
          </T>
        </g>
      ))}
      {label.split(" ").map((w, i, a) => (
        <T key={i} x={p.x} y={p.y + 4 + (i - (a.length - 1) / 2) * 9} anchor="middle" color="#f2f4f6" weight={700} size={8}>
          {w}
        </T>
      ))}
    </g>
  );
}

export function jack(x: number, y: number) {
  return { tip: [x - 12, y - 12] as P, sleeve: [x + 12, y - 12] as P, x, y };
}
function Jack({ j }: { j: ReturnType<typeof jack> }) {
  return (
    <g>
      <rect x={j.x - 18} y={j.y - 8} width={36} height={20} rx={4} fill="#59606a" stroke={C.line} />
      <circle cx={j.tip[0]} cy={j.tip[1]} r={3.5} fill={C.metal} />
      <circle cx={j.sleeve[0]} cy={j.sleeve[1]} r={3.5} fill={C.metal} />
      <T x={j.tip[0]} y={j.y + 22} anchor="middle" size={8}>tip</T>
      <T x={j.sleeve[0]} y={j.y + 22} anchor="middle" size={8}>sleeve</T>
      <T x={j.x} y={j.y + 3} anchor="middle" color={C.ink} weight={700} size={9}>jack</T>
    </g>
  );
}

export function single(x: number, y: number) {
  return { hot: [x + 44, y + 20] as P, gnd: [x + 12, y + 20] as P, x, y };
}
function Single({ s, label }: { s: ReturnType<typeof single>; label: string }) {
  return (
    <g>
      <rect x={s.x} y={s.y} width={56} height={18} rx={9} fill="#ece7da" stroke={C.line} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={s.x + 8 + i * 8} cy={s.y + 9} r={2.4} fill="#9aa1aa" />
      ))}
      <T x={s.x + 28} y={s.y - 7} anchor="middle" color={C.ink} weight={700} size={9}>
        {label}
      </T>
    </g>
  );
}

export function humbucker(x: number, y: number) {
  return { hot: [x + 8, y + 32] as P, nFinish: [x + 21, y + 32] as P, sFinish: [x + 34, y + 32] as P, ground: [x + 47, y + 32] as P, bare: [x + 60, y + 32] as P, x, y };
}
function Humbucker({ h, label }: { h: ReturnType<typeof humbucker>; label: string }) {
  return (
    <g>
      <rect x={h.x} y={h.y} width={68} height={28} rx={4} fill="#25282d" stroke={C.line} />
      {[0, 1].map((r) => [0, 1, 2, 3, 4, 5].map((i) => <circle key={`${r}${i}`} cx={h.x + 9 + i * 10} cy={h.y + 8 + r * 12} r={2.6} fill={r ? "#c0c5cc" : "#8c939c"} />))}
      <T x={h.x + 34} y={h.y - 7} anchor="middle" color={C.ink} weight={700} size={9}>
        {label}
      </T>
    </g>
  );
}

/** Gibson/Switchcraft 3-way toggle seen from the back. */
export function toggle3(x: number, y: number) {
  return { rhythm: [x - 22, y] as P, treble: [x + 22, y] as P, out: [x, y] as P, gnd: [x + 22, y + 26] as P, x, y };
}
function Toggle3({ t }: { t: ReturnType<typeof toggle3> }) {
  return (
    <g>
      <rect x={t.x - 30} y={t.y - 6} width={60} height={36} rx={4} fill="#59606a" stroke={C.line} />
      {[t.rhythm, t.treble, t.out, t.gnd].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill={C.metal} />
      ))}
      <T x={t.rhythm[0]} y={t.y - 14} anchor="middle" size={8}>rhythm</T>
      <T x={t.treble[0]} y={t.y - 14} anchor="middle" size={8}>treble</T>
      <T x={t.x} y={t.y - 14} anchor="middle" size={8}>out</T>
      <T x={t.x} y={t.y + 40} anchor="middle" size={8}>frame = ground</T>
    </g>
  );
}

/** A lever switch with two decks of lugs (positions named by the caller, plus a common each). */
export function lever(x: number, y: number, names: string[]) {
  const row = (yy: number) => Object.fromEntries([...names.map((n, i) => [n, [x + i * 22, yy] as P]), ["C", [x + names.length * 22 + 10, yy] as P]]) as Record<string, P>;
  return { A: row(y), B: row(y + 30), x, y, w: names.length * 22 + 20, names };
}
function Lever({ l, label }: { l: ReturnType<typeof lever>; label: string }) {
  return (
    <g>
      <rect x={l.x - 12} y={l.y - 12} width={l.w + 14} height={54} rx={4} fill="#4a5058" stroke={C.line} />
      {(["A", "B"] as const).map((d) =>
        Object.entries(l[d]).map(([n, [x, y]]) => (
          <g key={d + n}>
            <rect x={x - 3} y={y - 3} width={6} height={6} fill={C.metal} />
            <T x={x} y={y + 10} anchor="middle" size={7} color="#d0d4da">
              {n === "C" ? "com" : n}
            </T>
          </g>
        )),
      )}
      <T x={l.x - 16} y={l.y} anchor="end" size={8}>deck A</T>
      <T x={l.x - 16} y={l.y + 30} anchor="end" size={8}>deck B</T>
      <T x={l.x + l.w / 2} y={l.y + 50} anchor="middle" color={C.ink} weight={700} size={9}>
        {label}
      </T>
    </g>
  );
}

/* ------------------------------------------------------------------ wires */

interface WireDef {
  pts: P[];
  role: string;
  /** The step(s) this wire is soldered in: it lights up then and fades back in the other steps. */
  n?: StepTag | undefined;
}
/** Wiring steps fade the wires of other steps right back so the step's own wires stand out. */
const WIRE_DIM = 0.14;
function InStep({ n, children }: { n?: StepTag | undefined; children: ReactNode }) {
  return n === undefined ? <>{children}</> : <Hl n={n} dim={WIRE_DIM}>{children}</Hl>;
}
/** Light outline behind dark wires and dark outline behind light ones, so black and white leads both show. */
export function outlineFor(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex);
  if (!m) return "#1b1e22";
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => parseInt(v!, 16));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 90 ? "#aeb4bc" : "#1b1e22";
}
function Wire({ w, s }: { w: WireDef; s: Schemes }) {
  const { color } = roleColor(w.role, s);
  const d = w.pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  const end = w.pts[w.pts.length - 1]!;
  return (
    <InStep n={w.n}>
      <path d={d} fill="none" stroke={outlineFor(color)} strokeWidth={4.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={end[0]} cy={end[1]} r={2.4} fill="#d8dce0" stroke="#2b2f35" />
    </InStep>
  );
}
/** A capacitor drawn on a wire segment between a and b. */
function Cap({ a, b, label = "cap", n }: { a: P; b: P; label?: string; n?: StepTag | undefined }) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const vertical = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]);
  return (
    <InStep n={n}>
      <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} stroke="#9aa1aa" strokeWidth={1.8} />
      <ellipse cx={mx} cy={my} rx={vertical ? 6 : 9} ry={vertical ? 9 : 6} fill="#c4772f" stroke="#7a4a1c" />
      <T x={mx + (vertical ? 9 : 0)} y={my + (vertical ? 0 : -12)} anchor={vertical ? "start" : "middle"} size={8} color={C.ink}>
        {label}
      </T>
    </InStep>
  );
}
/** Tape mark: the series-link pair soldered together and insulated. */
function Taped({ at, label = "joined + taped", n }: { at: P; label?: string; n?: StepTag | undefined }) {
  return (
    <InStep n={n}>
      <rect x={at[0] - 6} y={at[1] - 4} width={12} height={8} rx={2} fill="#1d1d1d" stroke="#888" />
      <T x={at[0] + 9} y={at[1]} size={7}>
        {label}
      </T>
    </InStep>
  );
}
/** Bare ground wire soldered across the pot backs (and anything else grounded). */
function Rail({ x1, x2, y, n }: { x1: number; x2: number; y: number; n?: StepTag | undefined }) {
  return (
    <InStep n={n}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#c8ccd2" strokeWidth={2.6} strokeDasharray="1 0" />
      <T x={x1} y={y + 10} size={8}>ground wire linking the pot backs</T>
    </InStep>
  );
}
const toRail = (p: ReturnType<typeof pot>, y: number, n?: StepTag): WireDef => ({ role: "gnd", pts: [[p.x, p.y + 20], [p.x, y]], ...(n === undefined ? {} : { n }) });
const lug1ToBack = (p: ReturnType<typeof pot>, n?: StepTag): WireDef => ({ role: "gnd", pts: [p.l1, [p.l1[0] - 4, p.l1[1] + 10], [p.x - 15, p.y - 10]], ...(n === undefined ? {} : { n }) });

/** The colour key for whatever roles a diagram uses. */
function Legend({ roles, s }: { roles: string[]; s: Schemes }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {roles.map((r) => {
        const { color, name } = roleColor(r, s);
        return (
          <span key={r} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-4 rounded-sm border border-white/30" style={{ background: color }} />
            {ROLE_LABEL[r] ?? (r === "signal" ? "signal (hook-up wire)" : "ground (hook-up wire)")}
            {name ? <span className="text-foreground">({name})</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function WiringFigure({ title, how, note, s, roles, children, viewBox = "0 0 360 270" }: { title: string; how: ReactNode[]; note?: ReactNode; s: Schemes; roles: string[]; children: ReactNode; viewBox?: string }) {
  return (
    <Figure
      title={title}
      viewBox={viewBox}
      how={how}
      note={
        <>
          <span className="mb-1 block">
            Drawn from the back (solder side), pot lugs up: lug 1 left, 2 middle (wiper), 3 right. Wires that cross without a dot are not connected. {s.hb || s.sc ? "Pickup leads are in your chosen brand's colours." : "Pick your pickup brand above to see its real lead colours."}
          </span>
          <Legend roles={roles} s={s} />
          {note ? <span className="mt-1 block">{note}</span> : null}
        </>
      }
    >
      {children}
    </Figure>
  );
}

const POT_Y = 186;
const RAIL_Y = 238;

/* ------------------------------------------------------------------ recipes */

/** A humbucker's leads: link pair joined + taped, hot to `hotTo`, ground and bare down a channel to the rail. */
function HbLeads({ h, s, hotTo, hotY, chan, railY, linkN, hotN, gndN }: { h: ReturnType<typeof humbucker>; s: Schemes; hotTo: P; hotY: number; chan: number; railY: number; linkN: StepTag; hotN: StepTag; gndN: StepTag }) {
  const link: P = [h.nFinish[0] + 6, h.y + 48];
  return (
    <g>
      <Wire s={s} w={{ role: "nFinish", pts: [h.nFinish, [h.nFinish[0], link[1]], link], n: linkN }} />
      <Wire s={s} w={{ role: "sFinish", pts: [h.sFinish, [h.sFinish[0], link[1]], link], n: linkN }} />
      <Taped at={link} label="taped" n={linkN} />
      <Wire s={s} w={{ role: "hot", pts: [h.hot, [h.hot[0], hotY], [hotTo[0], hotY], hotTo], n: hotN }} />
      <Wire s={s} w={{ role: "ground", pts: [h.ground, [h.ground[0], h.y + 64], [chan, h.y + 64], [chan, railY]], n: gndN }} />
      <Wire s={s} w={{ role: "bare", pts: [h.bare, [h.bare[0], h.y + 70], [chan + 6, h.y + 70], [chan + 6, railY]], n: gndN }} />
    </g>
  );
}

export function SingleHumbuckerWiring({ s }: { s: Schemes }) {
  const h = humbucker(40, 18);
  const v = pot(90, POT_Y);
  const t = pot(200, POT_Y);
  const j = jack(310, 190);
  return (
    <WiringFigure
      s={s}
      title="Single humbucker, volume + tone"
      roles={["hot", "nFinish", "sFinish", "ground", "bare", "signal", "gnd"]}
      how={[
        "Join the pickup's two series-link wires and tape them (they connect the two coils).",
        "Hot to volume lug 3. Ground and bare shield to ground (the pot backs).",
        "Volume lug 1 bent onto its pot back. Volume lug 2 to the jack tip; jack sleeve to ground.",
        "Tone: volume lug 3 to tone lug 2; a .022 µF cap from tone lug 1 to ground. Link the pot backs with a ground wire and add the bridge ground.",
      ]}
      note="500k audio pots for humbuckers."
    >
      <Humbucker h={h} label="humbucker" />
      <Pot p={v} label="volume 500k" />
      <Pot p={t} label="tone 500k" />
      <Jack j={j} />
      <Rail x1={20} x2={322} y={RAIL_Y} n={[2, 3, 4]} />
      <HbLeads h={h} s={s} hotTo={v.l3} hotY={120} chan={140} railY={RAIL_Y} linkN={1} hotN={2} gndN={2} />
      <Wire s={s} w={lug1ToBack(v, 3)} />
      <Wire s={s} w={toRail(v, RAIL_Y, 4)} />
      <Wire s={s} w={toRail(t, RAIL_Y, 4)} />
      <Wire s={s} w={{ role: "signal", pts: [v.l2, [v.l2[0], 138], [j.tip[0], 138], j.tip], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [v.l3, [v.l3[0] + 8, 148], [t.l2[0], 148], t.l2], n: 4 }} />
      <Cap a={t.l1} b={[t.l1[0] - 26, t.l1[1] + 26]} label=".022 µF" n={4} />
      <Wire s={s} w={{ role: "gnd", pts: [[t.l1[0] - 26, t.l1[1] + 26], [t.l1[0] - 26, RAIL_Y]], n: 4 }} />
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0], RAIL_Y], [322, RAIL_Y]], n: 3 }} />
      <T x={20} y={RAIL_Y + 20} size={8}>(also solder the bridge ground to this wire)</T>
      <Tag x={h.x + 80} y={h.y + 8} n={1}>link pair: solder + tape</Tag>
      <Zoom n={1} x={290} y={80} r={36} cx={h.nFinish[0] + 6} cy={h.y + 44} scale={3}>
        <Wire s={s} w={{ role: "nFinish", pts: [h.nFinish, [h.nFinish[0], h.y + 48], [h.nFinish[0] + 6, h.y + 48]] }} />
        <Wire s={s} w={{ role: "sFinish", pts: [h.sFinish, [h.sFinish[0], h.y + 48], [h.nFinish[0] + 6, h.y + 48]] }} />
        <rect x={h.nFinish[0]} y={h.y + 44} width={12} height={8} rx={2} fill="#1d1d1d" stroke="#888" strokeWidth={0.4} />
      </Zoom>
      <T x={290} y={128} anchor="middle" size={8} color={C.accent} weight={700} n={1}>north + south finish</T>
      <T x={290} y={139} anchor="middle" size={8} color={C.accent} weight={700} n={1}>soldered, taped, not grounded</T>
      <Tag x={v.l3[0] + 30} y={96} n={2}>hot → lug 3 · ground + bare → ground</Tag>
      <Tag x={240} y={110} n={3} anchor="middle">lug 2 → tip · sleeve → ground</Tag>
      <Tag x={250} y={110} n={4} anchor="middle">.022 µF tone cap · link pot backs</Tag>
      <N n={1} x={h.x + 100} y={h.y + 48} />
      <N n={2} x={v.l3[0] + 18} y={110} />
      <N n={3} x={250} y={128} />
      <N n={4} x={t.x + 34} y={160} />
    </WiringFigure>
  );
}

export function LesPaulWiring({ s }: { s: Schemes }) {
  const hn = humbucker(18, 14);
  const hb = humbucker(168, 14);
  const nv = pot(40, POT_Y);
  const nt = pot(110, POT_Y);
  const bv = pot(186, POT_Y);
  const bt = pot(256, POT_Y);
  const sw = toggle3(312, 92);
  const j = jack(320, 196);
  const tone = (v: typeof nv, t: typeof nt) => (
    <g>
      <Wire s={s} w={{ role: "signal", pts: [v.l3, [v.l3[0], 150], [v.l3[0] + 10, 150]], n: 3 }} />
      <Cap a={[v.l3[0] + 10, 150]} b={[t.l2[0] - 4, 150]} label=".022" n={3} />
      <Wire s={s} w={{ role: "signal", pts: [[t.l2[0] - 4, 150], [t.l2[0], 150], t.l2], n: 3 }} />
      <Wire s={s} w={lug1ToBack(t, 3)} />
      <Wire s={s} w={lug1ToBack(v, 2)} />
      <Wire s={s} w={toRail(v, RAIL_Y, 4)} />
      <Wire s={s} w={toRail(t, RAIL_Y, 4)} />
    </g>
  );
  return (
    <WiringFigure
      s={s}
      title="Les Paul / SG modern wiring (2 volumes, 2 tones, 3-way toggle)"
      roles={["hot", "nFinish", "sFinish", "ground", "bare", "signal", "gnd"]}
      how={[
        "Each humbucker: join and tape the series-link pair; hot to its OWN volume's lug 3; ground and bare to ground.",
        "Each volume: lug 1 to its pot back; lug 2 to the toggle — neck volume to the rhythm leaf, bridge volume to the treble leaf.",
        "Each tone (modern wiring): a .022 µF cap from its volume's lug 3 to the tone's lug 2; tone lug 1 to its pot back.",
        "Toggle output to the jack tip. Jack sleeve, toggle frame and the bridge/tailpiece ground to the ground wire linking all four pot backs.",
      ]}
      note="500k audio pots. Pots are laid out in a row here for clarity (in the guitar the volumes sit above the tones). With this wiring one volume at 0 silences the middle position — see 'Independent volume fix'."
    >
      <Humbucker h={hn} label="neck humbucker" />
      <Humbucker h={hb} label="bridge humbucker" />
      <Pot p={nv} label="neck vol" />
      <Pot p={nt} label="neck tone" />
      <Pot p={bv} label="bridge vol" />
      <Pot p={bt} label="bridge tone" />
      <Toggle3 t={sw} />
      <Jack j={j} />
      <Rail x1={14} x2={344} y={RAIL_Y} n={[1, 4]} />
      <HbLeads h={hn} s={s} hotTo={nv.l3} hotY={104} chan={72} railY={RAIL_Y} linkN={1} hotN={1} gndN={1} />
      <HbLeads h={hb} s={s} hotTo={bv.l3} hotY={108} chan={218} railY={RAIL_Y} linkN={1} hotN={1} gndN={1} />
      {tone(nv, nt)}
      {tone(bv, bt)}
      <Wire s={s} w={{ role: "signal", pts: [nv.l2, [nv.l2[0], 128], [sw.rhythm[0], 128], sw.rhythm], n: 2 }} />
      <Wire s={s} w={{ role: "signal", pts: [bv.l2, [bv.l2[0], 136], [sw.treble[0], 136], sw.treble], n: 2 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.out, [sw.out[0], 70], [352, 70], [352, 166], [j.tip[0], 166], j.tip], n: 4 }} />
      <Wire s={s} w={{ role: "gnd", pts: [sw.gnd, [sw.gnd[0] + 0, 150], [300, 150], [300, RAIL_Y]], n: 4 }} />
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0], RAIL_Y], [344, RAIL_Y]], n: 4 }} />
      <T x={14} y={RAIL_Y + 20} size={8}>(also solder the tailpiece/bridge ground to this wire)</T>
      <Tag x={180} y={78} n={1} anchor="middle">each hot → its own volume's lug 3</Tag>
      <Tag x={180} y={78} n={2} anchor="middle">vol lug 2 → toggle: neck=rhythm, bridge=treble</Tag>
      <Tag x={180} y={224} n={3} anchor="middle">modern: cap from vol lug 3 to tone lug 2</Tag>
      <Tag x={150} y={60} n={4} anchor="middle">toggle out → jack tip · all grounds to the rail</Tag>
      <N n={1} x={hn.x + 96} y={hn.y + 40} />
      <N n={2} x={262} y={124} />
      <N n={3} x={150} y={60} />
      <N n={4} x={344} y={54} />
    </WiringFigure>
  );
}

export function StratWiring({ s }: { s: Schemes }) {
  const pn = single(26, 18);
  const pm = single(136, 18);
  const pb = single(246, 18);
  const sw = lever(150, 92, ["B", "M", "N"]);
  const v = pot(54, POT_Y + 8);
  const t1 = pot(154, POT_Y + 8);
  const t2 = pot(254, POT_Y + 8);
  const j = jack(326, 200);
  const rail = RAIL_Y + 10;
  return (
    <WiringFigure
      s={s}
      viewBox="0 0 360 280"
      title="Strat standard (5-way, volume, neck tone, middle tone)"
      roles={["scHot", "scGround", "signal", "gnd"]}
      how={[
        "Map the switch first: on deck A find the lug live in position 1 (bridge) = B, position 3 = M, position 5 = N, plus the common. Deck B is the same.",
        "Hot leads: bridge to A-B, middle to A-M, neck to A-N. All three ground leads to ground.",
        "Deck A common to volume lug 3, with a jumper from deck A common to deck B common.",
        "Deck B N-lug to tone 1's lug 2 (neck tone), deck B M-lug to tone 2's lug 2 (middle tone). Join the two tones' lug 1 and run a .047 µF cap from there to ground.",
        "Volume lug 1 to its back, lug 2 to the jack tip; jack sleeve and the trem-claw ground to the ground wire linking the pot backs.",
      ]}
      note="250k audio pots. Deck B's bridge lug stays empty — that's why the bridge pickup has no tone in standard wiring."
    >
      <Single s={pn} label="neck" />
      <Single s={pm} label="middle" />
      <Single s={pb} label="bridge" />
      <Hl n={[1, 3, 4]}>
        <Lever l={sw} label="5-way switch" />
      </Hl>
      <Pot p={v} label="volume" />
      <Pot p={t1} label="tone 1 (neck)" />
      <Pot p={t2} label="tone 2 (middle)" />
      <Jack j={j} />
      <Rail x1={10} x2={338} y={rail} n={[2, 5]} />
      <Wire s={s} w={{ role: "scHot", pts: [pb.hot, [pb.hot[0], 66], [sw.A["B"]![0], 66], sw.A["B"]!], n: 2 }} />
      <Wire s={s} w={{ role: "scHot", pts: [pm.hot, [pm.hot[0], 58], [sw.A["M"]![0], 58], sw.A["M"]!], n: 2 }} />
      <Wire s={s} w={{ role: "scHot", pts: [pn.hot, [pn.hot[0], 50], [sw.A["N"]![0], 50], sw.A["N"]!], n: 2 }} />
      {[pn, pm, pb].map((p, i) => (
        <Wire key={i} s={s} w={{ role: "scGround", pts: [p.gnd, [p.gnd[0], 44 - i * 3], [10 + i * 4, 44 - i * 3], [10 + i * 4, rail]], n: 2 }} />
      ))}
      <Wire s={s} w={{ role: "signal", pts: [sw.A["C"]!, sw.B["C"]!], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.B["C"]!, [sw.B["C"]![0], 152], [v.l3[0], 152], v.l3], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.B["N"]!, [sw.B["N"]![0], 142], [t1.l2[0], 142], t1.l2], n: 4 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.B["M"]!, [sw.B["M"]![0], 136], [t2.l2[0], 136], t2.l2], n: 4 }} />
      <Wire s={s} w={{ role: "gnd", pts: [t1.l1, [t1.l1[0], 160], [t2.l1[0], 160], t2.l1], n: 4 }} />
      <Cap a={[204, 160]} b={[204, rail]} label=".047 µF" n={4} />
      <Wire s={s} w={lug1ToBack(v, 5)} />
      {[v, t1, t2].map((p, i) => (
        <Wire key={`r${i}`} s={s} w={toRail(p, rail, 5)} />
      ))}
      <Wire s={s} w={{ role: "signal", pts: [v.l2, [v.l2[0], 128], [300, 128], [300, 176], [j.tip[0], 176], j.tip], n: 5 }} />
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0], rail], [338, rail]], n: 5 }} />
      <At n={1}>
        <Tag x={sw.x + 20} y={sw.y - 22} anchor="middle">meter: which lug is live in 1 · 3 · 5</Tag>
        <Tag x={246} y={100} color={C.dim}>B=1 · M=3 · N=5</Tag>
      </At>
      <Tag x={180} y={78} n={2} anchor="middle">hots → deck A · grounds → ground</Tag>
      <Tag x={sw.x + 30} y={sw.y - 22} n={3} anchor="middle">jumper the commons → volume lug 3</Tag>
      <Tag x={300} y={112} n={4} anchor="middle">B-N → tone 1 · B-M → tone 2</Tag>
      <Tag x={180} y={118} n={5} anchor="middle">vol lug 2 → tip · grounds to the rail</Tag>
      <T x={10} y={rail + 20} size={8}>(also solder the trem-claw ground to this wire)</T>
      <N n={1} x={sw.x - 50} y={sw.y + 50} />
      <N n={2} x={120} y={36} />
      <N n={3} x={sw.x - 50} y={sw.y + 50} />
      <N n={4} x={222} y={172} />
      <N n={5} x={330} y={60} />
    </WiringFigure>
  );
}

export function TeleWiring({ s }: { s: Schemes }) {
  const pn = single(30, 18);
  const pb = single(250, 18);
  const sw = lever(140, 92, ["1", "2", "3"]);
  const v = pot(90, POT_Y + 4);
  const t = pot(200, POT_Y + 4);
  const j = jack(312, 196);
  const rail = RAIL_Y + 6;
  return (
    <WiringFigure
      s={s}
      viewBox="0 0 360 275"
      title="Telecaster standard 3-way"
      roles={["scHot", "scGround", "signal", "gnd"]}
      how={[
        "Map the switch first (position 1 = bridge, lever toward the bridge).",
        "Deck A: jumper the position-1 and position-2 lugs and solder the bridge hot there. Deck B: jumper position 2 and position 3 and solder the neck hot there.",
        "Both ground leads to ground. Join both deck commons and run them to volume lug 3.",
        "Volume lug 1 to its back, lug 2 to the jack tip. Tone: volume lug 3 to tone lug 2, a .047 µF cap from tone lug 1 to ground. Jack sleeve to the ground wire linking the pot backs.",
      ]}
      note="Result: bridge alone (1), both (2), neck alone (3). 250k audio pots. On a Tele the bridge pickup's ground also grounds its base plate and the strings."
    >
      <Single s={pn} label="neck" />
      <Single s={pb} label="bridge" />
      <Hl n={[1, 2, 3]}>
        <Lever l={sw} label="3-way switch" />
      </Hl>
      <Pot p={v} label="volume" />
      <Pot p={t} label="tone" />
      <Jack j={j} />
      <Rail x1={12} x2={324} y={rail} n={[3, 4]} />
      <Wire s={s} w={{ role: "signal", pts: [sw.A["1"]!, [sw.A["1"]![0], 82], [sw.A["2"]![0], 82], sw.A["2"]!], n: 2 }} />
      <Wire s={s} w={{ role: "scHot", pts: [pb.hot, [pb.hot[0], 64], [sw.A["1"]![0], 64], sw.A["1"]!], n: 2 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.B["2"]!, [sw.B["2"]![0], sw.B["2"]![1] + 14], [sw.B["3"]![0], sw.B["3"]![1] + 14], sw.B["3"]!], n: 2 }} />
      <Wire s={s} w={{ role: "scHot", pts: [pn.hot, [pn.hot[0], 56], [120, 56], [120, sw.B["2"]![1] - 8], [sw.B["2"]![0], sw.B["2"]![1] - 8], sw.B["2"]!], n: 2 }} />
      {[pn, pb].map((p, i) => (
        <Wire key={i} s={s} w={{ role: "scGround", pts: [p.gnd, [p.gnd[0], 46 - i * 4], [12 + i * 5, 46 - i * 4], [12 + i * 5, rail]], n: 3 }} />
      ))}
      <Wire s={s} w={{ role: "signal", pts: [sw.A["C"]!, sw.B["C"]!], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [sw.B["C"]!, [sw.B["C"]![0], 150], [v.l3[0], 150], v.l3], n: 3 }} />
      <Wire s={s} w={lug1ToBack(v, 4)} />
      <Wire s={s} w={{ role: "signal", pts: [v.l2, [v.l2[0], 140], [j.tip[0], 140], j.tip], n: 4 }} />
      <Wire s={s} w={{ role: "signal", pts: [v.l3, [v.l3[0] + 10, 158], [t.l2[0], 158], t.l2], n: 4 }} />
      <Cap a={t.l1} b={[t.l1[0] - 24, rail - 20]} label=".047 µF" n={4} />
      <Wire s={s} w={{ role: "gnd", pts: [[t.l1[0] - 24, rail - 20], [t.l1[0] - 24, rail]], n: 4 }} />
      {[v, t].map((p, i) => (
        <Wire key={`r${i}`} s={s} w={toRail(p, rail, 4)} />
      ))}
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0], rail], [324, rail]], n: 4 }} />
      <At n={1}>
        <Tag x={sw.x + 30} y={sw.y - 46} anchor="middle">position 1 = lever toward the bridge</Tag>
        <Tag x={sw.x + 30} y={sw.y - 24} anchor="middle" color={C.dim}>1 bridge · 2 both · 3 neck</Tag>
      </At>
      <Tag x={sw.x + 30} y={sw.y - 24} n={2} anchor="middle">A: 1+2 → bridge hot · B: 2+3 → neck hot</Tag>
      <Tag x={sw.x + 30} y={sw.y - 24} n={3} anchor="middle">commons joined → volume lug 3</Tag>
      <Tag x={250} y={120} n={4} anchor="middle">vol 2 → tip · tone cap → ground</Tag>
      <N n={1} x={sw.x + 98} y={sw.y + 16} />
      <N n={2} x={330} y={118} />
      <N n={3} x={44} y={120} />
      <N n={4} x={250} y={150} />
    </WiringFigure>
  );
}

export function CoilSplitWiring({ s }: { s: Schemes }) {
  const h = humbucker(40, 18);
  const v = pot(170, 160);
  const j = jack(306, 168);
  const row = { down: [v.x - 18, 214] as P, com: [v.x, 214] as P, up: [v.x + 18, 214] as P };
  const link: P = [h.nFinish[0] + 6, h.y + 48];
  const rail = 250;
  return (
    <WiringFigure
      s={s}
      viewBox="0 0 360 275"
      title="Coil split with a push-pull pot"
      roles={["hot", "nFinish", "sFinish", "ground", "bare", "signal", "gnd"]}
      how={[
        "Wire the pot part exactly like the volume it replaces: hot to lug 3, lug 2 to the jack tip, lug 1 to ground; ground and bare to ground.",
        "Keep the series-link pair soldered together (untaped) and run ONE wire from that joint to the middle (common) lug of one switch row.",
        "With a meter, find the outer lug of that row that connects to the common when the knob is PULLED up, and wire it to ground.",
        "Pushed down = full humbucker. Pulled up = the link is grounded and only the north coil (the hot lead's coil) sings.",
      ]}
      note="To keep the other coil instead, wire the pulled lug to the pickup's hot rather than to ground. Which coil is the slug or screw coil depends on the brand — see the colour note above the steps."
    >
      <Humbucker h={h} label="humbucker" />
      <Pot p={v} label="500k" />
      <rect x={v.x - 30} y={188} width={60} height={40} rx={4} fill="#4a5058" stroke={C.line} />
      <T x={v.x} y={240} anchor="middle" size={8} color={C.ink} weight={700}>push-pull switch (under the pot)</T>
      {[row.down, row.com, row.up].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill={C.metal} />
      ))}
      {[row.down, row.com, row.up].map(([x, y], i) => (
        <rect key={`b${i}`} x={x - 3} y={y - 19} width={6} height={6} fill={C.metal} opacity={0.5} />
      ))}
      <Jack j={j} />
      <Rail x1={20} x2={330} y={rail} n={[1, 3]} />
      <Wire s={s} w={{ role: "nFinish", pts: [h.nFinish, [h.nFinish[0], link[1]], link], n: [2, 4] }} />
      <Wire s={s} w={{ role: "sFinish", pts: [h.sFinish, [h.sFinish[0], link[1]], link], n: [2, 4] }} />
      <Wire s={s} w={{ role: "signal", pts: [link, [link[0], 222], [row.com[0] - 40, 222], [row.com[0] - 40, 232], [row.com[0], 232], row.com], n: [2, 4] }} />
      <Wire s={s} w={{ role: "gnd", pts: [row.up, [row.up[0] + 22, row.up[1]], [row.up[0] + 22, rail]], n: [3, 4] }} />
      <T x={row.up[0] + 26} y={row.up[1] - 8} size={8} color={C.ink}>live when pulled</T>
      <Wire s={s} w={{ role: "hot", pts: [h.hot, [h.hot[0], 106], [v.l3[0], 106], v.l3], n: 1 }} />
      <Wire s={s} w={{ role: "ground", pts: [h.ground, [h.ground[0], h.y + 64], [30, h.y + 64], [30, rail]], n: 1 }} />
      <Wire s={s} w={{ role: "bare", pts: [h.bare, [h.bare[0], h.y + 70], [24, h.y + 70], [24, rail]], n: 1 }} />
      <Wire s={s} w={lug1ToBack(v, 1)} />
      <Wire s={s} w={{ role: "gnd", pts: [[v.x - 20, v.y + 6], [v.x - 34, v.y + 6], [v.x - 34, rail]], n: 1 }} />
      <Wire s={s} w={{ role: "signal", pts: [v.l2, [v.l2[0], 118], [j.tip[0], 118], j.tip], n: 1 }} />
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0], rail], [330, rail]], n: 1 }} />
      <Tag x={250} y={80} n={1} anchor="middle">wire the pot like a normal volume</Tag>
      <Tag x={link[0] + 14} y={link[1] + 22} n={2}>link pair → switch common (one wire)</Tag>
      <Tag x={340} y={150} n={3} anchor="end">meter: lug live when PULLED → ground</Tag>
      <At n={4}>
        <Tag x={250} y={70} anchor="middle" color={C.good}>pushed = full humbucker</Tag>
        <Tag x={250} y={92} anchor="middle">pulled = link grounded → north coil only</Tag>
      </At>
      <T x={v.x + 26} y={v.y + 4} size={8} color={C.ink}>push-pull pot</T>
      <N n={1} x={340} y={130} />
      <N n={2} x={link[0] - 16} y={160} />
      <N n={3} x={row.up[0] + 44} y={226} />
      <N n={4} x={340} y={130} />
    </WiringFigure>
  );
}

export function JazzBassWiring({ s }: { s: Schemes }) {
  const pn = single(40, 18);
  const pb = single(220, 18);
  const vn = pot(70, POT_Y);
  const vb = pot(170, POT_Y);
  const t = pot(270, POT_Y);
  const j = jack(320, 110);
  return (
    <WiringFigure
      s={s}
      title="Jazz Bass VVT (volume, volume, tone)"
      roles={["scHot", "scGround", "signal", "gnd"]}
      how={[
        "Neck pickup hot to the neck volume's lug 3; bridge pickup hot to the bridge volume's lug 3. Both pickup grounds to ground.",
        "Lug 1 of each volume to its pot back.",
        "Join lug 2 of both volumes — that joint is the output. Run it to the tone's lug 2 and to the jack tip.",
        "A .047 µF cap from tone lug 1 to ground. Jack sleeve and the bridge ground to the ground wire linking the pot backs.",
      ]}
      note="250k audio pots. With this standard layout one volume at 0 mutes both pickups — the 'Independent volume fix' swaps lugs 2 and 3 on each volume."
    >
      <Single s={pn} label="neck" />
      <Single s={pb} label="bridge" />
      <Pot p={vn} label="neck vol" />
      <Pot p={vb} label="bridge vol" />
      <Pot p={t} label="tone" />
      <Jack j={j} />
      <Rail x1={14} x2={340} y={RAIL_Y} n={[1, 4]} />
      <Wire s={s} w={{ role: "scHot", pts: [pn.hot, [pn.hot[0], 70], [vn.l3[0], 70], vn.l3], n: 1 }} />
      <Wire s={s} w={{ role: "scHot", pts: [pb.hot, [pb.hot[0], 62], [vb.l3[0], 62], vb.l3], n: 1 }} />
      <Wire s={s} w={{ role: "scGround", pts: [pn.gnd, [pn.gnd[0], 50], [14, 50], [14, RAIL_Y]], n: 1 }} />
      <Wire s={s} w={{ role: "scGround", pts: [pb.gnd, [pb.gnd[0], 46], [20, 46], [20, RAIL_Y]], n: 1 }} />
      {[vn, vb].map((v, i) => (
        <Wire key={i} s={s} w={lug1ToBack(v, 2)} />
      ))}
      <Wire s={s} w={{ role: "signal", pts: [vn.l2, [vn.l2[0], 132], [vb.l2[0], 132], vb.l2], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [[vb.l2[0], 132], [t.l2[0], 132], t.l2], n: 3 }} />
      <Wire s={s} w={{ role: "signal", pts: [[t.l2[0], 132], [j.tip[0], 132], j.tip], n: 3 }} />
      <Cap a={t.l1} b={[t.l1[0] - 26, t.l1[1] + 30]} label=".047 µF" n={4} />
      <Wire s={s} w={{ role: "gnd", pts: [[t.l1[0] - 26, t.l1[1] + 30], [t.l1[0] - 26, RAIL_Y]], n: 4 }} />
      {[vn, vb, t].map((p, i) => (
        <Wire key={`r${i}`} s={s} w={toRail(p, RAIL_Y, 4)} />
      ))}
      <Wire s={s} w={{ role: "gnd", pts: [j.sleeve, [j.sleeve[0] + 8, j.sleeve[1]], [j.sleeve[0] + 8, RAIL_Y], [340, RAIL_Y]], n: 4 }} />
      <Tag x={180} y={90} n={1} anchor="middle">each hot → its volume's lug 3</Tag>
      <Tag x={120} y={110} n={2} anchor="middle">lug 1 bent onto the pot back</Tag>
      <Tag x={180} y={100} n={3} anchor="middle">both lug 2s joined = output → tone + tip</Tag>
      <Tag x={180} y={112} n={4} anchor="middle">.047 µF to ground · link all grounds</Tag>
      <N n={1} x={44} y={140} />
      <N n={2} x={36} y={200} />
      <N n={3} x={44} y={140} />
      <N n={4} x={300} y={222} />
    </WiringFigure>
  );
}

export function TrebleBleedWiring({ s }: { s: Schemes }) {
  const v = pot(180, 170);
  return (
    <WiringFigure
      s={s}
      viewBox="0 0 360 230"
      title="Treble bleed across the volume pot"
      roles={["signal", "gnd"]}
      how={[
        "Find the volume's input (lug 3 — from the pickup or switch) and output (lug 2 — to the jack).",
        "Cap only: solder a small capacitor straight across lug 3 and lug 2, legs short and clear of the pot back.",
        "Cap + resistor in parallel (common 1 nF + 150k): lay them side by side, twist their legs together at each end, and solder one end to lug 3 and the other to lug 2 (shown).",
        "Clip it on temporarily first, roll the volume from 10 down to 3 and listen — then solder it in.",
      ]}
      note="Published values range from about 470–1200 pF, often with a resistor (e.g. 1 nF + 150k, Fender's 1200 pF + 20k). Sources disagree on series vs parallel; parallel is the common layout."
    >
      <Pot p={v} label="volume" />
      <Wire s={s} w={{ role: "signal", pts: [[40, 60], [v.l3[0], 60], v.l3], n: 1 }} />
      <T x={40} y={50} size={9} color={C.ink}>from pickup / switch</T>
      <Wire s={s} w={{ role: "signal", pts: [v.l2, [v.l2[0], 90], [40, 90]], n: 1 }} />
      <T x={40} y={80} size={9} color={C.ink}>to jack tip</T>
      <Wire s={s} w={lug1ToBack(v)} />
      <At n={1}>
        <Tag x={v.l3[0] + 24} y={60} color={C.good}>lug 3 = IN</Tag>
        <Tag x={v.l2[0] + 24} y={104}>lug 2 = OUT</Tag>
      </At>
      <At n={2}>
        {/* cap only, legs short, straight across lug 3 and lug 2 */}
        {(() => {
          const cap = (
            <g>
              <path d={`M ${v.l3[0]} ${v.l3[1] + 2} L ${v.l3[0] - 2} ${v.l3[1] - 10} M ${v.l2[0]} ${v.l2[1] + 2} L ${v.l2[0] + 4} ${v.l2[1] - 8}`} stroke="#b8bec6" strokeWidth={1} fill="none" />
              <ellipse cx={v.x + 8} cy={v.l2[1] - 12} rx={7} ry={3.6} fill="#3b82c4" stroke="#1d4f80" strokeWidth={0.6} />
            </g>
          );
          return (
            <>
              {cap}
              <Zoom x={290} y={150} r={40} cx={v.x + 7} cy={v.l2[1] - 4} scale={2.6} label="cap across lug 3 ↔ lug 2">
                <circle cx={v.x} cy={v.y} r={22} fill="#59606a" />
                {[v.l1, v.l2, v.l3].map(([x, y], i) => (
                  <rect key={i} x={x - 3} y={y} width={6} height={9} fill={C.metal} stroke={C.line} strokeWidth={0.4} />
                ))}
                {cap}
              </Zoom>
            </>
          );
        })()}
        <Tag x={250} y={24} anchor="middle">small cap straight across lug 3 ↔ lug 2</Tag>
        <Tag x={250} y={46} anchor="middle" color={C.dim}>short legs, clear of the pot back</Tag>
      </At>
      <At n={[3, 4]}>
        {/* cap ‖ resistor between lug 3 (A side) and lug 2 (B side) */}
        <path d={`M ${v.l3[0]} 128 L 222 128 M 222 120 L 222 136 M 222 120 L 232 120 M 254 120 L 270 120 M 222 136 L 232 136 M 254 136 L 270 136 M 270 120 L 270 136 M 270 128 L 290 128 L 290 104 L ${v.l2[0]} 104`} fill="none" stroke="#9aa1aa" strokeWidth={1.8} />
        <circle cx={v.l3[0]} cy={128} r={2.6} fill="#d8dce0" />
        <circle cx={v.l2[0]} cy={104} r={2.6} fill="#d8dce0" />
        <ellipse cx={243} cy={120} rx={11} ry={5} fill="#3b82c4" stroke="#1d4f80" />
        <rect x={232} y={133} width={22} height={6} rx={2} fill="#d8c08a" stroke="#7a6a3a" />
        <T x={296} y={118} size={9} color={C.accent} weight={700}>cap 1 nF</T>
        <T x={296} y={138} size={9} color={C.accent} weight={700}>resistor 150k</T>
      </At>
      <Tag x={250} y={24} n={3} anchor="middle">side by side, legs twisted at each end</Tag>
      <At n={4}>
        <Tag x={250} y={24} anchor="middle">clip on first: roll volume 10 → 3, listen</Tag>
        <Tag x={290} y={196} anchor="middle" color={C.good}>then solder it in</Tag>
      </At>
      <N n={1} x={v.l3[0] + 16} y={v.l3[1] + 14} />
      <N n={2} x={v.x - 60} y={v.y} />
      <N n={3} x={243} y={96} />
      <N n={4} x={40} y={140} />
    </WiringFigure>
  );
}
