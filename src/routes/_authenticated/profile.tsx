import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Cloud, Check, Loader2, User as UserIcon, Stamp, Shield } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile, useUpdateProfile, useProjects } from "@/lib/db";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "個人資料 — 現場紀錄" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: projects = [] } = useProjects();
  const { data: isAdmin } = useIsAdmin();
  const update = useUpdateProfile();
  const [email, setEmail] = useState<string>("");
  const [display, setDisplay] = useState("");
  const [brand, setBrand] = useState("");
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  useEffect(() => {
    if (profile) {
      setDisplay(profile.display_name ?? "");
      setBrand(profile.brand_name ?? "");
    }
  }, [profile]);
  useEffect(() => {
    setLastSync(new Date().toLocaleString("zh-TW"));
  }, [projects.length]);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">個人資料</h1>
      <p className="mt-1 text-sm text-muted-foreground">所有資料都自動同步到雲端，換手機也不會不見。</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <UserIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold">{profile?.display_name || "未命名"}</div>
              <div className="truncate text-xs text-muted-foreground">{email}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">顯示名稱</span>
              <input value={display} onChange={(e) => setDisplay(e.target.value)} className={inp} placeholder="師傅大名" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">系統名稱（左上角顯示）</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inp} placeholder="現場紀錄" />
            </label>
            <button
              onClick={() => update.mutate({ display_name: display.trim() || null, brand_name: brand.trim() || null })}
              disabled={update.isPending}
              className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {update.isSuccess && !update.isPending ? "已儲存" : "儲存變更"}
            </button>
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--color-status-done)]/15 text-[color:var(--color-status-done)]">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold">雲端同步</div>
              <div className="text-xs text-muted-foreground">所有資料即時上雲</div>
            </div>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <Row label="同步狀態" value={<span className="inline-flex items-center gap-1 text-[color:var(--color-status-done)]"><Check className="h-3.5 w-3.5" /> 已同步</span>} />
            <Row label="案件數量" value={`${projects.length} 件`} />
            <Row label="最後檢查" value={lastSync || "—"} />
          </dl>
          <p className="mt-4 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            登入相同帳號，即可在不同手機/電腦上看到完全相同的案件、日誌、照片與材料。
          </p>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/20 text-accent-foreground">
              <Stamp className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold">照片浮水印</div>
              <div className="text-xs text-muted-foreground">自動印上案件、時間、地址、人員</div>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">{profile?.watermark_enabled !== false ? "啟用中" : "已關閉"}</div>
              <div className="text-xs text-muted-foreground">關閉後上傳的照片不會加浮水印</div>
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={profile?.watermark_enabled !== false}
              onChange={(e) => update.mutate({ watermark_enabled: e.target.checked })}
            />
            <span
              aria-hidden
              className={`relative inline-block h-7 w-12 rounded-full transition ${profile?.watermark_enabled !== false ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${profile?.watermark_enabled !== false ? "left-5" : "left-0.5"}`}
              />
            </span>
          </label>
        </section>

        <section className="card-surface p-5 md:col-span-2">
          <h2 className="text-sm font-bold">帳號</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110"
              >
                <Shield className="h-4 w-4" /> 管理員面板
              </Link>
            )}
            <button
              onClick={logout}
              className="btn-touch inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> 登出
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

const inp = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
