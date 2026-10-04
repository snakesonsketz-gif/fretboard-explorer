import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SCALES,
  degreeToSemitones,
  harmonize,
  pcsToDegrees,
  pretty,
  rootByName,
  type Degree,
} from "@/lib/theory";

/** Conventional key names around the circle (fifths order, starting at C). */
const MAJOR_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
const MINOR_KEYS = ["A", "E", "B", "F#", "C#", "G#", "D#", "Bb", "F", "C", "G", "D"];
const ACCIDENTALS = ["0", "1♯", "2♯", "3♯", "4♯", "5♯", "6♯", "5♭", "4♭", "3♭", "2♭", "1♭"];

interface Props {
  rootPc: number;
  onPickKey: (rootName: string, scaleId: "ionian" | "aeolian") => void;
  onLoadChord: (rootName: string, degrees: Degree[]) => void;
}

export function CircleOfFifths({ rootPc, onPickKey, onLoadChord }: Props) {
  const [dir, setDir] = useState<"fifths" | "fourths">("fifths");
  const [minor, setMinor] = useState(false);
  const order = dir === "fifths" ? [...Array(12).keys()] : [0, ...[...Array(11).keys()].map((i) => 11 - i)];
  const pcOfMajor = (i: number) => rootByName(MAJOR_KEYS[i]!).pc;
  const activeIdx = MAJOR_KEYS.findIndex((_, i) =>
    minor ? rootByName(MINOR_KEYS[i]!).pc === rootPc : pcOfMajor(i) === rootPc,
  );
  const idx = activeIdx < 0 ? 0 : activeIdx;
  const keyName = minor ? MINOR_KEYS[idx]! : MAJOR_KEYS[idx]!;
  const scale = SCALES.find((s) => s.id === (minor ? "aeolian" : "ionian"))!;
  const diatonic = harmonize(rootByName(keyName), scale, false);
  const near = (i: number) => {
    const d = (i - idx + 12) % 12;
    return d === 0 || d === 1 || d === 11;
  };

  const size = 260;
  const c = size / 2;
  const pos = (slot: number, r: number) => {
    const a = (slot / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };

  return (
    <div className="panel grid gap-4 p-4 md:grid-cols-[auto_1fr]">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(["fifths", "fourths"] as const).map((d) => (
            <Button key={d} size="sm" variant={dir === d ? "default" : "secondary"} className="h-7 px-2 text-xs capitalize" onClick={() => setDir(d)}>
              {d}
            </Button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant={!minor ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => setMinor(false)}>Major</Button>
          <Button size="sm" variant={minor ? "default" : "secondary"} className="h-7 px-2 text-xs" onClick={() => setMinor(true)}>Minor</Button>
        </div>
        <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]" role="group" aria-label="Circle of keys">
          <circle cx={c} cy={c} r={118} className="fill-none stroke-border" />
          <circle cx={c} cy={c} r={70} className="fill-none stroke-border" />
          {order.map((keyIdx, slot) => {
            const outer = pos(slot, 100);
            const inner = pos(slot, 56);
            const accPos = pos(slot, 124);
            const majActive = !minor && keyIdx === idx;
            const minActive = minor && keyIdx === idx;
            const isNear = near(keyIdx);
            return (
              <g key={keyIdx}>
                <g role="button" aria-label={`${MAJOR_KEYS[keyIdx]} major`} className="cursor-pointer"
                  onClick={() => { setMinor(false); onPickKey(MAJOR_KEYS[keyIdx]!, "ionian"); }}>
                  <circle cx={outer.x} cy={outer.y} r={17}
                    className={majActive ? "fill-primary" : isNear ? "fill-secondary stroke-primary" : "fill-secondary stroke-border"} />
                  <text x={outer.x} y={outer.y + 4} textAnchor="middle"
                    className={`font-mono text-[12px] font-semibold ${majActive ? "fill-primary-foreground" : "fill-foreground"}`}>
                    {pretty(MAJOR_KEYS[keyIdx]!)}
                  </text>
                </g>
                <g role="button" aria-label={`${MINOR_KEYS[keyIdx]} minor`} className="cursor-pointer"
                  onClick={() => { setMinor(true); onPickKey(MINOR_KEYS[keyIdx]!, "aeolian"); }}>
                  <circle cx={inner.x} cy={inner.y} r={13}
                    className={minActive ? "fill-primary" : isNear ? "fill-muted stroke-primary" : "fill-muted stroke-border"} />
                  <text x={inner.x} y={inner.y + 3.5} textAnchor="middle"
                    className={`font-mono text-[9.5px] ${minActive ? "fill-primary-foreground" : "fill-muted-foreground"}`}>
                    {pretty(MINOR_KEYS[keyIdx]!)}m
                  </text>
                </g>
                <text x={accPos.x} y={accPos.y + 3} textAnchor="middle" className="fill-muted-foreground text-[7px]">
                  {ACCIDENTALS[keyIdx]}
                </text>
              </g>
            );
          })}
          <text x={c} y={c + 4} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-semibold">
            {pretty(keyName)}{minor ? "m" : ""}
          </text>
        </svg>
      </div>
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Key signature</dt>
          <dd className="font-mono">{ACCIDENTALS[idx]}</dd>
          <dt className="text-muted-foreground">{minor ? "Relative major" : "Relative minor"}</dt>
          <dd>
            <button type="button" className="font-mono underline-offset-2 hover:underline"
              onClick={() => { setMinor(!minor); onPickKey(minor ? MAJOR_KEYS[idx]! : MINOR_KEYS[idx]!, minor ? "ionian" : "aeolian"); }}>
              {pretty(minor ? MAJOR_KEYS[idx]! : MINOR_KEYS[idx]!)}{minor ? "" : "m"}
            </button>
          </dd>
          <dt className="text-muted-foreground">Parallel</dt>
          <dd>
            <button type="button" className="font-mono underline-offset-2 hover:underline"
              onClick={() => { setMinor(!minor); onPickKey(keyName, minor ? "ionian" : "aeolian"); }}>
              {pretty(keyName)}{minor ? "" : "m"}
            </button>
          </dd>
          <dt className="text-muted-foreground">Neighbours (±1 accidental)</dt>
          <dd className="flex gap-2 font-mono">
            {[11, 1].map((o) => {
              const n = (minor ? MINOR_KEYS : MAJOR_KEYS)[(idx + o) % 12]!;
              return (
                <button key={o} type="button" className="underline-offset-2 hover:underline"
                  onClick={() => onPickKey(n, minor ? "aeolian" : "ionian")}>
                  {pretty(n)}{minor ? "m" : ""}
                </button>
              );
            })}
          </dd>
        </dl>
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            Diatonic triads of {pretty(keyName)} {minor ? "natural minor" : "major"} — tap to load
          </p>
          <div className="flex flex-wrap gap-1.5">
            {diatonic.map((h) => {
              const r = rootByName(h.notes[0]!);
              const first = degreeToSemitones(h.degrees[0]!);
              const rel = h.degrees.map((d) => degreeToSemitones(d) - first);
              return (
                <button key={h.roman} type="button"
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-left text-xs hover:border-primary"
                  onClick={() => onLoadChord(r.name, pcsToDegrees(rel))}>
                  <span className="block font-mono text-[10px] text-muted-foreground">{pretty(h.roman)}</span>
                  <span className="font-mono">{pretty(h.name)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
