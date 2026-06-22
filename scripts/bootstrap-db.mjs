#!/usr/bin/env node
/** 使用 service role 透過 PostgREST 無法建表；此腳本以 pg 連線執行 bootstrap SQL */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase/bootstrap-quotes.sql"), "utf8");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("需要 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// 嘗試 Supabase Database HTTP API（需 database password）
const dbUrl = process.env.SUPABASE_DB_URL;
if (dbUrl) {
  const { default: pg } = await import("pg");
  const c = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(sql);
  await c.end();
  console.log("OK: bootstrap via SUPABASE_DB_URL");
  process.exit(0);
}

console.log(`
無法自動建表（缺少 SUPABASE_DB_URL）。
請到 Supabase Dashboard → SQL Editor 執行：
  supabase/bootstrap-quotes.sql

專案：${url}
`);
process.exit(1);
