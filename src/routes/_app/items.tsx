import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { CsvImportButton } from "@/components/CsvImportButton";
import {
  bulkDeleteCatalogItems,
  deleteCatalogItem,
  listCatalogItems,
  saveCatalogItem,
  seedDemoCatalog,
  bulkImportCatalog,
} from "@/lib/quotes.functions";
import type { CatalogPackageLine } from "@/lib/quotes.types";
import { catalogRowsToCsv, downloadCsv, parseCatalogCsv } from "@/lib/csv-import";
import { DEMO_CATALOG_SUMMARY } from "@/lib/demo-catalog";
import { QUOTE_LIMITS, clampText } from "@/lib/quotes.types";

export const Route = createFileRoute("/_app/items")({
  head: () => ({ meta: [{ title: "快速項目庫 — 報得過" }] }),
  component: ItemsPage,
});

type AddMode = "single" | "package";

const EMPTY_SINGLE = { name: "", unit: "式", unit_price: 0, category: "", keywords: "" };

function emptyPackageLine(): CatalogPackageLine {
  return { name: "", unit: "式", quantity: 1, unit_price: 0 };
}

function ItemsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCatalogItems);
  const saveFn = useServerFn(saveCatalogItem);
  const delFn = useServerFn(deleteCatalogItem);
  const bulkDelFn = useServerFn(bulkDeleteCatalogItems);
  const seedFn = useServerFn(seedDemoCatalog);
  const importFn = useServerFn(bulkImportCatalog);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => listFn({}) as Promise<any[]>,
  });

  const [addMode, setAddMode] = useState<AddMode>("single");
  const [form, setForm] = useState(EMPTY_SINGLE);
  const [packageLines, setPackageLines] = useState<CatalogPackageLine[]>([emptyPackageLine()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const nameLen = Array.from(form.name).length;
  const allSelected = items.length > 0 && selected.size === items.length;

  function resetForm() {
    setForm(EMPTY_SINGLE);
    setPackageLines([emptyPackageLine()]);
    setEditingId(null);
    setAddMode("single");
  }

  function startEdit(it: any) {
    setEditingId(it.id);
    setForm({
      name: it.name,
      unit: it.unit,
      unit_price: Number(it.unit_price),
      category: it.category ?? "",
      keywords: (it.keywords ?? []).join("、"),
    });
    if (it.item_type === "package" && Array.isArray(it.package_lines) && it.package_lines.length) {
      setAddMode("package");
      setPackageLines(
        it.package_lines.map((l: CatalogPackageLine) => ({
          name: l.name,
          unit: l.unit,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      );
    } else {
      setAddMode("single");
      setPackageLines([emptyPackageLine()]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: () => {
      const base = {
        id: editingId ?? undefined,
        name: clampText(form.name.trim(), QUOTE_LIMITS.catalogName),
        category: form.category || null,
        keywords: form.keywords.split(/[,，、\s]+/).filter(Boolean),
        item_type: addMode,
      };
      if (addMode === "package") {
        return saveFn({
          data: {
            ...base,
            item_type: "package",
            package_lines: packageLines
              .filter((l) => l.name.trim())
              .map((l) => ({
                name: clampText(l.name.trim(), QUOTE_LIMITS.lineName),
                unit: l.unit || "式",
                quantity: Number(l.quantity) || 1,
                unit_price: Number(l.unit_price) || 0,
              })),
          },
        });
      }
      return saveFn({
        data: {
          ...base,
          item_type: "single",
          unit: form.unit,
          unit_price: form.unit_price,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      resetForm();
      setSeedMsg(editingId ? "已更新項目" : "已加入項目");
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
    mutationFn: (rows: ReturnType<typeof parseCatalogCsv>["rows"]) =>
      importFn({ data: { items: rows } }) as Promise<{ message: string; added: number; skipped: number }>,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setSeedMsg(res.message);
    },
    onError: (e) => setSeedMsg(e instanceof Error ? e.message : "匯入失敗"),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => bulkDelFn({ data: { ids } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      setSelected(new Set());
      setSeedMsg("已刪除選取項目");
    },
    onError: (e) => setSeedMsg(e instanceof Error ? e.message : "刪除失敗"),
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

  async function handleDeleteOne(it: { id: string; name: string }) {
    if (!confirm(`確定刪除「${it.name}」？此操作無法復原。`)) return;
    await delFn({ data: { id: it.id } });
    qc.invalidateQueries({ queryKey: ["catalog"] });
    if (editingId === it.id) resetForm();
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(it.id);
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`確定刪除已選取的 ${ids.length} 項？此操作無法復原。`)) return;
    bulkDelete.mutate(ids);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((it: any) => it.id)));
  }

  const canSave =
    form.name.trim() &&
    (addMode === "single" || packageLines.some((l) => l.name.trim()));

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
          <h1 className="text-2xl font-semibold tracking-tight">快速項目庫</h1>
          <p className="bdg-meta mt-1">編輯報價時可用關鍵字搜尋帶入（泥作、防水、水電…）</p>
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
          <p className="mt-1 text-sm text-stone-500">
            一鍵載入 {DEMO_CATALOG_SUMMARY.packages} 組工種套餐＋{DEMO_CATALOG_SUMMARY.singles} 項單品示範，或匯入 CSV
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <CsvImportButton label="匯入 CSV" busy={importCsv.isPending} onFile={handleCatalogCsv} />
            {seedButton}
          </div>
        </div>
      )}

      <div className="bdg-card mt-6 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="bdg-section-title">{editingId ? "編輯項目" : "新增項目"}</p>
          {editingId ? (
            <button type="button" onClick={resetForm} className="bdg-btn bdg-btn-secondary py-1">
              <X className="h-3.5 w-3.5" /> 取消編輯
            </button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAddMode("single")}
            className={`bdg-btn flex-1 sm:flex-none ${addMode === "single" ? "bdg-btn-primary" : "bdg-btn-secondary"}`}
          >
            <Plus className="h-4 w-4" /> 單一項目
          </button>
          <button
            type="button"
            onClick={() => setAddMode("package")}
            className={`bdg-btn flex-1 sm:flex-none ${addMode === "package" ? "bdg-btn-primary" : "bdg-btn-secondary"}`}
          >
            <Layers className="h-4 w-4" /> 套餐（工種+明細）
          </button>
        </div>

        {addMode === "single" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="bdg-label mb-0">項目名稱</span>
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
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="bdg-label">工種名稱</span>
              <input
                value={form.name}
                maxLength={QUOTE_LIMITS.catalogName}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：水電工程"
                className="bdg-input"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="分類" className="bdg-input" />
              <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="關鍵字（逗號分隔）" className="bdg-input" />
            </div>
            <p className="bdg-meta">套餐內的細項（帶入報價時會自動建立工種與項目）</p>
            <div className="space-y-2">
              {packageLines.map((line, i) => (
                <div key={i} className="grid gap-2 rounded border border-[var(--bdg-line)] bg-white p-3 sm:grid-cols-[1fr_4rem_4rem_6rem_auto]">
                  <input
                    value={line.name}
                    onChange={(e) => {
                      const next = [...packageLines];
                      next[i] = { ...next[i], name: e.target.value };
                      setPackageLines(next);
                    }}
                    placeholder="項目名稱"
                    className="bdg-input sm:col-span-1"
                  />
                  <input
                    value={line.unit}
                    onChange={(e) => {
                      const next = [...packageLines];
                      next[i] = { ...next[i], unit: e.target.value };
                      setPackageLines(next);
                    }}
                    placeholder="單位"
                    className="bdg-input"
                  />
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...packageLines];
                      next[i] = { ...next[i], quantity: Number(e.target.value) };
                      setPackageLines(next);
                    }}
                    placeholder="數量"
                    className="bdg-input"
                  />
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={(e) => {
                      const next = [...packageLines];
                      next[i] = { ...next[i], unit_price: Number(e.target.value) };
                      setPackageLines(next);
                    }}
                    placeholder="單價"
                    className="bdg-input"
                  />
                  <button
                    type="button"
                    disabled={packageLines.length <= 1}
                    onClick={() => setPackageLines(packageLines.filter((_, j) => j !== i))}
                    className="rounded p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                    aria-label="移除細項"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPackageLines([...packageLines, emptyPackageLine()])}
              className="bdg-btn bdg-btn-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> 新增細項
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate()}
          className="bdg-btn bdg-btn-primary"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? "儲存變更" : addMode === "package" ? "加入套餐" : "加入"}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500">載入中…</p>
      ) : items.length > 0 ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-[#d9cfc0]" />
              全選
            </label>
            {selected.size > 0 ? (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="bdg-btn bdg-btn-secondary text-rose-700"
              >
                {bulkDelete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                批量刪除（{selected.size}）
              </button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {items.map((it: any) => {
              const isPackage = it.item_type === "package" && Array.isArray(it.package_lines) && it.package_lines.length > 0;
              const pkgTotal = isPackage
                ? it.package_lines.reduce(
                    (s: number, l: CatalogPackageLine) => s + Number(l.quantity) * Number(l.unit_price),
                    0,
                  )
                : 0;
              return (
                <li
                  key={it.id}
                  className={`bdg-card flex items-start gap-3 px-4 py-3 ${editingId === it.id ? "ring-2 ring-[var(--bdg-brand)]" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={() => toggleSelect(it.id)}
                    className="mt-1 rounded border-[#d9cfc0]"
                    aria-label={`選取 ${it.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{it.name}</p>
                      {isPackage ? (
                        <span className="rounded bg-[#fff7f3] px-1.5 py-0.5 text-xs font-semibold text-[var(--bdg-brand)]">
                          套餐 · {it.package_lines.length} 項
                        </span>
                      ) : null}
                    </div>
                    {isPackage ? (
                      <div className="mt-1.5 space-y-0.5">
                        {it.package_lines.map((l: CatalogPackageLine, i: number) => (
                          <p key={i} className="bdg-meta truncate">
                            {l.name} · {l.quantity} {l.unit} · NT${Number(l.unit_price).toLocaleString()}
                          </p>
                        ))}
                        <p className="text-sm font-medium text-stone-600">合計 NT${pkgTotal.toLocaleString()}</p>
                        {(it.category || (it.keywords ?? []).length > 0) && (
                          <p className="bdg-meta">
                            {it.category}
                            {it.category && (it.keywords ?? []).length > 0 ? " · " : ""}
                            {(it.keywords ?? []).join("、")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="bdg-meta">
                        NT${Number(it.unit_price).toLocaleString()}/{it.unit}
                        {it.category && ` · ${it.category}`}
                        {(it.keywords ?? []).length > 0 && ` · ${it.keywords.join("、")}`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(it)}
                      className="rounded p-1.5 text-stone-500 hover:bg-stone-100"
                      title="編輯"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(it)}
                      className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                      title="刪除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </AppShell>
  );
}
