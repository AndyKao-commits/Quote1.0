#!/usr/bin/env node
/**
 * 執行 bootstrap SQL（需 SUPABASE_DB_URL 或手動在 Dashboard SQL Editor 貼上 supabase/bootstrap-quotes.sql）
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase/bootstrap-quotes.sql"), "utf8");
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.log("未設定 SUPABASE_DB_URL。");
  console.log("請到 Supabase Dashboard → SQL Editor，貼上並執行：");
  console.log("  supabase/bootstrap-quotes.sql");
  process.exit(0);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log("資料表建立完成。");
