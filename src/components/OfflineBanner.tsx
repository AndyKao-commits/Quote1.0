import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        目前離線：顯示本機快取的報價與項目。編輯與儲存需連上網路；有網路時會自動同步雲端資料。
      </p>
    </div>
  );
}
