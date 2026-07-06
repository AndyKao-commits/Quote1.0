/**
 * Lightweight security triage (Strix source-aware SAST style).
 * Run: npm run security:check
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const findings = [];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist" || name === ".vercel") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?|mjs|env.*)$/.test(name)) acc.push(p);
  }
  return acc;
}

const clientGlobs = ["src/routes", "src/components", "src/lib"];
const secretPatterns = [
  { re: /service_role/gi, msg: "possible service_role in client path" },
  { re: /SUPABASE_SERVICE_ROLE/g, msg: "service role env in source" },
  { re: /VITE_.*SECRET/g, msg: "secret exposed via VITE_ prefix (ships to browser)" },
  { re: /dangerouslySetInnerHTML/g, msg: "XSS sink" },
];

for (const dir of clientGlobs) {
  const full = join(root, dir);
  try {
    for (const file of walk(full)) {
      const rel = relative(root, file);
      if (rel.includes(".server.")) continue;
      const text = readFileSync(file, "utf8");
      for (const { re, msg } of secretPatterns) {
        if (re.test(text)) findings.push({ level: "warn", file: rel, msg });
        re.lastIndex = 0;
      }
    }
  } catch {
    /* dir missing */
  }
}

// Env files committed risk
for (const env of [".env", ".env.local", ".env.production"]) {
  try {
    const t = readFileSync(join(root, env), "utf8");
    if (/service_role|SECRET|PASSWORD/i.test(t)) {
      findings.push({ level: "info", file: env, msg: "review secrets; do not commit real keys" });
    }
  } catch {
    /* ok */
  }
}

console.log("\n=== Bdg security check (Strix-style triage) ===\n");

if (findings.length === 0) {
  console.log("[ok] No obvious static issues in scanned paths.");
} else {
  for (const f of findings) {
    console.log(`[${f.level}] ${f.file}: ${f.msg}`);
  }
}

console.log("\nManual matrix: anon / user A / user B / expired — see .cursor/skills/baodeguo-security/");
console.log("Full pentest: strix --target ./src (Docker + LLM, https://docs.strix.ai)\n");

process.exit(findings.some((f) => f.level === "warn") ? 1 : 0);
