import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "..", ".env");
const text = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [k, v];
    }),
);

const url = env.SUPABASE_URL;
const key = env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const tables = ["profiles", "projects", "photos", "teams", "user_roles", "subscriptions"];

async function probe(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return { table, status: res.status, ok: res.ok, body: await res.text() };
}

async function probeBuckets() {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return { status: res.status, body: await res.text() };
}

console.log("Checking Supabase project:", env.SUPABASE_PROJECT_ID || "(unknown)");
for (const table of tables) {
  const r = await probe(table);
  const summary = r.ok ? "exists" : r.status === 404 || r.body.includes("does not exist") ? "MISSING" : `error ${r.status}`;
  console.log(`  ${table}: ${summary}`);
}
const buckets = await probeBuckets();
console.log("  storage buckets:", buckets.status === 200 ? buckets.body : `error ${buckets.status}`);
