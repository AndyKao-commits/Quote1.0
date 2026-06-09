import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const migrationsDir = resolve(import.meta.dirname, "..", "supabase", "migrations");
const out = resolve(import.meta.dirname, "..", "supabase", "bootstrap-all.sql");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const parts = [
  "-- Run once in Supabase SQL Editor (your own project)",
  "-- Creates all tables, RLS policies, functions, and storage buckets",
  "",
];

for (const file of files) {
  parts.push(`-- ${file}`);
  parts.push(readFileSync(join(migrationsDir, file), "utf8").trim());
  parts.push("");
}

writeFileSync(out, parts.join("\n"), "utf8");
console.log(`Wrote ${out} (${files.length} migrations)`);
