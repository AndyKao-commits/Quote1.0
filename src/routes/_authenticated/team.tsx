import { createFileRoute } from "@tanstack/react-router";
import { Users, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "團隊管理 — 現場紀錄" }] }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">團隊管理</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <Lock className="h-3 w-3" /> Coming Soon
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">建立團隊、邀請夥伴、分派案件權限。功能規劃中，敬請期待。</p>

      <section className="card-surface mt-6 grid place-items-center px-6 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold">團隊功能即將啟動</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          未來您將可以建立工程團隊、邀請成員共同編輯案件、設定不同的權限角色，所有人都能即時同步現場紀錄。
        </p>

        <ul className="mt-6 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-2">
          <li className="rounded-lg bg-muted px-3 py-2">✓ 建立 / 解散團隊</li>
          <li className="rounded-lg bg-muted px-3 py-2">✓ 邀請成員（Email）</li>
          <li className="rounded-lg bg-muted px-3 py-2">✓ 案件權限分派</li>
          <li className="rounded-lg bg-muted px-3 py-2">✓ 團隊共享照片庫</li>
        </ul>

        <button
          type="button"
          disabled
          className="mt-6 cursor-not-allowed rounded-lg border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground"
        >
          即將啟動
        </button>
      </section>
    </AppShell>
  );
}
