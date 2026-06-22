import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { listQuotes, duplicateQuote, deleteQuote } from "@/lib/quotes.functions";
import { formatMoney } from "@/lib/quotes.types";
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
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => listFn({}) as Promise<any[]>,
  });

  const dup = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: (r) => nav({ to: "/quotes/$id", params: { id: r.id } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1612]">報價紀錄</h1>
          <p className="mt-1 text-sm text-[#6b5c4d]">複製舊報價，改價再送</p>
        </div>
        <button type="button" onClick={() => { clearSession(); nav({ to: "/auth" }); }} className="text-xs text-[#8a7b6a] hover:underline">
          登出
        </button>
      </div>

      {isLoading && <p className="text-sm text-[#6b5c4d]">載入中…</p>}

      {!isLoading && quotes.length === 0 && (
        <div className="rounded-2xl border border-[#e8dfd3] bg-white p-10 text-center">
          <p className="text-[#6b5c4d]">還沒有報價單</p>
          <Link to="/quotes/new" className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#C45A3C] px-5 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> 建立第一張
          </Link>
        </div>
      )}

      <ul className="space-y-2">
        {quotes.map((q: any) => (
          <li key={q.id} className="flex items-center gap-3 rounded-xl border border-[#e8dfd3] bg-white p-4">
            <Link to="/quotes/$id" params={{ id: q.id }} className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#1a1612]">{q.client_name || "未命名客戶"}</p>
              <p className="text-xs text-[#6b5c4d]">
                {q.title} · {formatMoney(Number(q.total))} · {new Date(q.created_at).toLocaleDateString("zh-TW")}
              </p>
            </Link>
            <button type="button" onClick={() => dup.mutate(q.id)} className="rounded-lg p-2 text-[#6b5c4d] hover:bg-[#F5F0E8]" title="複製">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => confirm("確定刪除？") && del.mutate(q.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="刪除">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {dup.isPending && <p className="mt-2 flex items-center gap-1 text-xs text-[#6b5c4d]"><Loader2 className="h-3 w-3 animate-spin" /> 複製中…</p>}
    </AppShell>
  );
}
