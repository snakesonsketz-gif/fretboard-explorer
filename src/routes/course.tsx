import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, ClipboardCopy, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  CAGED_CROSSWALK,
  LESSON_FORMAT,
  MODULES,
  defaultProgress,
  foundationGap,
  lessonRequest,
  loadProgress,
  moduleProgress,
  nextUp,
  overallProgress,
  saveProgress,
  topicKey,
  type Plan,
  type Progress,
} from "@/lib/course";
import { cn } from "@/lib/utils";
import { LessonCard } from "@/components/LessonCard";
import { SOURCES, lessonsFor } from "@/lib/courseLessons";
import { lessonPrompt, modulePrompt } from "@/lib/coursePrompts";

export const Route = createFileRoute("/course")({
  head: () => ({ meta: [{ title: "Songwriting course — Fretlab" }] }),
  component: CoursePage,
});

const PLANS: { id: Plan; label: string; sub: string }[] = [
  { id: "foundation", label: "Go back to Modules 1–3 first", sub: "Chords, functions and voice leading, then Module 4 onward" },
  { id: "continue", label: "Continue: Module 4, Lesson 4", sub: "Mixolydian versus Ionian, then carry on in order" },
  { id: "custom", label: "Pick my own order", sub: "Start from any module you choose" },
];

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A songwriting course outline with progress that stays on this device. The lessons themselves are taught in chat, one a day. */
export function CoursePage() {
  const [p, setP] = useState<Progress>(defaultProgress);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setP(loadProgress());
    setReady(true);
  }, []);
  const update = (fn: (x: Progress) => Progress) =>
    setP((cur) => {
      const next = fn(cur);
      saveProgress(next);
      return next;
    });

  const overall = overallProgress(p);
  const gap = foundationGap(p);
  const next = nextUp(p);
  const today = new Date().toISOString().slice(0, 10);

  const markNextDone = () => {
    if (!next) return;
    update((x) => {
      const topics = { ...x.topics };
      for (const i of next.finishes) topics[topicKey(next.module, i)] = true;
      return { ...x, topics, lessons: next.lessonId ? { ...x.lessons, [next.lessonId]: today } : x.lessons };
    });
  };
  const copyText = async (t: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      return false;
    }
  };
  const toggleLesson = (id: string, covers: number[], mod: number) =>
    update((x) => {
      const lessons = { ...x.lessons };
      const topics = { ...x.topics };
      if (lessons[id]) delete lessons[id];
      else {
        lessons[id] = today;
        for (const i of covers) topics[topicKey(mod, i)] = true;
      }
      return { ...x, lessons, topics };
    });
  const copyRequest = async () => {
    if (!next) return;
    try {
      await navigator.clipboard.writeText(lessonRequest(next));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4" data-testid="course-page">
        <section className="panel space-y-2 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-black">Songwriting &amp; composition course</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Twenty-two modules, one lesson a day, taught in chat. This page keeps your place, links each module to the tool that fits it, and holds your own notes. It never writes riffs, progressions or lyrics for you.
          </p>
          <div className="space-y-1" data-testid="course-overall">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{overall.done} of {overall.total} topics covered</span>
              <span>{overall.pct}%</span>
            </div>
            <Bar pct={overall.pct} />
          </div>
        </section>

        <section className="panel space-y-2 p-3 sm:p-4" data-testid="course-plan">
          <h3 className="text-sm font-bold">Where do you want to go next?</h3>
          {gap.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Three Module 4 lessons are done, but Module{gap.length > 1 ? "s" : ""} {gap.join(", ")} haven't been covered yet. Nothing is skipped silently: choose how to handle it.
            </p>
          ) : null}
          <div className="grid gap-1.5 sm:grid-cols-3">
            {PLANS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => update((x) => ({ ...x, plan: o.id }))}
                aria-pressed={p.plan === o.id}
                data-testid={`plan-${o.id}`}
                className={cn("rounded-md border p-2 text-left transition-colors", p.plan === o.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/60")}
              >
                <span className="block text-xs font-bold">{o.label}</span>
                <span className="block text-[11px] text-muted-foreground">{o.sub}</span>
              </button>
            ))}
          </div>
          {p.plan === "custom" ? (
            <div className="flex flex-wrap gap-1" data-testid="custom-module">
              {MODULES.map((m) => (
                <Button key={m.id} size="sm" variant={p.customModule === m.id ? "default" : "secondary"} className="h-7 w-8 px-0 text-xs" onClick={() => update((x) => ({ ...x, customModule: m.id }))} aria-label={`Start at module ${m.id}`}>
                  {m.id}
                </Button>
              ))}
            </div>
          ) : null}
        </section>

        {ready && next ? (
          <section className="panel space-y-2 border-primary/40 p-3 sm:p-4" data-testid="course-next">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Next lesson</div>
            <h3 className="text-sm font-bold">{next.title}</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {next.points.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void copyRequest()} data-testid="copy-request">
                {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                {copied ? "Copied: paste it into the chat" : "Copy lesson request for the chat"}
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={markNextDone} data-testid="mark-done">
                Mark this lesson done
              </Button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2" data-testid="course-modules">
          {MODULES.map((m) => {
            const mp = moduleProgress(m, p);
            const isOpen = open === m.id;
            return (
              <div key={m.id} className="panel p-3" data-testid={`module-${m.id}`}>
                <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(isOpen ? null : m.id)} aria-expanded={isOpen}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold">{m.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-tight">{m.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{mp.done}/{mp.total} topics</span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                <div className="mt-2">
                  <Bar pct={mp.pct} />
                </div>
                {isOpen ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">{m.summary}</p>
                    <ul className="space-y-0.5">
                      {m.topics.map((t, i) => {
                        const on = !!p.topics[topicKey(m.id, i)];
                        return (
                          <li key={t}>
                            <label className="flex cursor-pointer items-start gap-2 text-xs">
                              <input type="checkbox" className="mt-0.5" checked={on} onChange={() => update((x) => ({ ...x, topics: { ...x.topics, [topicKey(m.id, i)]: !on } }))} />
                              <span className={cn(on && "text-muted-foreground line-through")}>{t}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Lessons</div>
                        <Button size="sm" variant="secondary" className="h-7 gap-1 text-[11px]" onClick={() => void copyText(modulePrompt(m))} data-testid={`copy-module-${m.id}`}>
                          <ClipboardCopy className="h-3 w-3" /> Copy whole module for chat
                        </Button>
                      </div>
                      {lessonsFor(m.id).map((l) => (
                        <LessonCard
                          key={l.id}
                          lesson={l}
                          done={p.lessons[l.id]}
                          onToggleDone={() => toggleLesson(l.id, l.covers, m.id)}
                          onCopy={() => copyText(lessonPrompt(l))}
                        />
                      ))}
                    </div>
                    {m.id === 8 ? (
                      <div className="space-y-1 rounded-md border border-border/70 p-2 text-xs" data-testid="caged-crosswalk">
                        <div className="font-bold">Where CAGED lives in Fretlab (Explore → CAGED)</div>
                        <ul className="space-y-0.5 text-muted-foreground">
                          {CAGED_CROSSWALK.map((c) => (
                            <li key={c.topic}>
                              <span className="text-foreground">{c.topic}:</span> {c.where}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Try it in Fretlab</div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.tools.map((t) => (
                          <Button key={t.label} size="sm" variant="secondary" className="h-auto gap-1 whitespace-normal py-1 text-left text-xs" title={t.hint} onClick={() => void navigate({ to: t.to })}>
                            {t.label} <ArrowRight className="h-3 w-3 shrink-0" />
                          </Button>
                        ))}
                      </div>
                      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                        {m.tools.map((t) => (
                          <li key={t.label}>{t.label}: {t.hint}</li>
                        ))}
                      </ul>
                    </div>
                    {SOURCES[m.id] ? (
                      <div className="space-y-0.5 text-[11px] text-muted-foreground" data-testid={`sources-${m.id}`}>
                        <div className="uppercase tracking-widest">Further reading (lessons are paraphrased)</div>
                        {SOURCES[m.id]!.map((x) => (
                          <a key={x.title} href={x.url} target="_blank" rel="noreferrer" className="block underline">
                            {x.title}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <label className="block space-y-1">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Your notes and assignment drafts (kept on this device)</span>
                      <textarea
                        className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-xs"
                        value={p.notes[String(m.id)] ?? ""}
                        onChange={(e) => update((x) => ({ ...x, notes: { ...x.notes, [String(m.id)]: e.target.value } }))}
                        placeholder="Your ideas, bar-by-bar plans, questions for the next lesson…"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="panel space-y-1 p-3 text-xs text-muted-foreground" data-testid="course-format">
          <h3 className="text-sm font-bold text-foreground">Every lesson has ten parts</h3>
          <ol className="list-decimal space-y-0.5 pl-5">
            {LESSON_FORMAT.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
          <p className="pt-1">The assignment always leaves the creative decisions to you: the course explains and critiques, you write.</p>
        </section>
      </main>
    </AppShell>
  );
}
