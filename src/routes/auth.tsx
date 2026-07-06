import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { signIn, signUp } from "@/lib/auth.functions";
import {
  setSession,
  getRememberLogin,
  setRememberLogin,
  getRememberedEmail,
  setRememberedEmail,
  ensureValidSession,
} from "@/lib/session";
import { refreshSession } from "@/lib/auth.functions";
import { PasswordInput } from "@/components/PasswordInput";
import { isLocalFirstMode } from "@/lib/local-first/config";
import { getStoredLicense, loginLocal } from "@/lib/local-first/license";
import { ensureLocalProfile } from "@/lib/local-first/store";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "登入 — 報得過" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const nav = useNavigate();
  const localMode = isLocalFirstMode();
  const signInFn = useServerFn(signIn);
  const signUpFn = useServerFn(signUp);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(() => getRememberLogin());
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (localMode) {
        if (!cancelled && getStoredLicense()) nav({ to: "/quotes" });
        return;
      }
      const ok = await ensureValidSession(async (refreshToken) =>
        refreshSession({ data: { refresh_token: refreshToken } }),
      );
      if (!cancelled && ok) nav({ to: "/quotes" });
    })();
    return () => {
      cancelled = true;
    };
  }, [nav, localMode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (localMode) {
        await loginLocal(email, pw);
        await ensureLocalProfile();
        setRememberLogin(remember);
        if (remember) setRememberedEmail(email);
        else setRememberedEmail("");
        nav({ to: "/quotes" });
        return;
      }
      if (mode === "signup") {
        const res = await signUpFn({ data: { email, password: pw, display_name: name, company_name: company } });
        if ("needs_confirm" in res && res.needs_confirm) {
          setMsg("註冊成功，請查收 Email 確認信。");
          return;
        }
        if ("access_token" in res) {
          setRememberLogin(remember);
          if (remember) setRememberedEmail(email);
          setSession(res.access_token, res.refresh_token!);
          nav({ to: "/quotes/new" });
        }
      } else {
        const res = await signInFn({ data: { email, password: pw } });
        setRememberLogin(remember);
        if (remember) setRememberedEmail(email);
        else setRememberedEmail("");
        setSession(res.access_token, res.refresh_token);
        nav({ to: "/quotes" });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "操作失敗");
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
          {!localMode ? (
            <div className="bdg-auth-tabs">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`bdg-auth-tab ${mode === m ? "is-active" : ""}`}
                >
                  {m === "signin" ? "登入" : "註冊"}
                </button>
              ))}
            </div>
          ) : null}
          <form onSubmit={submit} className="space-y-3">
            {!localMode && mode === "signup" && (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" className="bdg-field-input" />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="公司／工作室（選填）" className="bdg-field-input" />
              </>
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bdg-field-input" />
            <PasswordInput required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="密碼（至少 6 碼）" inputClassName="bdg-field-input pr-10" />
            {mode === "signin" && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--bdg-muted)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-[var(--bdg-line)] text-[var(--bdg-brand)] focus:ring-[var(--bdg-brand)]"
                />
                記住登入狀態（下次自動登入）
              </label>
            )}
            {err && <p className="text-sm text-rose-600">{err}</p>}
            {msg && <p className="text-sm text-[var(--bdg-brand)]">{msg}</p>}
            <button type="submit" disabled={busy} className="bdg-btn bdg-btn-primary flex w-full justify-center rounded-full py-3">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "登入" : "建立帳號"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
