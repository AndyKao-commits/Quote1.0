/**
 * iOS / Android（Capacitor）專用建置 — 純 SPA，不含 SSR。
 * 用法：npm run build:ios
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { baodeguoPwaPlugin } from "./src/lib/pwa-config";

export default defineConfig({
  vite: {
    plugins: [baodeguoPwaPlugin()],
  },
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
      },
    },
  },
});
