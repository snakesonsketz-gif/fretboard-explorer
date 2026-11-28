import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Neck, type NeckDot } from "@/components/Neck";
import { pluck } from "@/lib/audio";
import { CAGED_ORDER, MODE_INFO, type CagedForm } from "@/lib/caged";
import { TUNINGS } from "@/lib/fretboard";
import { tabTuning } from "@/lib/tabs/model";
import { CLAIMED, DEFAULT_ANCHOR, STRING_NAMES, anchorsSupporting, checkClaim, inCagedPattern, modeFormula, modeRelations, modeShapeNotes, type ClaimStatus } from "@/lib/modeShapes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/modeshapes")({
  head: () => ({ meta: [
    { title: "Mode shapes — Fretlab" },
    { name: "description", content: "Play every mode from the same note and see which CAGED shape it sits on — with the exact fret offsets, intervals and degrees." },
  ] }),
  component: ModeShapesPage,
});

const std = TUNINGS[0]!;
const tt = tabTuning(std.id);
const TONICS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const NAME: Record<string, string> = { ionian: "Ionian", dorian: "Dorian", phrygian: "Phrygian", lydian: "Lydian", mixolydian: "Mixolydian", aeolian: "Aeolian", locrian: "Locrian" };
const STATUS: Record<ClaimStatus, { label: string; cls: string }> = {
  exact: { label: "exact", cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" },
  approx: { label: "±1 fret", cls: "border-amber-400/50 bg-amber-400/10 text-amber-300" },
  no: { label: "no match", cls: "border-rose-400/50 bg-rose-400/10 text-rose-300" },
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function Chip({ status }: { status: ClaimStatus }) {
  return <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS[status].cls)}>{STATUS[status].label}</span>;
}

