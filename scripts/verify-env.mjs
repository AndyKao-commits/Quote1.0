import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optional = ["SUPABASE_PROJECT_ID", "VITE_SUPABASE_PROJECT_ID"];

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

if (!existsSync(envPath)) {
  console.error("Missing .env — copy .env.example and fill in Supabase keys.");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const missing = required.filter((k) => !env.get(k)?.trim());
const missingOptional = optional.filter((k) => !env.get(k)?.trim());

console.log("Supabase backend env check\n");
for (const key of required) {
  console.log(`${missing.includes(key) ? "✗" : "✓"} ${key}`);
}
for (const key of optional) {
  console.log(`${missingOptional.includes(key) ? "○" : "✓"} ${key} (optional)`);
}

if (missing.length) {
  console.log("\nAdd missing keys to .env, then run: npm run setup:vercel-env");
  process.exit(1);
}

console.log("\nLocal .env looks complete.");
