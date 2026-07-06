/**
 * 本機模擬 API — 僅供 local-first 測試，不部署上線。
 * 只處理：登入、會籍驗證、裝置註冊（最多 2 台）、離線授權簽發。
 */
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { networkInterfaces } from "node:os";

function getLanIp() {
  const prefer = (re) => {
    for (const iface of Object.values(networkInterfaces())) {
      for (const cfg of iface ?? []) {
        if (cfg.family === "IPv4" && !cfg.internal && re.test(cfg.address)) return cfg.address;
      }
    }
    return null;
  };
  return (
    prefer(/^192\.168\./) ||
    prefer(/^10\./) ||
    prefer(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    (() => {
      for (const iface of Object.values(networkInterfaces())) {
        for (const cfg of iface ?? []) {
          if (cfg.family === "IPv4" && !cfg.internal && !cfg.address.startsWith("169.254.")) {
            return cfg.address;
          }
        }
      }
      return null;
    })()
  );
}

const PORT = Number(process.env.LOCAL_MOCK_PORT || 3099);
const LAN_MODE = process.argv.includes("--lan") || process.env.LOCAL_MOCK_LAN === "true";
const HOST = LAN_MODE ? "0.0.0.0" : "127.0.0.1";
const SECRET = process.env.LOCAL_MOCK_SECRET || "bdg-local-dev-secret-change-me";
const DATA_FILE = join(process.cwd(), ".local-mock-data.json");
const OFFLINE_DAYS = 20;
const MAX_DEVICES = 2;

const DEFAULT_DATA = {
  users: {
    "demo@local": {
      id: "user-demo-001",
      password: "demo123",
      membershipExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    },
    "expired@local": {
      id: "user-expired-001",
      password: "demo123",
      membershipExpiresAt: new Date(Date.now() - 86400000).toISOString(),
    },
  },
  devices: {},
};

function loadData() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return structuredClone(DEFAULT_DATA);
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function signLicense(payload) {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  return { ...payload, signature: sig };
}

function verifyLicense(license) {
  if (!license?.signature) return false;
  const { signature, ...rest } = license;
  const expected = createHmac("sha256", SECRET).update(JSON.stringify(rest)).digest("hex");
  return signature === expected;
}

function issueLicense(user, deviceId) {
  const now = Date.now();
  const membershipExpiresAt = user.membershipExpiresAt;
  const offlineUntil = new Date(now + OFFLINE_DAYS * 86400000).toISOString();
  return signLicense({
    userId: user.id,
    email: user.email,
    deviceId,
    membershipExpiresAt,
    offlineUntil,
    issuedAt: new Date(now).toISOString(),
    maxDevices: MAX_DEVICES,
    offlineDays: OFFLINE_DAYS,
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, mode: "local-mock", offlineDays: OFFLINE_DAYS, maxDevices: MAX_DEVICES });
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/clear-devices") {
      const body = await readBody(req);
      const data = loadData();
      const user = data.users[body.email];
      if (!user) {
        json(res, 404, { error: "找不到帳號" });
        return;
      }
      data.devices[user.id] = [];
      saveData(data);
      json(res, 200, { ok: true, message: `已清除 ${body.email} 的裝置綁定` });
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/login") {
      const body = await readBody(req);
      const data = loadData();
      const user = data.users[body.email];
      if (!user || user.password !== body.password) {
        json(res, 401, { error: "帳號或密碼錯誤" });
        return;
      }
      const deviceId = body.deviceId || randomUUID();
      const deviceName = body.deviceName || "未知裝置";
      const list = data.devices[user.id] || [];
      const existing = list.find((d) => d.deviceId === deviceId);
      if (!existing && list.length >= MAX_DEVICES) {
        json(res, 403, {
          error: `此帳號已達 ${MAX_DEVICES} 台裝置上限，請先在另一台登出或移除裝置。`,
          devices: list,
        });
        return;
      }
      if (!existing) {
        list.push({ deviceId, deviceName, lastSeenAt: new Date().toISOString() });
      } else {
        existing.lastSeenAt = new Date().toISOString();
        existing.deviceName = deviceName;
      }
      data.devices[user.id] = list;
      saveData(data);
      const license = issueLicense({ ...user, email: body.email }, deviceId);
      json(res, 200, { license, devices: list });
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/refresh") {
      const body = await readBody(req);
      if (!verifyLicense(body.license)) {
        json(res, 401, { error: "授權無效" });
        return;
      }
      const data = loadData();
      const userEntry = Object.entries(data.users).find(([, u]) => u.id === body.license.userId);
      if (!userEntry) {
        json(res, 401, { error: "找不到帳號" });
        return;
      }
      const [email, user] = userEntry;
      const list = data.devices[user.id] || [];
      const dev = list.find((d) => d.deviceId === body.license.deviceId);
      if (!dev) {
        json(res, 403, { error: "裝置未註冊" });
        return;
      }
      dev.lastSeenAt = new Date().toISOString();
      saveData(data);
      const license = issueLicense({ ...user, email }, body.license.deviceId);
      json(res, 200, { license, membershipActive: new Date(user.membershipExpiresAt) > new Date() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/verify") {
      const body = await readBody(req);
      if (!verifyLicense(body.license)) {
        json(res, 401, { valid: false, error: "授權簽章無效" });
        return;
      }
      json(res, 200, { valid: true });
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : "server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[local-mock-api] http://127.0.0.1:${PORT}`);
  console.log(`  前端代理: http://localhost:8080/__local_auth__`);
  console.log(`  測試帳號: demo@local / demo123`);
  console.log(`  手機測試: npm run local:lan`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[local-mock-api] port ${PORT} 已被占用 — 可能已在另一個終端機執行中。`);
    console.error(`  若授權服務已在執行，請直接開啟 http://localhost:8080/auth`);
    process.exit(0);
  }
  throw err;
});
