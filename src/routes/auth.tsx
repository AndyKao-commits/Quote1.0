import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { signIn, signUp } from "@/lib/auth.functions";
import { setSession, getAccessToken } from "@/lib/session";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "登入 — 報得過" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const nav = useNavigate();
  const signInFn = useServerFn(signIn);
  const signUpFn = useServerFn(signUp);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (getAccessToken()) nav({ to: "/quotes" });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUpFn({ data: { email, password: pw, display_name: name, company_name: company } });
        if ("needs_confirm" in res && res.needs_confirm) {
          setMsg("註冊成功，請查收 Email 確認信。");
          return;
        }
        if ("access_token" in res) {
          setSession(res.access_token, res.refresh_token!);
          nav({ to: "/quotes/new" });
        }
      } else {
        const res = await signInFn({ data: { email, password: pw } });
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
    <div className="bdg-theme flex min-h-screen items-center justify-center bg-[#F5F0E8] p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center font-display text-2xl font-bold text-[#1a1612]">
          報得過
        </Link>
        <div className="rounded-2xl border border-[#e8dfd3] bg-white p-6 shadow-sm">
          <div className="mb-5 flex gap-1 rounded-lg border border-[#ece3d6] p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode === m ? "bg-[#C45A3C] text-white" : "text-[#6b5c4d]"}`}
              >
                {m === "signin" ? "登入" : "註冊"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" className={inp} />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="公司／工作室（選填）" className={inp} />
              </>
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inp} />
            <PasswordInput required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="密碼（至少 6 碼）" />
            {err && <p className="text-sm text-rose-600">{err}</p>}
            {msg && <p className="text-sm text-[#C45A3C]">{msg}</p>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C45A3C] py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "登入" : "建立帳號"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-[#ece3d6] px-3 py-2.5 text-sm outline-none focus:border-[#C45A3C]";
