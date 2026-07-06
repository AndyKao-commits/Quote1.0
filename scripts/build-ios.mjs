/**
 * Build SPA for Capacitor and sync to ios/ (requires macOS + Xcode for archive).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\n=== Build iOS (Capacitor SPA) ===\n");

run("npx", ["vite", "build", "--config", "vite.config.capacitor.ts", "--mode", "capacitor"]);

const clientDir = join(root, "dist", "client");
if (!existsSync(clientDir)) {
  console.error("\n[!!] dist/client not found — check vite.config.capacitor.ts SPA output.\n");
  process.exit(1);
}

if (!existsSync(join(root, "ios"))) {
  console.log("[..] First run: adding iOS platform...");
  run("npx", ["cap", "add", "ios"]);
}

run("npx", ["cap", "sync", "ios"]);

console.log("\n[ok] Next steps (macOS + Xcode):");
console.log("  npx cap open ios");
console.log("  Product → Archive → Distribute to TestFlight / App Store");
console.log("\nBefore shipping: set VITE_APP_API_ORIGIN in .env.capacitor to your production URL.");
console.log("Vercel must have VITE_LOCAL_FIRST=true + LOCAL_MOCK_SECRET + Supabase migration.\n");
