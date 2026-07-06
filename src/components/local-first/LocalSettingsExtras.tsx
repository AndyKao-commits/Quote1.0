import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";
import { LocalAccessBanner } from "@/components/local-first/LocalAccessBanner";
import {
  backupToSimulatedCloud,
  detectCloudProvider,
  getCloudProviderLabel,
  listSimulatedCloudBackups,
  restoreFromSimulatedCloud,
} from "@/lib/local-first/cloud";
import { getAutoBackupMeta, recordBackupMeta } from "@/lib/local-first/auto-backup";
import {
  evaluateAccess,
  getStoredLicense,
  pingMockApi,
  refreshLocalLicense,
} from "@/lib/local-first/license";
import { exportLocalBackup, importLocalBackup } from "@/lib/local-first/store";
import { toast } from "sonner";

export function LocalSettingsExtras() {
  const license = getStoredLicense();
  const access = evaluateAccess(license);
  const provider = detectCloudProvider();
  const [busy, setBusy] = useState(false);
  const [autoMeta, setAutoMeta] = useState(() => getAutoBackupMeta());

  useEffect(() => {
    const sync = () => setAutoMeta(getAutoBackupMeta());
    window.addEventListener("bdg-auto-backup", sync);
    return () => window.removeEventListener("bdg-auto-backup", sync);
  }, []);

  const { data: backups, refetch } = useQuery({
    queryKey: ["local-cloud-backups"],
    queryFn: listSimulatedCloudBackups,
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

  async function cloudBackup() {
    if (!access.canEdit) {
      toast.error("目前狀態無法備份");
      return;
    }
    setBusy(true);
    try {
      const label = `手動備份 ${new Date().toLocaleString("zh-TW")}`;
      const r = await backupToSimulatedCloud({ label });
      await recordBackupMeta(r.label, "manual");
      setAutoMeta(getAutoBackupMeta());
      toast.success(`已備份至 ${getCloudProviderLabel(r.provider)}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "備份失敗");
    } finally {
      setBusy(false);
    }
  }

  async function cloudRestore() {
    setBusy(true);
    try {
      const r = await restoreFromSimulatedCloud();
      toast.success(`已從 ${getCloudProviderLabel(r.provider)} 還原`);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "還原失敗");
    } finally {
      setBusy(false);
    }
  }

  async function downloadFile() {
    const payload = await exportLocalBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `baodeguo-save-${Date.now()}.bdg.json`;
    a.click();
    URL.revokeObjectURL(a.href);
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
      <p className="text-sm text-[var(--bdg-muted)]">會籍驗證、雲端自動存檔與手動匯出</p>

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
          <Cloud className="h-4 w-4" /> 自動存檔
        </h3>
        <p className="mt-1 text-xs text-[var(--bdg-muted)]">
          連線時自動將品牌設定、報價單與項目庫備份至 <strong>{getCloudProviderLabel(provider)}</strong>。
          編輯後約 30 秒、每 5 分鐘，或離開頁面時觸發。
        </p>
        {autoMeta ? (
          <p className="mt-2 text-xs text-emerald-800">
            上次存檔：{new Date(autoMeta.at).toLocaleString("zh-TW")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--bdg-muted)]">尚無自動存檔紀錄</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="bdg-btn bdg-btn-primary text-xs" disabled={busy} onClick={cloudBackup}>
            立即備份
          </button>
          <button type="button" className="bdg-btn text-xs" disabled={busy} onClick={cloudRestore}>
            從雲端還原
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
        <h3 className="font-semibold">手動存檔</h3>
        <p className="mt-1 text-xs text-[var(--bdg-muted)]">
          無法連線雲端時，可將資料匯出成檔案帶到其他裝置還原（需同一帳號）。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="bdg-btn text-xs" onClick={downloadFile}>
            匯出存檔
          </button>
          <label className="bdg-btn cursor-pointer text-xs">
            匯入存檔
            <input
              type="file"
              accept=".json,.bdg,application/json"
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
