import { isLocalFirstMode } from "@/lib/local-first/config";
import { backupToSimulatedCloud } from "@/lib/local-first/cloud";
import { evaluateAccess, getStoredLicense } from "@/lib/local-first/license";
import { exportLocalBackup } from "@/lib/local-first/store";

const META_KEY = "bdg_auto_backup_meta";
const MIN_INTERVAL_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 30_000;

export type AutoBackupMeta = {
  at: string;
  fingerprint: string;
  label: string;
  trigger: string;
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

export function getAutoBackupMeta(): AutoBackupMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as AutoBackupMeta) : null;
  } catch {
    return null;
  }
}

function setAutoBackupMeta(meta: AutoBackupMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  window.dispatchEvent(new Event("bdg-auto-backup"));
}

export async function recordBackupMeta(label: string, trigger: string) {
  const fp = await dataFingerprint();
  const meta: AutoBackupMeta = {
    at: new Date().toISOString(),
    fingerprint: fp,
    label,
    trigger,
  };
  setAutoBackupMeta(meta);
  return meta;
}

async function dataFingerprint(): Promise<string> {
  const payload = await exportLocalBackup();
  const maxUpdated = payload.quotes.reduce(
    (m, q) => Math.max(m, new Date(q.updated_at).getTime()),
    0,
  );
  return `${payload.userId}:${payload.quotes.length}:${payload.quoteLines.length}:${payload.catalogItems.length}:${maxUpdated}`;
}

export function scheduleAutoCloudBackup() {
  if (!isLocalFirstMode()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoCloudBackup("data-change");
  }, DEBOUNCE_MS);
}

export async function runAutoCloudBackup(trigger: string) {
  if (inFlight) return { ok: false as const, skipped: "busy" };
  if (!isLocalFirstMode()) return { ok: false as const, skipped: "not-local" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false as const, skipped: "offline" };
  }

  const license = getStoredLicense();
  if (!license) return { ok: false as const, skipped: "no-license" };
  if (!evaluateAccess(license).canEdit) return { ok: false as const, skipped: "no-access" };

  const fp = await dataFingerprint();
  const prev = getAutoBackupMeta();
  const now = Date.now();
  if (
    prev &&
    prev.fingerprint === fp &&
    now - new Date(prev.at).getTime() < MIN_INTERVAL_MS
  ) {
    return { ok: false as const, skipped: "unchanged" };
  }

  inFlight = true;
  try {
    const label = `自動存檔 ${new Date().toLocaleString("zh-TW")}`;
    const r = await backupToSimulatedCloud({ label });
    const meta = await recordBackupMeta(r.label, trigger);
    return { ok: true as const, meta };
  } catch {
    return { ok: false as const, skipped: "failed" };
  } finally {
    inFlight = false;
  }
}
