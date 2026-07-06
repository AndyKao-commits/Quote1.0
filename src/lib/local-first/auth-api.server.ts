import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.server";
import type { LocalLicense } from "@/lib/local-first/license";

const OFFLINE_DAYS = 20;
const MAX_DEVICES = 2;
const DATA_FILE = join(process.cwd(), ".local-mock-data.json");

const DEFAULT_FILE_DATA = {
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
  devices: {} as Record<string, Array<{ deviceId: string; deviceName: string; lastSeenAt: string }>>,
};

function getSecret() {
  return process.env.LOCAL_MOCK_SECRET || process.env.VITE_LOCAL_MOCK_SECRET || "bdg-local-dev-secret-change-me";
}

function signLicense(payload: Omit<LocalLicense, "signature">): LocalLicense {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", getSecret()).update(body).digest("hex");
  return { ...payload, signature };
}

function verifyLicense(license: LocalLicense) {
  if (!license?.signature) return false;
  const { signature, ...rest } = license;
  const expected = createHmac("sha256", getSecret()).update(JSON.stringify(rest)).digest("hex");
  return signature === expected;
}

function issueLicense(user: { id: string; email: string; membershipExpiresAt: string }, deviceId: string) {
  const now = Date.now();
  return signLicense({
    userId: user.id,
    email: user.email,
    deviceId,
    membershipExpiresAt: user.membershipExpiresAt,
    offlineUntil: new Date(now + OFFLINE_DAYS * 86400000).toISOString(),
    issuedAt: new Date(now).toISOString(),
    maxDevices: MAX_DEVICES,
    offlineDays: OFFLINE_DAYS,
  });
}

function useFileStore() {
  return process.env.LOCAL_AUTH_STORE === "file" || import.meta.env.DEV;
}

function loadFileData() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_FILE_DATA, null, 2));
    return structuredClone(DEFAULT_FILE_DATA);
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf8")) as typeof DEFAULT_FILE_DATA;
}

function saveFileData(data: typeof DEFAULT_FILE_DATA) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase auth env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getMembershipExpiry(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("current_membership_expiry", { _user: userId });
  if (error || !data) return new Date(0).toISOString();
  return String(data);
}

async function loginWithFile(email: string, password: string, deviceId: string, deviceName: string) {
  const data = loadFileData();
  const user = data.users[email as keyof typeof data.users];
  if (!user || user.password !== password) {
    return Response.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }
  const list = data.devices[user.id] || [];
  const existing = list.find((d) => d.deviceId === deviceId);
  if (!existing && list.length >= MAX_DEVICES) {
    return Response.json(
      { error: `此帳號已達 ${MAX_DEVICES} 台裝置上限，請先在另一台登出或移除裝置。`, devices: list },
      { status: 403 },
    );
  }
  if (!existing) {
    list.push({ deviceId, deviceName, lastSeenAt: new Date().toISOString() });
  } else {
    existing.lastSeenAt = new Date().toISOString();
    existing.deviceName = deviceName;
  }
  data.devices[user.id] = list;
  saveFileData(data);
  const license = issueLicense({ id: user.id, email, membershipExpiresAt: user.membershipExpiresAt }, deviceId);
  return Response.json({ license, devices: list });
}

