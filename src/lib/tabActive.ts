import { createContext, useContext } from "react";

/**
 * Whether the tab a component lives in is the one on screen. The main tabs stay mounted when you
 * switch away (so each is left exactly as it was); anything that makes sound or uses the
 * microphone stops itself when its tab is hidden.
 */
export const TabActiveContext = createContext(true);
export const useTabActive = () => useContext(TabActiveContext);
