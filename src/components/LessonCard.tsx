import { useState } from "react";
import { Check, ChevronDown, ClipboardCopy, Ear, Footprints, Guitar, HelpCircle, Layers, Lightbulb, ListChecks, PenLine, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/courseLessons";

function Block({ icon: Icon, title, tone, children }: { icon: typeof Guitar; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-2.5", tone)}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 text-xs">
    {items.map((x) => (
      <li key={x} className="flex gap-1.5">
        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

/** One lesson as stacked visual cards instead of a wall of text. */
export function LessonCard({ lesson: l, done, onToggleDone, onCopy }: { lesson: Lesson; done: string | undefined; onToggleDone: () => void; onCopy: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await onCopy();
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="rounded-lg border border-border/70" data-testid={`lesson-${l.id}`}>
      <button type="button" className="flex w-full items-center gap-2 p-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={cn("grid h-6 min-w-8 place-items-center rounded-md px-1 text-[11px] font-bold", done ? "bg-primary text-primary-foreground" : "bg-secondary")}>{done ? <Check className="h-3.5 w-3.5" /> : l.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold leading-tight">{l.title}</span>
          <span className="block text-[11px] text-muted-foreground">{l.blurb}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <div className="flex flex-wrap gap-1.5 px-2 pb-2">
        <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={() => void copy()} data-testid={`copy-lesson-${l.id}`}>
          {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />} {copied ? "Copied" : "Copy for chat"}
        </Button>
        <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onToggleDone} data-testid={`done-lesson-${l.id}`}>
          {done ? "Mark not done" : "Mark done"}
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-border/70 p-2" data-testid={`lesson-body-${l.id}`}>
          <Block icon={ListChecks} title="You will be able to" tone="border-primary/40 bg-primary/5">
            <List items={l.goals} />
          </Block>
          <div className="grid gap-2 sm:grid-cols-2">
            {l.ideas.map((i, n) => (
              <div key={i.title} className="rounded-lg border border-border/70 bg-secondary/40 p-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{n + 1}</span>
                  {i.title}
                </div>
                <p className="text-xs text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </div>
          <Block icon={Guitar} title="On guitar" tone="border-sky-500/40 bg-sky-500/5">
            <p className="text-xs">{l.guitar}</p>
          </Block>
          {l.band ? (
            <Block icon={Users} title="With the band" tone="border-violet-500/40 bg-violet-500/5">
              <p className="text-xs">{l.band}</p>
            </Block>
          ) : null}
          <Block icon={Lightbulb} title="Why it works" tone="border-amber-500/40 bg-amber-500/5">
            <p className="text-xs">{l.why}</p>
          </Block>
          <Block icon={TriangleAlert} title="Watch out for" tone="border-rose-500/40 bg-rose-500/5">
            <List items={l.mistakes} />
          </Block>
          <Block icon={Ear} title="Listen for" tone="border-emerald-500/40 bg-emerald-500/5">
            <List items={l.listen} />
          </Block>
          <Block icon={ListChecks} title="Practice" tone="border-border bg-secondary/30">
            <List items={l.practice} />
          </Block>
          <Block icon={PenLine} title="Your assignment" tone="border-primary/50 bg-primary/10">
            <List items={l.assignment} />
          </Block>
          {l.deep ? (
            <>
              <Block icon={Layers} title="Go deeper" tone="border-indigo-500/40 bg-indigo-500/5">
                <div className="space-y-2" data-testid={`deep-${l.id}`}>
                  {l.deep.dive.map(([t, b]) => (
                    <div key={t}>
                      <div className="text-xs font-bold">{t}</div>
                      <p className="text-xs text-muted-foreground">{b}</p>
                    </div>
                  ))}
                </div>
              </Block>
              <Block icon={Footprints} title="Step by step" tone="border-teal-500/40 bg-teal-500/5">
                <ol className="space-y-1 text-xs">
                  {l.deep.method.map((m, i) => (
                    <li key={m} className="flex gap-1.5">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-teal-500/30 text-[10px] font-bold">{i + 1}</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ol>
              </Block>
              <Block icon={HelpCircle} title="Check yourself" tone="border-fuchsia-500/40 bg-fuchsia-500/5">
                <div className="space-y-1">
                  {l.deep.check.map(([q, a]) => (
                    <details key={q} className="text-xs">
                      <summary className="cursor-pointer font-semibold">{q}</summary>
                      <p className="mt-0.5 text-muted-foreground">{a}</p>
                    </details>
                  ))}
                </div>
              </Block>
            </>
          ) : null}
          <div className="text-[11px] text-muted-foreground">Next: {l.next}</div>
        </div>
      ) : null}
    </div>
  );
}