async function loginWithSupabase(email: string, password: string, deviceId: string, deviceName: string) {
  const auth = getAuthClient();
  const { data: signIn, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !signIn.user) {
    return Response.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const userId = signIn.user.id;
  const membershipExpiresAt = await getMembershipExpiry(userId);
  const admin = getSupabaseAdmin();

  const { data: devices, error: listErr } = await admin
    .from("offline_license_devices")
    .select("device_id, device_name, last_seen_at")
    .eq("user_id", userId);

  if (listErr) {
    console.error("[offline auth] device list", listErr);
    return Response.json({ error: "授權服務暫時無法使用" }, { status: 503 });
  }

  const list = (devices ?? []).map((d) => ({
    deviceId: d.device_id,
    deviceName: d.device_name ?? "未知裝置",
    lastSeenAt: d.last_seen_at,
  }));
  const existing = list.find((d) => d.deviceId === deviceId);
  if (!existing && list.length >= MAX_DEVICES) {
    return Response.json(
      { error: `此帳號已達 ${MAX_DEVICES} 台裝置上限，請先在另一台登出或移除裝置。`, devices: list },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { error: upsertErr } = await admin.from("offline_license_devices").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      last_seen_at: now,
    },
    { onConflict: "user_id,device_id" },
  );
  if (upsertErr) {
    console.error("[offline auth] device upsert", upsertErr);
    return Response.json({ error: "授權服務暫時無法使用" }, { status: 503 });
  }

  const license = issueLicense({ id: userId, email, membershipExpiresAt }, deviceId);
  return Response.json({
    license,
    devices: existing
      ? list.map((d) => (d.deviceId === deviceId ? { ...d, deviceName, lastSeenAt: now } : d))
      : [...list, { deviceId, deviceName, lastSeenAt: now }],
  });
}

async function refreshWithFile(license: LocalLicense) {
  if (!verifyLicense(license)) {
    return Response.json({ error: "授權無效" }, { status: 401 });
  }
  const data = loadFileData();
  const userEntry = Object.entries(data.users).find(([, u]) => u.id === license.userId);
  if (!userEntry) return Response.json({ error: "找不到帳號" }, { status: 401 });
  const [email, user] = userEntry;
  const list = data.devices[user.id] || [];
  const dev = list.find((d) => d.deviceId === license.deviceId);
  if (!dev) return Response.json({ error: "裝置未註冊" }, { status: 403 });
  dev.lastSeenAt = new Date().toISOString();
  saveFileData(data);
  const next = issueLicense({ id: user.id, email, membershipExpiresAt: user.membershipExpiresAt }, license.deviceId);
  return Response.json({
    license: next,
    membershipActive: new Date(user.membershipExpiresAt) > new Date(),
  });
}

async function refreshWithSupabase(license: LocalLicense) {
  if (!verifyLicense(license)) {
    return Response.json({ error: "授權無效" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data: dev, error } = await admin
    .from("offline_license_devices")
    .select("device_id")
    .eq("user_id", license.userId)
    .eq("device_id", license.deviceId)
    .maybeSingle();
  if (error || !dev) return Response.json({ error: "裝置未註冊" }, { status: 403 });

  const membershipExpiresAt = await getMembershipExpiry(license.userId);
  const now = new Date().toISOString();
  await admin
    .from("offline_license_devices")
    .update({ last_seen_at: now })
    .eq("user_id", license.userId)
    .eq("device_id", license.deviceId);

  const next = issueLicense(
    { id: license.userId, email: license.email, membershipExpiresAt },
    license.deviceId,
  );
  return Response.json({
    license: next,
    membershipActive: new Date(membershipExpiresAt) > new Date(),
  });
}

export async function handleLocalAuthRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const prefix = "/__local_auth__";
  if (!url.pathname.startsWith(prefix)) return null;

  const path = url.pathname.slice(prefix.length) || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    if (request.method === "GET" && path === "/health") {
      return Response.json({
        ok: true,
        mode: useFileStore() ? "local-file" : "supabase",
        offlineDays: OFFLINE_DAYS,
        maxDevices: MAX_DEVICES,
      });
    }

    const body =
      request.method === "POST" ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};

    if (request.method === "POST" && path === "/auth/login") {
      const email = String(body.email ?? "");
      const password = String(body.password ?? "");
      const deviceId = String(body.deviceId ?? randomUUID());
      const deviceName = String(body.deviceName ?? "未知裝置");
      if (useFileStore()) return loginWithFile(email, password, deviceId, deviceName);
      return loginWithSupabase(email, password, deviceId, deviceName);
    }

    if (request.method === "POST" && path === "/auth/refresh") {
      const license = body.license as LocalLicense;
      if (useFileStore()) return refreshWithFile(license);
      return refreshWithSupabase(license);
    }

    if (request.method === "POST" && path === "/auth/verify") {
      const license = body.license as LocalLicense;
      if (!verifyLicense(license)) {
        return Response.json({ valid: false, error: "授權簽章無效" }, { status: 401 });
      }
      return Response.json({ valid: true });
    }

    if (request.method === "POST" && path === "/auth/clear-devices" && useFileStore()) {
      const email = String(body.email ?? "");
      const data = loadFileData();
      const user = data.users[email as keyof typeof data.users];
      if (!user) return Response.json({ error: "找不到帳號" }, { status: 404 });
      data.devices[user.id] = [];
      saveFileData(data);
      return Response.json({ ok: true, message: `已清除 ${email} 的裝置綁定` });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  } catch (error) {
    console.error("[__local_auth__]", error);
    return Response.json({ error: "server error" }, { status: 500 });
  }
}
