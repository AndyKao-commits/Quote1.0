import { getLocalMockApiUrl, LOCAL_MOCK_SECRET, OFFLINE_DAYS } from "@/lib/local-first/config";
import { getDeviceName, getOrCreateDeviceId } from "@/lib/local-first/device";

const LICENSE_KEY = "bdg_local_license";

export type LocalLicense = {
  userId: string;
  email: string;
  deviceId: string;
  membershipExpiresAt: string;
  offlineUntil: string;
  issuedAt: string;
  maxDevices: number;
  offlineDays: number;
  signature: string;
};

export type AccessLevel = "full" | "reconnect_required" | "expired";

export type AccessState = {
  level: AccessLevel;
  canEdit: boolean;
  canImport: boolean;
  canExportPdf: boolean;
  browseRatio: number;
  message: string;
};

export function getStoredLicense(): LocalLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw ? (JSON.parse(raw) as LocalLicense) : null;
  } catch {
    return null;
  }
}

export function setStoredLicense(license: LocalLicense) {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bdg-local-license"));
}

export function clearStoredLicense() {
  localStorage.removeItem(LICENSE_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bdg-local-license"));
}

async function hmacSign(payload: Omit<LocalLicense, "signature">) {
  const body = JSON.stringify(payload);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(LOCAL_MOCK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyLicenseSignature(license: LocalLicense) {
  const { signature, ...rest } = license;
  const expected = await hmacSign(rest);
  return signature === expected;
}

export function evaluateAccess(license: LocalLicense | null, now = Date.now()): AccessState {
  if (!license) {
    return {
      level: "reconnect_required",
      canEdit: false,
      canImport: false,
      canExportPdf: false,
      browseRatio: 0.5,
      message: "請連線登入以驗證會籍。",
    };
  }

  const membershipOk = new Date(license.membershipExpiresAt).getTime() > now;
  const offlineOk = new Date(license.offlineUntil).getTime() > now;

  if (!membershipOk) {
    return {
      level: "expired",
      canEdit: false,
      canImport: false,
      canExportPdf: false,
      browseRatio: 0.5,
      message: "會籍已到期：僅能瀏覽部分內容，請續約並連線登入。",
    };
  }

  if (!offlineOk) {
    return {
      level: "reconnect_required",
      canEdit: false,
      canImport: false,
      canExportPdf: false,
      browseRatio: 0.5,
      message: `已超過 ${OFFLINE_DAYS} 天未連線：請連上網路並重新登入以確認會籍。`,
    };
  }

  return {
    level: "full",
    canEdit: true,
    canImport: true,
    canExportPdf: true,
    browseRatio: 1,
    message: `會籍有效 · 離線可用至 ${new Date(license.offlineUntil).toLocaleDateString("zh-TW")}`,
  };
}

export async function loginLocal(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${getLocalMockApiUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        deviceId: getOrCreateDeviceId(),
        deviceName: getDeviceName(),
      }),
    });
  } catch {
    throw new Error("無法連線授權伺服器，請確認電腦正在執行 npm run local:lan");
  }
  let data: { error?: string; license?: LocalLicense };
  try {
    data = await res.json();
  } catch {
    throw new Error("授權伺服器回應異常");
  }
  if (!res.ok) {
    const raw = data.error;
    const msg =
      typeof raw === "string" && raw.trim()
        ? raw
        : res.status === 500
          ? "伺服器錯誤，請稍後再試或聯絡客服"
          : res.status === 503
            ? "授權服務暫時無法使用，請確認資料庫 migration 已執行"
            : "登入失敗";
    if (res.status === 403 && msg.includes("裝置上限")) {
      throw new Error(`${msg}（電腦執行 npm run lan:reset-devices 可重置）`);
    }
    throw new Error(msg);
  }
  setStoredLicense(data.license as LocalLicense);
  return data;
}

export async function refreshLocalLicense() {
  const license = getStoredLicense();
  if (!license) throw new Error("尚未登入");
  const res = await fetch(`${getLocalMockApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "無法更新授權");
  setStoredLicense(data.license as LocalLicense);
  return data;
}

export async function pingMockApi() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${getLocalMockApiUrl()}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
