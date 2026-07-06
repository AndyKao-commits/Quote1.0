/**
 * One terminal, one command — auth + frontend for phone testing.
 * Phone only needs port 8080 (no 3099 on LAN).
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

const children = [];

function getWifiIp() {
  const pick = (re) => {
    for (const iface of Object.values(networkInterfaces())) {
      for (const cfg of iface ?? []) {
        if (cfg.family === "IPv4" && !cfg.internal && re.test(cfg.address)) return cfg.address;
      }
    }
    return null;
  };
  return (
    pick(/^192\.168\./) ||
    pick(/^10\./) ||
    pick(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    null
  );
}

async function authReady() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch("http://127.0.0.1:3099/health", { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  children.push(child);
  return child;
}

function stopAll() {
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

const ip = getWifiIp();
console.log("");
console.log("=== Bdg local (phone) ===");
console.log(ip ? `Phone: http://${ip}:8080/auth` : "Phone: http://<wifi-ip>:8080/auth");
console.log("Login: demo@local / demo123");
console.log("Ctrl+C to stop");
console.log("");

if (!(await authReady())) {
  run("node", ["scripts/local-mock-api.mjs"]);
  await new Promise((r) => setTimeout(r, 1500));
}

run("npx", ["vite", "dev", "--mode", "local-first", "--host", "--port", "8080", "--strictPort"]);
