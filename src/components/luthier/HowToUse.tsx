import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { DIFFICULTY } from "@/lib/luthier/types";
import { cn } from "@/lib/utils";
import { PotLugsDiagram } from "./diagrams/electronics";
import { ReliefDiagram } from "./diagrams/setup";

const KEY = "fretlab.luthier.howto.v1";

function Block({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {title}
      </h3>
      <div className="space-y-1.5 pl-8 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** "How to use the Luthier guide": finding a guide, reading one, wiring colours, the pictures, and the shop rules. */
export function HowToUse({ onOpen }: { onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "closed") setOpen(false);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        window.localStorage.setItem(KEY, o ? "closed" : "open");
      } catch {
        /* storage unavailable */
      }
      return !o;
    });
  const link = (id: string, text: string) => (
    <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => onOpen(id)}>
      {text}
    </button>
  );

  return (
    <section className="panel overflow-hidden" data-testid="luthier-howto">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-left sm:p-4">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="flex-1 font-display text-sm font-semibold uppercase tracking-widest">How to use the Luthier guide</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-5 border-t border-border p-3 sm:p-4">
          <Block n={1} title="Find the right guide">
            <p>
              <b className="text-foreground">Search for what you notice or what you want to do</b>, in plain words: "buzz", "volume crackles", "won't stay in tune", "lower action", "coil split", "crack", "Floyd". Several words narrow it down ("buzz open strings").
            </p>
            <p>
              <b className="text-foreground">Pick your guitar type</b> in the drop-down (Strat, Les Paul, dreadnought, Jazz bass, 7-string…) to hide guides that don't apply. Guides marked "Any guitar" always show.
            </p>
            <p>
              <b className="text-foreground">Use the category chips</b> to browse. If something is wrong but you don't know why, start in <b className="text-foreground">Diagnose a problem</b>: those guides go from the symptom to the likely causes, in the order you should check them, cheapest and most likely first. The <b className="text-foreground">With pictures</b> chip shows only guides that have diagrams.
            </p>
          </Block>

          <Block n={2} title="Read the whole guide before you touch the guitar">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <b className="text-foreground">Difficulty</b> runs 1–5: {DIFFICULTY.slice(1).map((d, i) => `${i + 1} ${d}`).join(", ")}. Red bars (4–5) mean you can do real damage — read the "Take it to a luthier if" box first.
              </li>
              <li>
                <b className="text-foreground">You notice / Likely causes</b>: go down the list in order. Each cause has a <i>Check</i> (how to confirm it) and a <i>Fix</i> (often a link to the guide that does it).
              </li>
              <li>
                <b className="text-foreground">What you need</b>: tools and parts together. Get everything ready before you slacken a string.
              </li>
              <li>
                <b className="text-foreground">Specs</b>: the numbers to aim for, with whose number it is (Fender, Gibson, StewMac…). Where pros disagree, both are shown.
              </li>
              <li>
                <b className="text-foreground">Pictures</b>: see below.
              </li>
              <li>
                <b className="text-foreground">Steps</b>: tap the number to tick a step off. Your progress is saved on this device, so you can stop and come back.
              </li>
              <li>
                <b className="text-foreground">Model by model</b>: what's different on your guitar — where the truss rod is, which key it takes, which way the bridge adjusts.
              </li>
              <li>
                <b className="text-foreground">Sources</b>: every guide links the maker's pages and professional repair articles it came from.
              </li>
            </ul>
          </Block>

          <Block n={3} title="How to read the pictures">
            <p>
              Every picture has <b className="text-foreground">numbered orange markers</b>. The numbered list under the picture tells you what to do at each marker, in order. Curves, gaps and angles are <b className="text-foreground">exaggerated</b> so you can see them — real neck relief is about the thickness of a couple of sheets of paper.
            </p>
            <p>
              Wiring pictures show every part from the <b className="text-foreground">back (the side you solder on)</b>. Pot lugs face up: lug 1 on the left, lug 2 (the wiper) in the middle, lug 3 on the right. Grey wires are ground, yellow are signal, and pickup leads take your brand's real colours.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <ReliefDiagram />
              <PotLugsDiagram />
            </div>
          </Block>

          <Block n={4} title="Wiring guides: choose your pickup brand">
            <p>
              Wiring steps name each wire by its job (hot, ground, series link, bare shield). Choose your pickup brand above the steps and every wire in the steps <i>and</i> the wiring pictures turns into that brand's colour — e.g. a Seymour Duncan humbucker's hot shows black, its series link red + white.
            </p>
            <p>
              Always compare with the diagram that came with your pickups, photograph the old wiring before you unsolder anything, and do the <b className="text-foreground">Test before closing up</b> step: tap each pickup with a screwdriver in every switch position and measure at the jack. New to soldering? Start with {link("ef-soldering-basics", "Soldering for guitar electronics")}.
            </p>
          </Block>

          <Block n={5} title="Shop rules (every job)">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <b className="text-foreground">Work in this order</b> for any setup: tune → neck relief → action at the bridge → nut → intonation → pickup height. Each step changes the next, so going out of order means doing it twice ({link("dx-full-setup", "Complete setup, in order")}).
              </li>
              <li>
                <b className="text-foreground">Measure and write down where you started</b>, and photograph wiring and hardware before taking anything apart. Then you can always get back.
              </li>
              <li>
                <b className="text-foreground">Small steps</b>: 1/8 turn on a truss rod, half a turn on a saddle screw, a little off a nut or saddle — then retune and measure again. You can always take more off; you can't put it back.
              </li>
              <li>
                <b className="text-foreground">Never force anything</b>. A truss rod nut that won't turn, a stuck screw or a tight neck joint is a reason to stop and read the "pro" box.
              </li>
              <li>
                <b className="text-foreground">Protect the guitar</b>: a soft towel or neck rest underneath, masking tape on the finish and fretboard near any file, sandpaper or soldering iron.
              </li>
              <li>
                <b className="text-foreground">Protect yourself</b>: safety glasses when cutting strings or fret wire, ventilation for soldering and finishes, unplug the guitar before soldering, and keep your face away from strings while tuning up after an adjustment.
              </li>
              <li>
                <b className="text-foreground">Acoustics: check humidity first</b> (45–55% RH). A dry guitar reads low action and sharp fret ends that fix themselves once it's humidified ({link("ac-humidity-basics", "Humidity control")}).
              </li>
              <li>
                <b className="text-foreground">Know when to stop</b>: cracks near the bridge, a lifting bridge, a broken headstock, neck resets, refrets and anything marked 5 are luthier jobs. The guide tells you how to recognise them so you can get the right help.
              </li>
            </ul>
          </Block>

          <Block n={6} title="Your first kit">
            <p>
              A capo, feeler gauges, a 6 in steel rule marked in 64ths/0.5 mm, a good tuner, the right truss-rod key and hex keys for your guitar, string cutters and a soft cloth cover most setups. {link("dx-tool-kit", "Beginner's setup tool kit")} explains what to buy first and how to read the gauges.
            </p>
          </Block>
        </div>
      ) : null}
    </section>
  );
}
