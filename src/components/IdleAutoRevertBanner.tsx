import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Shows a small banner reminding both parties that the conversation will
 * auto-switch back to the AI assistant after 5 minutes of inactivity in
 * human-takeover mode.
 *
 * - `takeoverAt`: ISO timestamp when admin took over (or last activity reset).
 * - `lastActivityAt`: ISO timestamp of the latest message in the room.
 * - Hidden when AI is currently enabled or when timing data is missing.
 */
export function IdleAutoRevertBanner({
  aiEnabled,
  takeoverAt,
  lastActivityAt,
}: {
  aiEnabled: boolean;
  takeoverAt: string | null;
  lastActivityAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Only show when admin has explicitly taken over (takeoverAt is set).
  if (aiEnabled) return null;
  if (!takeoverAt) return null;
  const takeover = new Date(takeoverAt).getTime();
  const lastAct = lastActivityAt ? new Date(lastActivityAt).getTime() : takeover;
  const anchor = Math.max(takeover, lastAct);
  const limitMs = 5 * 60 * 1000;
  const remainMs = Math.max(0, anchor + limitMs - now);
  const sec = Math.ceil(remainMs / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  const pct = Math.min(100, Math.max(0, (1 - remainMs / limitMs) * 100));
  const danger = remainMs < 60 * 1000;

  return (
    <div className={`mx-auto my-2 max-w-[640px] rounded-xl border px-3 py-2 text-[11px] ${
      danger
        ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    }`}>
      <div className="flex items-center gap-2 font-semibold">
        <Clock className="h-3.5 w-3.5" />
        {remainMs === 0
          ? "已閒置 5 分鐘，即將自動切回 AI 客服…"
          : `閒置 ${m > 0 ? `${m} 分 ` : ""}${s} 秒後將自動切回 AI 客服`}
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-background/60">
        <div
          className={`h-full transition-all ${danger ? "bg-rose-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
