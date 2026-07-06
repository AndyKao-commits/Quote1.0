import { VitePWA } from "vite-plugin-pwa";

const APP_NAME = "報得過";
const APP_DESC = "三分鐘做出客戶願意簽的報價。PDF 預覽、LINE 分享、項目庫、歷史複製。";

export function baodeguoPwaPlugin() {
  return VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.svg", "quote-pigeon.png"],
    manifest: {
      name: APP_NAME,
      short_name: APP_NAME,
      description: APP_DESC,
      theme_color: "#1c1917",
      background_color: "#fafaf9",
      display: "standalone",
      orientation: "portrait-primary",
      scope: "/",
      start_url: "/",
      lang: "zh-TW",
      categories: ["business", "productivity"],
      icons: [
        {
          src: "/quote-pigeon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/quote-pigeon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/favicon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
      navigateFallback: "/",
      navigateFallbackDenylist: [/^\/__local_auth__/, /^\/api\//],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.destination === "document",
          handler: "NetworkFirst",
          options: {
            cacheName: "bdg-pages",
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
          },
        },
        {
          urlPattern: ({ request }) =>
            request.destination === "script" || request.destination === "style",
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "bdg-assets",
            expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  });
}
