import { Link } from "@tanstack/react-router";
import type { AccessState } from "@/lib/local-first/license";
import { WifiOff } from "lucide-react";

export function LocalAccessBanner({ access, onReconnect }: { access: AccessState; onReconnect?: () => void }) {
  if (access.level === "full") {
    return (
      <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        {access.message}
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">需要連線驗證會籍</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{access.message}</p>
          <p className="mt-1 text-xs opacity-75">目前僅能瀏覽約 50% 內容，無法編輯或匯入。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onReconnect ? (
              <button type="button" className="bdg-btn bdg-btn-primary text-xs" onClick={onReconnect}>
                連線並重新驗證
              </button>
            ) : null}
            <Link to="/auth" className="bdg-btn text-xs">
              前往登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HalfBrowseOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 z-10 flex items-end justify-center bg-gradient-to-b from-transparent to-white/95 pb-6"
      aria-hidden
    >
      <p className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900 shadow-sm">
        續約並連線後可瀏覽完整內容
      </p>
    </div>
  );
}
