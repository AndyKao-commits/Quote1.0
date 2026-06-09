import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut, Check, Loader2, Stamp, Shield, KeyRound, MessageCircle, Inbox, ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile, useUpdateProfile, useSupportUnreadCount } from "@/lib/db";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUploader } from "@/components/AvatarUploader";
import { PasswordInput } from "@/components/PasswordInput";
import { MembershipPanel } from "@/components/MembershipPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "我的 — 施工紀錄 PRO" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { data: unread = 0 } = useSupportUnreadCount(isAdmin === true);
  const update = useUpdateProfile();
  const [email, setEmail] = useState("");
  const [display, setDisplay] = useState("");
  const [brand, setBrand] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  useEffect(() => {
    if (profile) {
      setDisplay(profile.display_name ?? "");
      setBrand(profile.brand_name ?? "");
    }
  }, [profile]);

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (newPw.length < 6) return setPwErr("新密碼至少 6 碼");
    if (newPw !== newPw2) return setPwErr("兩次新密碼不一致");
    if (!email) return setPwErr("無法取得 Email");
    setPwBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: curPw });
      if (signErr) throw new Error("目前密碼不正確");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg("密碼已更新，請重新登入。");
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      setTimeout(async () => {
        await supabase.auth.signOut();
        nav({ to: "/auth" });
      }, 1500);
    } catch (e: unknown) {
      setPwErr(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">我的</h1>
      <p className="mt-1 text-sm text-muted-foreground">帳號、設定與服務</p>

      <div className="mt-6 space-y-4">
        <MembershipPanel />

        <section className="card-surface p-5">
          <AvatarUploader
            name={profile?.display_name ?? email}
            path={profile?.avatar_url ?? null}
            onChange={(newPath) => update.mutate({ avatar_url: newPath })}
          />
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">顯示名稱</span>
              <input value={display} onChange={(e) => setDisplay(e.target.value)} className={inp} placeholder="師傅大名" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">系統名稱</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inp} placeholder="施工紀錄 PRO" />
            </label>
            <p className="text-xs text-muted-foreground">{email}</p>
            <button
              onClick={() => update.mutate({ display_name: display.trim() || null, brand_name: brand.trim() || null })}
              disabled={update.isPending}
              className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              儲存
            </button>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <h2 className="px-5 pt-4 text-sm font-bold text-muted-foreground">服務</h2>
          <ServiceLink to="/support" icon={<MessageCircle className="h-4 w-4" />} label="AI 客服" desc="操作問題、功能諮詢" />
          {isAdmin && (
            <>
              <ServiceLink to="/admin" icon={<Shield className="h-4 w-4" />} label="管理員面板" desc="使用者與會員管理" />
              <ServiceLink to="/admin/inbox" icon={<Inbox className="h-4 w-4" />} label="客服收件夾" desc="回覆用戶訊息" badge={unread > 0 ? unread : undefined} />
            </>
          )}
        </section>

        <section className="card-surface p-5">
          <h2 className="text-sm font-bold">偏好設定</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <Stamp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">照片浮水印</div>
                  <div className="text-xs text-muted-foreground">{profile?.watermark_enabled !== false ? "啟用中" : "已關閉"}</div>
                </div>
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
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <span className="text-sm font-semibold">外觀主題</span>
              <ThemeToggle />
            </div>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-secondary/50"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <KeyRound className="h-4 w-4" /> 變更密碼
            </span>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition ${showPassword ? "rotate-90" : ""}`} />
          </button>
          {showPassword && (
            <form className="space-y-3 border-t border-border px-5 py-4" onSubmit={changePassword}>
              <PasswordInput value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="目前密碼" required />
              <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="新密碼（至少 6 碼）" minLength={6} required />
              <PasswordInput value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="確認新密碼" minLength={6} required />
              {pwErr && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{pwErr}</p>}
              {pwMsg && <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">{pwMsg}</p>}
              <button
                type="submit"
                disabled={pwBusy}
                className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
              >
                {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                更新密碼
              </button>
            </form>
          )}
        </section>

        <button
          onClick={logout}
          className="btn-touch flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-card py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" /> 登出
        </button>
      </div>
    </AppShell>
  );
}

const inp = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function ServiceLink({ to, icon, label, desc, badge }: { to: string; icon: React.ReactNode; label: string; desc: string; badge?: number }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-t border-border px-5 py-4 transition hover:bg-secondary/50"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {badge ? (
        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
