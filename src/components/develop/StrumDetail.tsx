import { deadNotes, hfAboveRoomDb, soundingNotes, type StrumMeasure, type StrumReport, type TargetChord, type Thresholds } from "@/lib/listen/score";
import { rootByName, spellDegree, pretty } from "@/lib/theory";
import { cn } from "@/lib/utils";

const PC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/**
 * One measured number on a scale, with the threshold lines that decide its verdict.
 * `scale` maps a value to 0..1 across the bar.
 */
function Meter({ label, value, text, lines, scale, tone, title }: {
  label: string;
  value: number;
  text: string;
  lines: { at: number; name: string }[];
  scale: (v: number) => number;
  tone: "good" | "fix" | "unsure" | "plain";
  title?: string;
}) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, scale(v) * 100))}%`;
  return (
    <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 text-xs" title={title}>
      <span className="truncate font-mono font-semibold">{label}</span>
      <div className="relative h-3 rounded-full bg-secondary">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", tone === "good" ? "bg-extension/80" : tone === "fix" ? "bg-root/80" : tone === "unsure" ? "bg-muted-foreground/50" : "bg-accent/70")} style={{ width: pos(value) }} />
        {lines.map((l) => (
          <span key={l.name} className="absolute -top-0.5 h-4 w-0.5 bg-foreground/80" style={{ left: pos(l.at) }} title={`${l.name}: ${l.at}`} />
        ))}
      </div>
      <span className="text-right font-mono tabular-nums text-muted-foreground">{text}</span>
    </div>
  );
}

const sqrtScale = (max: number) => (v: number) => Math.sqrt(Math.max(0, v) / max);
const linScale = (min: number, max: number) => (v: number) => (v - min) / (max - min);

/** The raw numbers behind one strum's verdicts, against the current thresholds. */
export function StrumDetail({ m, r, target, T }: { m: StrumMeasure; r: StrumReport; target: TargetChord; T: Thresholds }) {
  const root = rootByName(target.rootName);
  const above = hfAboveRoomDb(m);
  const sounding = soundingNotes(m);
  const deadPcs = new Set(deadNotes(m, T).map((ns) => ns[0]!.midi % 12));
  const notesByPc = new Map<number, typeof sounding>();
  for (const n of sounding) notesByPc.set(n.midi % 12, [...(notesByPc.get(n.midi % 12) ?? []), n]);

  return (
    <div className="space-y-3 rounded-md border border-border/70 bg-background/40 p-2.5" data-testid="strum-detail">
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Chord notes — strength (lines: faint, heard)</p>
        {target.degrees.map((d, i) => {
          const t = m.chord.target.find((x) => x.pc === m.pcs[i])!;
          const st = r.accuracy.notes[i]!.status;
          return (
            <Meter key={d} label={pretty(spellDegree(root, d))} value={t.strength} text={`${t.strength.toFixed(3)}`} title={r.accuracy.notes[i]!.note}
              lines={[{ at: T.faint, name: "faint" }, { at: T.heard, name: "heard" }]} scale={sqrtScale(1)}
              tone={st === "heard" ? "good" : st === "missing" ? "fix" : "unsure"} />
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Notes not in the chord (lines: maybe, wrong)</p>
        {m.chord.extras.length ? (
          [...new Map(m.chord.extras.map((e) => [e.pc, e])).values()].slice(0, 5).map((e) => (
            <Meter key={e.pc} label={`+${PC[e.pc]}`} value={e.strength} text={e.strength.toFixed(3)}
              lines={[{ at: T.maybeWrong, name: "maybe" }, { at: T.wrong, name: "wrong" }]} scale={sqrtScale(1)}
              tone={e.strength >= T.wrong ? "fix" : e.strength >= T.maybeWrong ? "unsure" : "plain"} />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">None found.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Buzz & level</p>
        {m.hfRelDb !== null ? (
          <Meter label="Buzz" value={m.hfRelDb} text={`${m.hfRelDb.toFixed(0)} dB`} title="Hiss between the notes (3–10 kHz) compared with the strongest note"
            lines={[{ at: T.buzzSome, name: "some" }, { at: T.buzzStrong, name: "strong" }]} scale={linScale(-90, -50)}
            tone={r.clarity.buzz === "unknown" ? "unsure" : m.hfRelDb >= T.buzzSome ? "fix" : "good"} />
        ) : (
          <p className="text-xs text-muted-foreground">Buzz not judged — another strum or sound came within half a second (in quick rhythm playing the hiss is the playing itself).</p>
        )}
        {above !== null ? (
          <Meter label="Over room" value={above} text={`${above >= 0 ? "+" : ""}${above.toFixed(1)} dB`} title="How far the hiss is above the quiet room's hiss"
            lines={[{ at: T.buzzAboveRoom, name: "counts" }]} scale={linScale(-10, 30)} tone="plain" />
        ) : null}
        <Meter label="Level" value={m.peakDb} text={`${m.peakDb.toFixed(0)} dB`} title="How loud the strum was (first 250 ms)"
          lines={[{ at: T.tooQuietDb, name: "too quiet" }]} scale={linScale(-80, 0)} tone={r.level.tooQuiet ? "unsure" : "plain"} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Ring-out — whole chord {m.ring.seconds.toFixed(2)} s{m.ring.stillRinging ? "+" : ""} (line: died early)
        </p>
        {[...notesByPc.entries()].map(([pc, ns]) => {
          const secs = Math.max(...ns.map((n) => n.seconds));
          const still = ns.some((n) => n.stillRinging);
          // Same rule as the scoring.
          const dead = deadPcs.has(pc);
          return (
            <Meter key={pc} label={PC[pc]!} value={secs} text={`${secs.toFixed(2)} s${still ? "+" : ""}`}
              lines={[{ at: T.deadNoteSeconds, name: "dead" }]} scale={linScale(0, 3)} tone={dead ? "fix" : "good"} />
          );
        })}
        {m.ring.seconds < T.deadNoteSeconds + 0.3 ? (
          <p className="text-[11px] text-muted-foreground">Chord rang under {(T.deadNoteSeconds + 0.3).toFixed(1)} s — too short to judge dead notes.</p>
        ) : null}
      </div>
    </div>
  );
}
