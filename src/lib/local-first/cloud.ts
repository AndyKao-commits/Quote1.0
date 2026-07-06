import { localDb } from "@/lib/local-first/db";
import { exportLocalBackup, importLocalBackup } from "@/lib/local-first/store";
import { getStoredLicense } from "@/lib/local-first/license";
import { randomId } from "@/lib/local-first/random-id";

export type CloudProvider = "icloud" | "google" | "onedrive";

const PROVIDER_LABEL: Record<CloudProvider, string> = {
  icloud: "iCloud",
  google: "Google 雲端硬碟",
  onedrive: "OneDrive",
};

export function detectCloudProvider(): CloudProvider {
  if (typeof navigator === "undefined") return "onedrive";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "icloud";
  if (/Android/i.test(ua)) return "google";
  return "onedrive";
}

export function getCloudProviderLabel(p: CloudProvider = detectCloudProvider()) {
  return PROVIDER_LABEL[p];
}

/** 模擬上傳到使用者雲端：實際寫入 IndexedDB + localStorage 鏡像 */
export async function backupToSimulatedCloud(options?: { label?: string }) {
  const license = getStoredLicense();
  if (!license) throw new Error("請先登入");
  const provider = detectCloudProvider();
  const payload = await exportLocalBackup();
  const id = randomId();
  const createdAt = new Date().toISOString();
  const label = options?.label ?? `報得過備份 ${new Date().toLocaleString("zh-TW")}`;
  const row = {
    id,
    userId: license.userId,
    provider,
    label,
    payload: JSON.stringify(payload),
    createdAt,
  };
  await localDb.cloudBackups.put(row);
  localStorage.setItem(`bdg_cloud_sim_${provider}`, row.payload);
  localStorage.setItem(`bdg_cloud_sim_${provider}_meta`, JSON.stringify({ id, createdAt, label: row.label }));
  return { provider, label: row.label, createdAt };
}

export async function listSimulatedCloudBackups() {
  const license = getStoredLicense();
  if (!license) return [];
  return localDb.cloudBackups.where("userId").equals(license.userId).reverse().sortBy("createdAt");
}

export async function restoreFromSimulatedCloud(backupId?: string) {
  const license = getStoredLicense();
  if (!license) throw new Error("請先登入");
  if (backupId) {
    const row = await localDb.cloudBackups.get(backupId);
    if (!row || row.userId !== license.userId) throw new Error("找不到備份");
    await importLocalBackup(JSON.parse(row.payload));
    return { provider: row.provider, restored: true };
  }
  const provider = detectCloudProvider();
  const raw = localStorage.getItem(`bdg_cloud_sim_${provider}`);
  if (!raw) throw new Error("雲端尚無備份");
  await importLocalBackup(JSON.parse(raw));
  return { provider, restored: true };
}
