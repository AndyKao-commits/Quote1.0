import { useEffect } from "react";
import { runAutoCloudBackup } from "@/lib/local-first/auto-backup";
import { useLocalAccess } from "@/hooks/use-local-access";

const INTERVAL_MS = 5 * 60 * 1000;

/** 本機模式：連線時自動雲端存檔 */
export function AutoCloudBackupRunner() {
  const { isLocalMode, access } = useLocalAccess();
  const canAuto = isLocalMode && access?.canEdit;

  useEffect(() => {
    if (!canAuto) return;

    void runAutoCloudBackup("session-start");

    const interval = setInterval(() => {
      void runAutoCloudBackup("interval");
    }, INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void runAutoCloudBackup("background");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canAuto]);

  return null;
}
