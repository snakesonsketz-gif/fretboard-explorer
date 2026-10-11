import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/grimoire")({
  head: () => ({ meta: [{ title: "Grimoire — Fretlab" }] }),
  component: GrimoirePage,
});

/**
 * The Grimoire room: the black-and-red scale and mode wheel (every scale in the Guitar Grimoire
 * catalogue). The wheel is its own page, served by the app from /rooms/grimoire.html with its
 * fonts bundled; it sits here full width and grows to its full height, so the whole room scrolls
 * as one page. Custom builds are kept on this device.
 */
function GrimoirePage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1600);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    const fit = () => {
      const doc = el.contentDocument;
      if (!doc?.body) return;
      setHeight(Math.ceil(doc.documentElement.scrollHeight));
    };
    const attach = () => {
      const doc = el.contentDocument;
      if (!doc?.body) return;
      fit();
      ro?.disconnect();
      ro = new ResizeObserver(fit);
      ro.observe(doc.body);
    };
    el.addEventListener("load", attach);
    attach();
    window.addEventListener("resize", fit);
    return () => {
      el.removeEventListener("load", attach);
      window.removeEventListener("resize", fit);
      ro?.disconnect();
    };
  }, []);

  return (
    <AppShell room="grimoire">
      <main className="mx-auto max-w-7xl" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,37,50,0.16), transparent 60%)" }}>
        <iframe
          ref={frame}
          src="/rooms/grimoire.html"
          title="Grimoire scale wheel"
          className="block w-full border-0"
          style={{ height, background: "#0b0707", colorScheme: "dark" }}
          data-testid="grimoire-frame"
        />
      </main>
    </AppShell>
  );
}
