import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Cloud, RefreshCw, Share2 } from "lucide-react";
import { LocalAccessBanner } from "@/components/local-first/LocalAccessBanner";
import {
  detectCloudProvider,
  getCloudProviderLabel,
  shareBackupToUserCloud,
} from "@/lib/local-first/cloud";
import { getAutoBackupMeta, recordBackupMeta } from "@/lib/local-first/auto-backup";
import {
  evaluateAccess,
  getStoredLicense,
  pingMockApi,
  refreshLocalLicense,
} from "@/lib/local-first/license";
import {
  backupToUserDevice,
  canShareBackupFile,
  downloadBackupFile,
  listDeviceBackups,
  restoreFromUserDevice,
} from "@/lib/local-first/user-backup";
import { importLocalBackup } from "@/lib/local-first/store";
import { toast } from "sonner";

export function LocalSettingsExtras() {
  const license = getStoredLicense();
  const access = evaluateAccess(license);
  const suggestedCloud = detectCloudProvider();
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [autoMeta, setAutoMeta] = useState(() => getAutoBackupMeta());

  useEffect(() => {
    void canShareBackupFile().then(setCanShare);
  }, []);

  useEffect(() => {
    const sync = () => setAutoMeta(getAutoBackupMeta());
    window.addEventListener("bdg-auto-backup", sync);
    return () => window.removeEventListener("bdg-auto-backup", sync);
  }, []);

  const { data: backups, refetch } = useQuery({
    queryKey: ["local-device-backups"],
    queryFn: listDeviceBackups,
    enabled: Boolean(license),
  });

  async function reconnect() {
    setBusy(true);
    try {
      if (!(await pingMockApi())) throw new Error("無法連線至授權伺服器，請確認網路後再試");
      await refreshLocalLicense();
      toast.success("已重新驗證會籍");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "連線失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deviceBackup() {
    if (!access.canEdit) {
      toast.error("目前狀態無法備份");
      return;
    }
    setBusy(true);
    try {
      const label = `手動存檔 ${new Date().toLocaleString("zh-TW")}`;
      await backupToUserDevice({ label });
      await recordBackupMeta(label, "manual");
      setAutoMeta(getAutoBackupMeta());
      toast.success("已存到本機裝置（不上傳伺服器）");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "備份失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deviceRestore() {
    setBusy(true);
    try {
      const r = await restoreFromUserDevice();
      toast.success(r.source === "opfs" ? "已從裝置自動存檔還原" : "已從本機備份還原");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "還原失敗");
    } finally {
      setBusy(false);
    }
  }

  async function shareToUserCloud() {
    if (!access.canEdit) {
      toast.error("目前狀態無法備份");
      return;
    }
    setBusy(true);
    try {
      const r = await shareBackupToUserCloud();
      if (r.method === "share") {
        toast.success(`可選擇存到 ${getCloudProviderLabel(suggestedCloud)} 或檔案 App`);
      } else {
        toast.success("已下載存檔，可手動上傳至你的雲端");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "分享失敗");
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    if (!access.canImport) {
      toast.error("請先連線驗證會籍");
      return;
    }
    const text = await file.text();
    await importLocalBackup(JSON.parse(text));
    toast.success("已匯入存檔");
    window.location.reload();
  }

  return (
    <div className="mt-8 space-y-4 border-t border-[var(--bdg-line)] pt-8">
      <h2 className="text-lg font-semibold text-[var(--bdg-ink)]">資料與同步</h2>
      <p className="text-sm text-[var(--bdg-muted)]">
        報價資料僅存於你的裝置或你選擇的雲端／檔案，不會上傳至報得過伺服器。
      </p>

      <LocalAccessBanner access={access} onReconnect={reconnect} />

      <section className="bdg-card p-4 text-sm">
        <h3 className="font-semibold">會籍與裝置</h3>
        {license ? (
          <ul className="mt-2 space-y-1 text-xs text-[var(--bdg-muted)]">
            <li>帳號：{license.email}</li>
            <li>會籍至：{new Date(license.membershipExpiresAt).toLocaleString("zh-TW")}</li>
            <li>離線可用至：{new Date(license.offlineUntil).toLocaleString("zh-TW")}</li>
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--bdg-muted)]">尚未登入</p>
        )}
        <button type="button" className="bdg-btn mt-3 text-xs" disabled={busy} onClick={reconnect}>
          <RefreshCw className="h-3 w-3" /> 連線驗證會籍
        </button>
      </section>

      <section className="bdg-card p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <Cloud className="h-4 w-4" /> 自動存檔（本機）
        </h3>
        <p className="mt-1 text-xs text-[var(--bdg-muted)]">
          連線時自動將品牌設定、報價單與項目庫存到本機裝置。編輯後約 30 秒、每 5 分鐘，或離開頁面時觸發。
        </p>
        {autoMeta ? (
          <p className="mt-2 text-xs text-emerald-800">
            上次存檔：{new Date(autoMeta.at).toLocaleString("zh-TW")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--bdg-muted)]">尚無自動存檔紀錄</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="bdg-btn bdg-btn-primary text-xs" disabled={busy} onClick={deviceBackup}>
            立即存檔
          </button>
          <button type="button" className="bdg-btn text-xs" disabled={busy} onClick={deviceRestore}>
            從本機還原
          </button>
        </div>
        {backups?.length ? (
          <ul className="mt-3 space-y-1 text-xs text-[var(--bdg-muted)]">
            {backups.slice(0, 5).map((b) => (
              <li key={b.id}>
                {b.label} · {getCloudProviderLabel(b.provider)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="bdg-card p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <Share2 className="h-4 w-4" /> 存到你的雲端或檔案
        </h3>
        <p className="mt-1 text-xs text-[var(--bdg-muted)]">
          {canShare
            ? `透過系統分享，可存到 ${getCloudProviderLabel(suggestedCloud)}、檔案 App、AirDrop 等。`
            : "下載 .bdg 存檔後，可手動上傳至 iCloud、Google 雲端或其他備份服務。"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="bdg-btn bdg-btn-primary text-xs" disabled={busy} onClick={shareToUserCloud}>
            {canShare ? "分享存檔" : "下載存檔"}
          </button>
          <button type="button" className="bdg-btn text-xs" disabled={busy} onClick={() => downloadBackupFile()}>
            另存檔案
          </button>
          <label className="bdg-btn cursor-pointer text-xs">
            從檔案匯入
            <input
              type="file"
              accept=".bdg,.json,application/json,application/octet-stream"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
