// Static build for the phone app (Android APK via Capacitor) and any static host.
// Lovable keeps using vite.config.ts; this file is only used by `bun run build:mobile`.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
  },
});
