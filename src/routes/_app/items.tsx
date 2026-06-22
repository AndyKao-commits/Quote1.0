import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { listCatalogItems, saveCatalogItem, deleteCatalogItem, seedDemoCatalog } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_app/items")({
  head: () => ({ meta: [{ title: "快速項目庫 — 報得過" }] }),
  component: ItemsPage,
});

function ItemsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCatalogItems);
  const saveFn = useServerFn(saveCatalogItem);
  const delFn = useServerFn(deleteCatalogItem);
  const seedFn = useServerFn(seedDemoCatalog);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["catalog"], queryFn: () => listFn({}) as Promise<any[]> });
  const [form, setForm] = useState({ name: "", unit: "式", unit_price: 0, category: "", keywords: "" });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          name: form.name,
          unit: form.unit,
          unit_price: form.unit_price,
          category: form.category || null,
          keywords: form.keywords.split(/[,，\s]+/).filter(Boolean),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setForm({ name: "", unit: "式", unit_price: 0, category: "", keywords: "" });
    },
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1a1612]">快速項目庫</h1>
      <p className="mt-1 text-sm text-[#6b5c4d]">編輯報價時可用關鍵字搜尋帶入</p>

      <button type="button" onClick={() => seedFn({})} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C45A3C]">
        <Sparkles className="h-4 w-4" /> 載入示範項目
      </button>

      <div className="mt-6 rounded-2xl border border-[#e8dfd3] bg-white p-4">
        <p className="mb-3 text-sm font-bold">新增項目</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="項目名稱" className={inp} />
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="單位" className={inp} />
          <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} placeholder="單價" className={inp} />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="分類" className={inp} />
          <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="關鍵字（逗號分隔）" className={`${inp} sm:col-span-2`} />
        </div>
        <button type="button" disabled={!form.name || save.isPending} onClick={() => save.mutate()} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#C45A3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 加入
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-[#6b5c4d]">載入中…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((it: any) => (
            <li key={it.id} className="flex items-center justify-between rounded-xl border border-[#e8dfd3] bg-white px-4 py-3">
              <div>
                <p className="font-semibold">{it.name}</p>
                <p className="text-xs text-[#6b5c4d]">
                  NT${Number(it.unit_price).toLocaleString()}/{it.unit}
                  {it.category && ` · ${it.category}`}
                  {(it.keywords ?? []).length > 0 && ` · ${it.keywords.join("、")}`}
                </p>
              </div>
              <button type="button" onClick={() => delFn({ data: { id: it.id } }).then(() => qc.invalidateQueries({ queryKey: ["catalog"] }))} className="text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

const inp = "w-full rounded-xl border border-[#ece3d6] px-3 py-2 text-sm outline-none focus:border-[#C45A3C]";
