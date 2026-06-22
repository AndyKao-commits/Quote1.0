import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { CsvImportButton } from "@/components/CsvImportButton";
import { listCatalogItems, saveCatalogItem, deleteCatalogItem, seedDemoCatalog, bulkImportCatalog } from "@/lib/quotes.functions";
import { catalogRowsToCsv, downloadCsv, parseCatalogCsv } from "@/lib/csv-import";

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
  const importFn = useServerFn(bulkImportCatalog);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["catalog"], queryFn: () => listFn({}) as Promise<any[]> });
  const [form, setForm] = useState({ name: "", unit: "式", unit_price: 0, category: "", keywords: "" });
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

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

  const seed = useMutation({
    mutationFn: () => seedFn({}) as Promise<{ ok: boolean; added: number; message: string }>,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setSeedMsg(res.message);
    },
    onError: (e) => setSeedMsg(e instanceof Error ? e.message : "載入失敗"),
  });

  const importCsv = useMutation({
    mutationFn: (items: ReturnType<typeof parseCatalogCsv>["rows"]) =>
      importFn({ data: { items } }) as Promise<{ message: string; added: number; skipped: number }>,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setSeedMsg(res.message);
    },
    onError: (e) => setSeedMsg(e instanceof Error ? e.message : "匯入失敗"),
  });

  async function handleCatalogCsv(text: string) {
    const { rows, errors } = parseCatalogCsv(text);
    if (!rows.length) {
      setSeedMsg(errors[0] ?? "CSV 沒有有效資料");
      return;
    }
    const res = await importCsv.mutateAsync(rows);
    if (errors.length) {
      setSeedMsg(`${res.message}（${errors.length} 行已略過）`);
    }
  }

  const seedButton = (
    <button
      type="button"
      disabled={seed.isPending}
      onClick={() => {
        setSeedMsg(null);
        seed.mutate();
      }}
      className="inline-flex items-center gap-2 rounded-full border-2 border-[#C45A3C] bg-[#C45A3C]/5 px-5 py-2.5 text-sm font-bold text-[#C45A3C] transition hover:bg-[#C45A3C]/10 disabled:opacity-60"
    >
      {seed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      載入示範項目
    </button>
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1612]">快速項目庫</h1>
          <p className="mt-1 text-sm text-[#6b5c4d]">編輯報價時可用關鍵字搜尋帶入（泥作、防水、水電…）</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadCsv("項目庫範本.csv", catalogRowsToCsv())}
            className="text-sm font-semibold text-[#C45A3C] hover:underline"
          >
            下載範本
          </button>
          <CsvImportButton label="匯入 CSV" busy={importCsv.isPending} onFile={handleCatalogCsv} />
          {items.length > 0 && seedButton}
        </div>
      </div>

      {seedMsg && (
        <p className="mt-4 rounded-xl border border-[#C45A3C]/30 bg-[#C45A3C]/10 px-4 py-2 text-sm font-medium text-[#8B4513]">
          {seedMsg}
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[#C45A3C]/40 bg-[#FDFBF7] p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-[#C45A3C]" />
          <p className="mt-3 font-bold text-[#1a1612]">項目庫還是空的</p>
          <p className="mt-1 text-sm text-[#6b5c4d]">一鍵載入 12 項常見工程示範（拆除、泥作、防水、水電、木作…）</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <CsvImportButton label="匯入 CSV" busy={importCsv.isPending} onFile={handleCatalogCsv} />
            {seedButton}
          </div>
        </div>
      )}

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
      ) : items.length > 0 ? (
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
      ) : null}
    </AppShell>
  );
}

const inp = "w-full rounded-xl border border-[#ece3d6] px-3 py-2 text-sm outline-none focus:border-[#C45A3C]";
