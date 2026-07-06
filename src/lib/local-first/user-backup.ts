import { localDb } from "@/lib/local-first/db";
import { exportLocalBackup, importLocalBackup } from "@/lib/local-first/store";
import { getStoredLicense } from "@/lib/local-first/license";
import { randomId } from "@/lib/local-first/random-id";
import type { CloudBackupRow } from "@/lib/local-first/db";

export type BackupProvider = CloudBackupRow["provider"];

const OPFS_DIR = "baodeguo";
const OPFS_FILE = "latest.bdg";

export type BackupPayload = Awaited<ReturnType<typeof exportLocalBackup>>;

export function createBackupBlob(payload: BackupPayload): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/octet-stream",
  });
}

export function backupFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `baodeguo-${stamp}.bdg`;
}

export async function downloadBackupFile(payload?: BackupPayload) {
  const data = payload ?? (await exportLocalBackup());
  const blob = createBackupBlob(data);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = backupFileName();
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function canShareBackupFile(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const file = new File(
      [createBackupBlob(await exportLocalBackup())],
      backupFileName(),
      { type: "application/octet-stream" },
    );
    return navigator.canShare?.({ files: [file] }) ?? false;
  } catch {
    return false;
  }
}

/** 透過系統分享（可存到 iCloud、Google 雲端、檔案 App 等），資料不經我們伺服器 */
export async function shareBackupToUserCloud(payload?: BackupPayload) {
  const data = payload ?? (await exportLocalBackup());
  const file = new File([createBackupBlob(data)], backupFileName(), {
    type: "application/octet-stream",
  });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "報得過存檔" });
    return { method: "share" as const };
  }
  await downloadBackupFile(data);
  return { method: "download" as const };
}

async function writeOpfsBackup(payload: BackupPayload): Promise<boolean> {
  if (!("storage" in navigator) || !navigator.storage?.getDirectory) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
    const handle = await dir.getFileHandle(OPFS_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

async function readOpfsBackup(): Promise<BackupPayload | null> {
  if (!("storage" in navigator) || !navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR);
    const handle = await dir.getFileHandle(OPFS_FILE);
    const file = await handle.getFile();
    return JSON.parse(await file.text()) as BackupPayload;
  } catch {
    return null;
  }
}

/** 自動存檔：僅寫入使用者裝置（IndexedDB + 私有檔案區），不上傳伺服器 */
export async function backupToUserDevice(options?: {
  label?: string;
  provider?: BackupProvider;
}) {
  const license = getStoredLicense();
  if (!license) throw new Error("請先登入");
  const payload = await exportLocalBackup();
  const opfs = await writeOpfsBackup(payload);
  const id = randomId();
  const createdAt = new Date().toISOString();
  const label = options?.label ?? `報得過存檔 ${new Date().toLocaleString("zh-TW")}`;
  const provider = options?.provider ?? "device";
  await localDb.cloudBackups.put({
    id,
    userId: license.userId,
    provider: provider === "device" ? "device" : provider,
    label,
    payload: JSON.stringify(payload),
    createdAt,
  });
  return { label, createdAt, opfs, provider };
}

export async function listDeviceBackups() {
  const license = getStoredLicense();
  if (!license) return [];
  return localDb.cloudBackups.where("userId").equals(license.userId).reverse().sortBy("createdAt");
}

export async function restoreFromUserDevice(backupId?: string) {
  const license = getStoredLicense();
  if (!license) throw new Error("請先登入");
  if (backupId) {
    const row = await localDb.cloudBackups.get(backupId);
    if (!row || row.userId !== license.userId) throw new Error("找不到備份");
    await importLocalBackup(JSON.parse(row.payload));
    return { restored: true, source: "history" as const };
  }
  const opfs = await readOpfsBackup();
  if (opfs) {
    await importLocalBackup(opfs);
    return { restored: true, source: "opfs" as const };
  }
  const rows = await listDeviceBackups();
  const latest = rows[0];
  if (latest) {
    await importLocalBackup(JSON.parse(latest.payload));
    return { restored: true, source: "history" as const };
  }
  throw new Error("裝置尚無自動存檔，請匯入檔案還原");
}