function ModeShapesPage() {
  const [tonic, setTonic] = useState(4);
  const [modeId, setModeId] = useState("mixolydian");
  const [anchor, setAnchor] = useState(DEFAULT_ANCHOR);
  const [showAnchor, setShowAnchor] = useState(false);
  const [formPick, setFormPick] = useState<CagedForm | null>(null);

  const rel = useMemo(() => modeRelations(tonic, modeId, anchor)!, [tonic, modeId, anchor]);
  const form = formPick ?? CLAIMED[modeId]!;
  const cur = rel.rels.find((r) => r.form === form)!;
  const claim = checkClaim(tonic, modeId, anchor)!;
  const formula = modeFormula(modeId);
  const parentName = TONICS[rel.parentPc]!;
  const supporting = anchorsSupporting(modeId);

  const notes = useMemo(() => modeShapeNotes(std, tonic, modeId, cur), [tonic, modeId, cur]);
  const modalDots: NeckDot[] = notes.map((n) => ({ s: n.string, fret: n.fret, label: n.label, tone: n.isTonic ? "both" : "a", ring: n.isTonic }));
  const triad = [rel.parentPc, (rel.parentPc + 4) % 12, (rel.parentPc + 7) % 12];
  const shapeDots: NeckDot[] = [];
  notes.forEach((n) => {
    const ti = triad.indexOf(n.pc);
    const inChordWindow = n.fret >= cur.from && n.fret <= cur.to;
    if (ti >= 0 && inChordWindow) shapeDots.push({ s: n.string, fret: n.fret, label: ["1", "3", "5"][ti]!, tone: "b", ring: ti === 0 });
    else shapeDots.push({ s: n.string, fret: n.fret, tone: "faint" });
  });
  const from = 0;
  const to = Math.min(24, Math.max(12, cur.to + 3));
  const hear = (s: number, f: number) => { const open = tt.midis[s]; if (open !== undefined) pluck(open + f); };
  const sorted = rel.rels.slice().sort((a, b) => a.from - b.from);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 sm:px-4" data-testid="shapes-page">
        <section className="panel space-y-3 p-3 sm:p-4">
          <div>
            <h2 className="font-display text-2xl font-black">Mode shapes</h2>
            <p className="text-sm text-muted-foreground">Same note, seven modes — which CAGED shape does each one sit on?</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tonic">
            {TONICS.map((t, pc) => (
              <button key={t} type="button" onClick={() => setTonic(pc)} data-testid={`shapes-tonic-${t}`}
                className={cn("h-8 min-w-9 rounded-md border px-2 text-sm font-semibold", pc === tonic ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary")}>{t}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mode">
            {MODE_INFO.map((m) => (
              <button key={m.id} type="button" onClick={() => { setModeId(m.id); setFormPick(null); }} data-testid={`shapes-mode-${m.id}`}
                className={cn("h-8 rounded-md border px-2.5 text-sm font-semibold", m.id === modeId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary")}>{NAME[m.id]}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button type="button" aria-pressed={showAnchor} data-testid="shapes-anchor-toggle"
              onClick={() => { setShowAnchor((v) => !v); if (showAnchor) setAnchor(DEFAULT_ANCHOR); }}
              className={cn("h-8 rounded-md border px-2.5 text-sm font-semibold", showAnchor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-foreground")}>
              Measure from…
            </button>
            {showAnchor ? (
              <>
                <span>the {TONICS[tonic]} on the</span>
                <select className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground" value={anchor} onChange={(e) => setAnchor(Number(e.target.value))} data-testid="shapes-anchor">
                  {STRING_NAMES.map((n, i) => <option key={i} value={i}>{n} string</option>)}
                </select>
                <span>(fret {rel.tonicFret})</span>
              </>
            ) : <span>D string by default</span>}
          </div>
        </section>

        <section className="panel space-y-2 p-3 sm:p-4" data-testid="shapes-verdict">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-black">{TONICS[tonic]} {NAME[modeId]}</h3>
            <span className="text-sm text-muted-foreground">= {parentName} major notes, starting on {TONICS[tonic]}</span>
          </div>
          <p className="text-sm">
            Claimed shape: <b>{claim.claimed}</b> <Chip status={claim.status} />{" "}
            {inCagedPattern(modeId) ? null : <span className="mr-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground" data-testid="shapes-outside">outside the pattern</span>}
            <span className="text-muted-foreground">window starts {claim.offset === 0 ? "on the tonic fret" : `${signed(claim.offset)} fret${Math.abs(claim.offset) === 1 ? "" : "s"} from it`}.</span>
          </p>
          {claim.best !== claim.claimed && Math.abs(claim.bestOffset) < Math.abs(claim.offset) ? (
            <p className="text-sm text-muted-foreground">Closest on this string: the <b className="text-foreground">{claim.best}</b> shape ({signed(claim.bestOffset)}).</p>
          ) : null}
          {claim.status === "no" && supporting.length ? (
            <p className="text-xs text-muted-foreground">The claimed shape only lands within a fret when you measure from the {supporting.map((s) => `${STRING_NAMES[s.anchor]} string (${signed(s.offset)})`).join(", ")}.</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="CAGED shape">
            {CAGED_ORDER.map((f) => {
              const r = rel.rels.find((x) => x.form === f)!;
              const st: ClaimStatus = r.exact ? "exact" : r.approx ? "approx" : "no";
              return (
                <button key={f} type="button" onClick={() => setFormPick(f)} data-testid={`shapes-form-${f}`}
                  className={cn("flex min-w-14 flex-col items-center rounded-lg border px-2 py-1", f === form ? "border-primary bg-primary/15" : "border-border bg-secondary/60")}>
                  <span className="font-display text-lg font-black leading-none">{f}</span>
                  <span className={cn("text-[11px] font-semibold", st === "exact" ? "text-emerald-300" : st === "approx" ? "text-amber-300" : "text-muted-foreground")}>{signed(r.offset)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel space-y-3 p-3 sm:p-4" data-testid="shapes-necks">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{parentName} major — {form} shape <span className="font-normal text-muted-foreground">(frets {cur.from}–{cur.to}{cur.wrapped ? ", moved up an octave" : ""}{cur.usesOpen ? ", open strings" : ""})</span></h4>
            <Neck midis={tt.midis} names={tt.names} from={from} to={to} dots={shapeDots} band={{ from: cur.from, to: cur.to }} onTap={hear} testId="shapes-neck-caged" ariaLabel={`${form} shape of ${parentName} major`} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">The {TONICS[tonic]} {NAME[modeId]} pattern here <span className="font-normal text-muted-foreground">— numbers are intervals from {TONICS[tonic]}</span></h4>
            <Neck midis={tt.midis} names={tt.names} from={from} to={to} dots={modalDots} band={{ from: cur.from, to: cur.to }} onTap={hear} testId="shapes-neck-mode" ariaLabel={`${TONICS[tonic]} ${NAME[modeId]} pattern`} />
            <p className="text-xs text-muted-foreground">{formula.map((f) => f.label).join(" · ")}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Along the neck</h4>
            <ol className="flex flex-wrap gap-1.5 text-xs" data-testid="shapes-map">
              {sorted.map((r) => (
                <li key={r.form} className={cn("rounded-md border px-2 py-1", r.form === form ? "border-primary bg-primary/15" : "border-border bg-secondary/50")}>
                  <b>{r.form}</b> {r.from}–{r.to}
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">Neighbouring shapes share a string or two, so each one hands over to the next.</p>
          </div>
        </section>

        <section className="panel space-y-2 p-3 sm:p-4" data-testid="shapes-compare">
          <h3 className="font-display text-lg font-black">All seven on {TONICS[tonic]}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="py-1 pr-2">Mode</th><th className="pr-2">Parent</th><th className="pr-2">Shape</th><th className="pr-2">Offset</th><th className="pr-2">Fit</th><th>Closest</th></tr></thead>
              <tbody>
                {MODE_INFO.map((m) => {
                  const c = checkClaim(tonic, m.id, anchor)!;
                  const r = modeRelations(tonic, m.id, anchor)!;
                  return (
                    <tr key={m.id} className={cn("border-t border-border/60", m.id === modeId && "bg-primary/10")} data-testid={`shapes-row-${m.id}`}>
                      <td className="py-1 pr-2"><button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => { setModeId(m.id); setFormPick(null); }}>{NAME[m.id]}</button>{inCagedPattern(m.id) ? null : <span className="ml-1 text-[10px] text-muted-foreground">outside</span>}</td>
                      <td className="pr-2">{TONICS[r.parentPc]}</td>
                      <td className="pr-2 font-bold">{c.claimed}</td>
                      <td className="pr-2">{signed(c.offset)}</td>
                      <td className="pr-2"><Chip status={c.status} /></td>
                      <td>{c.best} {signed(c.bestOffset)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Dorian, Phrygian, Mixolydian, Aeolian and Ionian run through C, A, G, E, D in order — Lydian and Locrian start on the two notes the pentatonic skips and sit outside it. Every mode contains all five shapes of its parent key. "Offset" is how far the claimed shape's window starts from the {TONICS[tonic]} on the {STRING_NAMES[anchor]} string.</p>
        </section>
      </main>
    </AppShell>
  );
}
