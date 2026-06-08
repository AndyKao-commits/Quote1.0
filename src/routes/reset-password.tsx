import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wrench, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "重設密碼 — 施工紀錄 PRO" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the URL hash and sets the session for type=recovery automatically.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 6) return setErr("密碼至少 6 碼");
    if (pw !== pw2) return setErr("兩次密碼不一致");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      setTimeout(() => nav({ to: "/dashboard" }), 1500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold">施工紀錄 PRO</span>
        </Link>

        <div className="card-surface p-6">
          <h1 className="text-lg font-bold">重設密碼</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground">
              請從 Email 中的「重設密碼」連結進入此頁。如果連結已失效，請重新申請。
            </p>
          ) : done ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" /> 密碼已更新，正在前往儀表板…
            </p>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">新密碼</span>
                <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">確認新密碼</span>
                <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required />
              </label>
              {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="btn-touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                更新密碼
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:underline">← 回登入</Link>
        </p>
      </div>
    </div>
  );
}
