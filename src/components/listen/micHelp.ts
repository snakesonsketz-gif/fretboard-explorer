/** What to tell the player when the microphone can't start (shared by Listen and Develop). */
export const MIC_HELP: Record<string, string> = {
  denied: "Microphone access is blocked. Allow it in your browser's site settings (the icon next to the address), then press Start again.",
  "no-device": "No microphone found. Plug one in or check your device's sound settings.",
  insecure: "The microphone only works on a secure (https) page.",
  unsupported: "This browser can't record audio here. Try a current Chrome, Edge, Safari or Firefox.",
  other: "Couldn't start the microphone. Check that no other app is using it, then try again.",
};
