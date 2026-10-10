/**
 * Developer mode: shows the Develop tab (Listen-mode tuning lab). Off for testers; switched on
 * by tapping the Fretlab logo 5 times, or by opening /develop. Stored on this device only.
 */
import { useEffect, useState } from "react";

const KEY = "fretlab.devmode.v1";
const EVENT = "fretlab:devmode";

export function isDevMode(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean) {
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: on for this page only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/** Current developer-mode state, updated when it's toggled anywhere on the page. */
export function useDevMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isDevMode());
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return on;
}
