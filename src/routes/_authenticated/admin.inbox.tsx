import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2, Shield, ArrowLeft, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/inbox")({
  head: () => ({ meta: [{ title: "客服收件夾 — 現場紀錄" }] }),
  component: InboxPage,
});

interface Row {
  id: string;
  user_id: string;
  question: string;
  ai_answer: string | null;
  admin_reply: string | null;
  status: string;
  created_at: string;
  replied_at: string | null;
}

function InboxPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const [filter, setFilter] = useState<"escalated" | "all">("escalated");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!checking && isAdmin === false) nav({ to: "/profile" });
  }, [checking, isAdmin, nav]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["support-inbox", filter],
    enabled: isAdmin === true,
    refetchInterval: 15000,
    queryFn: async () => {
      let q = supabase.from("support_messages").select("*").order("created_at", { ascending: false });
      if (filter === "escalated") q = q.eq("status", "escalated");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const replyMut = useMutation({
    mutationFn: async (args: { id: string; reply: string }) => {
      const { error } = await supabase
        .from("support_messages")
        .update({ admin_reply: args.reply, status: "answered", replied_at: new Date().toISOString() })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["support-inbox"] });
      setReplyDraft((p) => ({ ...p, [vars.id]: "" }));
    },
    onError: (e: Error) => alert(e.message),
  });

  if (checking) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) return null;

  const pendingCount = rows.filter((r) => r.status === "escalated").length;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">客服收件夾</h1>
        {pendingCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> 待處理 {pendingCount}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">使用者透過 AI 客服送出的問題，AI 無法回答時會自動轉到這裡。</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setFilter("escalated")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            filter === "escalated" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
          }`}
        >
          待處理
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
          }`}
        >
          全部
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">載入中…</div>
      ) : rows.length === 0 ? (
        <div className="card-surface mt-4 grid place-items-center p-10 text-center text-sm text-muted-foreground">
          <div>
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
            {filter === "escalated" ? "沒有待處理的問題 🎉" : "尚無訊息"}
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>使用者：{r.user_id.slice(0, 8)}…</span>
                <span>{new Date(r.created_at).toLocaleString("zh-TW")}</span>
                {r.status === "answered" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> 已回覆
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> 待處理
                  </span>
                )}
              </div>

              <div className="mt-2 rounded-lg bg-secondary p-3 text-sm">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">使用者問題</div>
                <div className="whitespace-pre-wrap">{r.question}</div>
              </div>

              {r.ai_answer && (
                <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-sm">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI 自動回覆</div>
                  <div className="whitespace-pre-wrap text-muted-foreground">{r.ai_answer}</div>
                </div>
              )}

              {r.admin_reply ? (
                <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">管理員回覆</div>
                  <div className="whitespace-pre-wrap">{r.admin_reply}</div>
                </div>
              ) : (
                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={replyDraft[r.id] ?? ""}
                    onChange={(e) => setReplyDraft((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="輸入回覆內容…"
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    disabled={replyMut.isPending || !replyDraft[r.id]?.trim()}
                    onClick={() => replyMut.mutate({ id: r.id, reply: replyDraft[r.id].trim() })}
                    className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
                  >
                    {replyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    回覆
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
