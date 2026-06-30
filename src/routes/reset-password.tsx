import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { setSession } from "@/lib/session";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "重設密碼 — 報得過" }] }),
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
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session.access_token, data.session.refresh_token);
      }
      setDone(true);
      setTimeout(() => nav({ to: "/quotes" }), 1500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bdg-theme flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center font-display text-2xl font-bold text-[var(--bdg-ink)]">
          報得過
        </Link>

        <div className="bdg-auth-card">
          <h1 className="text-lg font-bold text-[var(--bdg-ink)]">重設密碼</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-[var(--bdg-muted)]">
              請從 Email 中的「重設密碼」連結進入此頁。如果連結已失效，請重新申請。
            </p>
          ) : done ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> 密碼已更新，正在前往報價列表…
            </p>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--bdg-muted)]">新密碼</span>
                <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required inputClassName="bdg-field-input pr-10" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--bdg-muted)]">確認新密碼</span>
                <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required inputClassName="bdg-field-input pr-10" />
              </label>
              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button type="submit" disabled={busy} className="bdg-btn bdg-btn-primary flex w-full justify-center rounded-full py-3">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                更新密碼
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--bdg-muted)]">
          <Link to="/auth" className="hover:underline">
            ← 回登入
          </Link>
        </p>
      </div>
    </div>
  );
}
