import {
  backupToUserDevice,
  listDeviceBackups,
  restoreFromUserDevice,
  shareBackupToUserCloud,
} from "@/lib/local-first/user-backup";

export type CloudProvider = "icloud" | "google" | "onedrive" | "device";

const PROVIDER_LABEL: Record<CloudProvider, string> = {
  icloud: "iCloud",
  google: "Google 雲端硬碟",
  onedrive: "OneDrive",
  device: "本機裝置",
};

export function detectCloudProvider(): Exclude<CloudProvider, "device"> {
  if (typeof navigator === "undefined") return "onedrive";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "icloud";
  if (/Android/i.test(ua)) return "google";
  return "onedrive";
}

export function getCloudProviderLabel(p: CloudProvider = detectCloudProvider()) {
  return PROVIDER_LABEL[p];
}

/** @deprecated 使用 backupToUserDevice */
export const backupToSimulatedCloud = backupToUserDevice;

/** @deprecated 使用 listDeviceBackups */
export const listSimulatedCloudBackups = listDeviceBackups;

/** @deprecated 使用 restoreFromUserDevice */
export const restoreFromSimulatedCloud = restoreFromUserDevice;

export { shareBackupToUserCloud };
