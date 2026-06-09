import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Copy, Check, Loader2, KeyRound, Calendar } from "lucide-react";
import { useMembership } from "@/lib/useMembership";
import { redeemMembershipCode } from "@/lib/membership.functions";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export function MembershipPanel() {
  const { data, isLoading, refetch } = useMembership();
  const qc = useQueryClient();
  const redeemFn = useServerFn(redeemMembershipCode);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const redeem = useMutation({
    mutationFn: (c: string) => redeemFn({ data: { code: c } }),
    onSuccess: () => {
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-membership"] });
      refetch();
    },
  });

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  if (isLoading) {
    return <div className="card-surface p-5 text-sm text-muted-foreground">載入會員資訊…</div>;
  }

  const active = !!data?.active;

  return (
    <section className="card-surface p-5 md:col-span-2">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${active ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
          <Crown className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-bold">付費會員</div>
          <div className="text-xs text-muted-foreground">
            {active ? "已開通商店與付費功能" : "尚未開通，輸入序號即可使用"}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          {active ? "啟用中" : "未啟用"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">到期日：</span>
        <span className="font-semibold">{fmt(data?.expires_at)}</span>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return;
          redeem.mutate(code.trim().toUpperCase(), {
            onError: (err: any) => alert(err.message ?? "兌換失敗"),
          });
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="輸入會員序號（XXXX-XXXX-XXXX-XXXX）"
          className="flex-1 min-w-[200px] rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-mono tracking-wider outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={redeem.isPending}
          className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          兌換序號
        </button>
      </form>

      {data?.owned && data.owned.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-bold">我的訂閱（可分享序號）</h3>
          {data.owned.map((sub: any) => {
            const subCodes = (data.codes ?? []).filter((c: any) => c.subscription_id === sub.id);
            const used = subCodes.filter((c: any) => c.redeemed_by).length;
            const expired = new Date(sub.expires_at) <= new Date();
            return (
              <div key={sub.id} className={`rounded-xl border p-4 ${expired ? "border-border bg-muted/30 opacity-70" : "border-border bg-secondary/30"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="font-bold">{sub.plan_seats} 組方案</div>
                  <div className="text-xs text-muted-foreground">
                    使用 {used}/{subCodes.length} · 到期 {fmt(sub.expires_at)}
                    {expired && " · 已過期"}
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {subCodes.map((c: any) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-xs">
                      <code className="flex-1 font-mono text-sm tracking-wider">{c.code}</code>
                      {c.redeemed_by ? (
                        <span className="text-[11px] text-muted-foreground">已使用</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copy(c.code)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-secondary"
                        >
                          {copied === c.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied === c.code ? "已複製" : "複製"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
