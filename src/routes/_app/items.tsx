import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { CsvImportButton } from "@/components/CsvImportButton";
import { listCatalogItems, saveCatalogItem, deleteCatalogItem, seedDemoCatalog, bulkImportCatalog } from "@/lib/quotes.functions";
import { catalogRowsToCsv, downloadCsv, parseCatalogCsv } from "@/lib/csv-import";
import { QUOTE_LIMITS, clampText } from "@/lib/quotes.types";

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

  const nameLen = Array.from(form.name).length;

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          name: clampText(form.name.trim(), QUOTE_LIMITS.catalogName),
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
    onError: (e) => setSeedMsg(e instanceof Error ? e.message : "儲存失敗"),
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
      setSeedMsg(`${res.message}（${errors.length} 行已略過或截斷）`);
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
      className="bdg-btn bdg-btn-secondary"
    >
      {seed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      載入示範項目
    </button>
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">快速項目庫</h1>
          <p className="mt-1 text-sm text-stone-500">編輯報價時可用關鍵字搜尋帶入（泥作、防水、水電…）</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadCsv("項目庫範本.csv", catalogRowsToCsv())}
            className="text-sm font-medium text-[var(--bdg-brand)] hover:underline"
          >
            下載範本
          </button>
          <CsvImportButton label="匯入 CSV" busy={importCsv.isPending} onFile={handleCatalogCsv} />
          {items.length > 0 && seedButton}
        </div>
      </div>

      {seedMsg && (
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {seedMsg}
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bdg-card mt-6 border-dashed p-8 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-[var(--bdg-brand)]" />
          <p className="mt-3 font-medium">項目庫還是空的</p>
          <p className="mt-1 text-sm text-stone-500">一鍵載入 12 項常見工程示範，或匯入 CSV</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <CsvImportButton label="匯入 CSV" busy={importCsv.isPending} onFile={handleCatalogCsv} />
            {seedButton}
          </div>
        </div>
      )}

      <div className="bdg-card mt-6 space-y-3 p-4">
        <p className="bdg-section-title">新增項目</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">項目名稱</span>
              <span className={`bdg-char-count ${nameLen >= QUOTE_LIMITS.catalogName ? "is-over" : ""}`}>
                {nameLen}/{QUOTE_LIMITS.catalogName}
              </span>
            </div>
            <input
              value={form.name}
              maxLength={QUOTE_LIMITS.catalogName}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：泥作打底"
              className="bdg-input"
            />
          </label>
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="單位" className="bdg-input" />
          <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} placeholder="單價" className="bdg-input" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="分類" className="bdg-input" />
          <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="關鍵字（逗號分隔）" className="bdg-input sm:col-span-2" />
        </div>
        <button type="button" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()} className="bdg-btn bdg-btn-primary">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 加入
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500">載入中…</p>
      ) : items.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {items.map((it: any) => (
            <li key={it.id} className="bdg-card flex items-center justify-between px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="truncate font-medium">{it.name}</p>
                <p className="text-xs text-stone-500">
                  NT${Number(it.unit_price).toLocaleString()}/{it.unit}
                  {it.category && ` · ${it.category}`}
                  {(it.keywords ?? []).length > 0 && ` · ${it.keywords.join("、")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => delFn({ data: { id: it.id } }).then(() => qc.invalidateQueries({ queryKey: ["catalog"] }))}
                className="shrink-0 rounded p-1.5 text-rose-500 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
