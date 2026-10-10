import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

const KEY = "fretlab.installtip.v1";
export const APK_URL = "https://github.com/snakesonsketz-gif/fretboard-explorer/releases/download/android-latest/Fretlab.apk";

type Platform = "ios" | "android" | null;

/** Which tip (if any) this visitor should see. Runs only in the browser, after mount. */
function detect(): Platform {
  try {
    if (window.localStorage.getItem(KEY) === "dismissed") return null;
  } catch {
    /* storage unavailable: still show the tip */
  }
  if (window.self !== window.top) return null; // inside an editor preview (Lovable)
  const nav = navigator as Navigator & { standalone?: boolean };
  const installed = nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  if (installed) return null;
  if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return null;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

/** "Install Fretlab" hint for phone visitors: Add to Home Screen on iPhone/iPad, the APK on Android. */
export function InstallTip() {
  const [platform, setPlatform] = useState<Platform>(null);
  useEffect(() => setPlatform(detect()), []);
  if (!platform) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "dismissed");
    } catch {
      /* storage unavailable */
    }
    setPlatform(null);
  };

  return (
    <div role="note" aria-label="Install Fretlab" data-testid="install-tip" data-platform={platform} className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 text-sm">
        <img src="/icon-192.png" alt="" className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 leading-snug">
          <p className="font-semibold">Install Fretlab on your {platform === "ios" ? "iPhone" : "phone"}</p>
          {platform === "ios" ? (
            <p className="text-muted-foreground">
              Tap <Share className="inline h-4 w-4 align-[-3px] text-foreground" aria-label="Share" /> Share, then{" "}
              <span className="whitespace-nowrap font-medium text-foreground">
                <SquarePlus className="inline h-4 w-4 align-[-3px]" aria-hidden /> Add to Home Screen
              </span>
              . It opens full screen, like an app.
            </p>
          ) : (
            <p className="text-muted-foreground">
              <a href={APK_URL} className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2">
                <Download className="h-4 w-4" aria-hidden /> Download the Android app
              </a>{" "}
              — open the file and tap Install.
            </p>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Hide install tip" className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
