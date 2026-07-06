import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.baodeguo.quote",
  appName: "報得過",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
