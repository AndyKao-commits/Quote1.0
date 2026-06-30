import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Copy, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { listQuotes, duplicateQuote, deleteQuote, createSampleQuote } from "@/lib/quotes.functions";
import { formatMoney } from "@/lib/quotes.types";
import { SAMPLE_QUOTES, type SampleQuoteId } from "@/lib/landing-demo-quotes";
import { clearSession } from "@/lib/session";

export const Route = createFileRoute("/_app/quotes/")({
  head: () => ({ meta: [{ title: "報價紀錄 — 報得過" }] }),
  component: QuotesPage,
});

function QuotesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listQuotes);
  const dupFn = useServerFn(duplicateQuote);
  const delFn = useServerFn(deleteQuote);
  const sampleFn = useServerFn(createSampleQuote);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => listFn({}) as Promise<any[]>,
    retry: 1,
  });
  const quotes = Array.isArray(data) ? data.filter((q) => q && typeof q.id === "string") : [];

  useEffect(() => {
    if (!isError || !error) return;
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("登入") || msg.includes("過期")) {
      clearSession();
      nav({ to: "/auth" });
    }
  }, [isError, error, nav]);

  const dup = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: (r) => nav({ to: "/quotes/$id", params: { id: r.id } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const createSample = useMutation({
    mutationFn: (sampleId: SampleQuoteId) =>
      sampleFn({ data: { sampleId } }) as Promise<{ id: string }>,
    onSuccess: (r) => nav({ to: "/quotes/$id", params: { id: r.id } }),
  });

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">報價紀錄</h1>
        <p className="mt-1 text-sm text-[var(--bdg-muted)]">複製舊報價，改價再送</p>
      </div>

      {isLoading && <p className="text-sm text-stone-500">載入中…</p>}

      {isError && !isLoading && (
        <div className="bdg-card p-6 text-center">
          <p className="text-sm text-stone-700">無法載入報價紀錄</p>
          <p className="mt-1 text-xs text-stone-500">
            {error instanceof Error ? error.message : "請稍後再試"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => refetch()} className="bdg-btn bdg-btn-primary text-sm">
              重試
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession();
                nav({ to: "/auth" });
              }}
              className="bdg-btn bdg-btn-secondary text-sm"
            >
              重新登入
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && quotes.length === 0 && (
        <div className="bdg-card p-10 text-center">
          <p className="text-stone-500">還沒有報價單</p>
          <p className="mt-2 text-xs text-stone-400">可先開啟範例報價學習，或直接建立空白報價</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SAMPLE_QUOTES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={createSample.isPending}
                onClick={() => createSample.mutate(s.id as SampleQuoteId)}
                className="bdg-btn bdg-btn-secondary text-sm"
              >
                {s.tabLabel}
              </button>
            ))}
          </div>
          <Link to="/quotes/new" className="bdg-btn bdg-btn-primary mt-4">
            <Plus className="h-4 w-4" /> 建立空白報價
          </Link>
        </div>
      )}

      {!isError && (
      <ul className="grid gap-3 sm:grid-cols-2">
        {quotes.map((q: any) => (
          <li key={q.id} className="bdg-card bdg-card-interactive flex items-center gap-3 p-4">
            <div className="bdg-card-icon bdg-card-icon--soft hidden sm:grid">
              <FileText className="h-5 w-5" />
            </div>
            <Link to="/quotes/$id" params={{ id: q.id }} className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-[var(--bdg-ink)]">{q.client_name || "未命名客戶"}</p>
              <p className="mt-0.5 text-sm text-stone-500">
                {q.title}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {formatMoney(Number(q.total))} · {new Date(q.created_at).toLocaleDateString("zh-TW")}
              </p>
            </Link>
            <button type="button" onClick={() => dup.mutate(q.id)} className="rounded p-2 text-[var(--bdg-muted)] hover:bg-[var(--bdg-surface-soft)]" title="複製">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => confirm("確定刪除？") && del.mutate(q.id)} className="rounded p-2 text-rose-500 hover:bg-rose-50" title="刪除">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      )}
      {dup.isPending && <p className="mt-2 flex items-center gap-1 text-xs text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> 複製中…</p>}
    </AppShell>
  );
}
