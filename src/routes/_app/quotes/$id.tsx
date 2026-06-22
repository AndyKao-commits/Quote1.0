import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Download, Eye, Loader2, Save, Search, Share2, X,
} from "lucide-react";
import { QuoteLineList } from "@/components/QuoteLineList";
import { CsvImportButton } from "@/components/CsvImportButton";
import { AppShell } from "@/components/BdgAppShell";
import { QuoteDocument } from "@/components/QuoteDocument";
import {
  getQuote, saveQuote, publishShare, listCatalogItems, getProfile,
} from "@/lib/quotes.functions";
import {
  calcQuoteTotals, templateMeta, lineShareText, type QuoteLine, type QuoteTemplate,
} from "@/lib/quotes.types";
import { exportQuotePdf } from "@/lib/quote-pdf";
import { downloadCsv, parseQuoteLinesCsv, quoteLineCsvToQuoteLines, quoteLinesToCsv } from "@/lib/csv-import";

export const Route = createFileRoute("/_app/quotes/$id")({
  head: () => ({ meta: [{ title: "編輯報價 — 報得過" }] }),
  component: QuoteEditorPage,
});

function QuoteEditorPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getFn = useServerFn(getQuote);
  const saveFn = useServerFn(saveQuote);
  const shareFn = useServerFn(publishShare);
  const catalogFn = useServerFn(listCatalogItems);
  const profileFn = useServerFn(getProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getFn({ data: { id } }) as Promise<any>,
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) as Promise<any> });
  const { data: catalog = [] } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => catalogFn({}) as Promise<any[]>,
  });

  const [form, setForm] = useState<any>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [kw, setKw] = useState("");
  const [previewFull, setPreviewFull] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({ ...data, quote_lines: undefined });
      setLines(
        (data.quote_lines ?? []).map((l: any, i: number) => ({
          ...l,
          sort_order: i,
          line_type: l.line_type ?? "item",
        })),
      );
      if (data.share_token) setShareUrl(`${window.location.origin}/q/${data.share_token}`);
    }
  }, [data]);

  const totals = useMemo(
    () =>
      form
        ? calcQuoteTotals(lines, {
            tax_included: form.tax_included,
            show_tax_breakdown: form.show_tax_breakdown,
            tax_rate: Number(form.tax_rate ?? 0.05),
          })
        : { subtotal: 0, tax_amount: 0, total: 0 },
    [form, lines],
  );

  const quotePreview = form
    ? { ...form, ...totals }
    : null;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form) return;
      return saveFn({
        data: {
          id,
          title: form.title,
          template: form.template as QuoteTemplate,
          contact_id: form.contact_id,
          client_name: form.client_name,
          client_company: form.client_company,
          client_phone: form.client_phone,
          client_email: form.client_email,
          client_tax_id: form.client_tax_id,
          client_address: form.client_address,
          show_seller_tax_id: form.show_seller_tax_id,
          show_buyer_tax_id: form.show_buyer_tax_id,
          seller_tax_id: form.seller_tax_id,
          tax_included: form.tax_included,
          show_tax_breakdown: form.show_tax_breakdown,
          tax_rate: Number(form.tax_rate ?? 0.05),
          valid_until: form.valid_until || null,
          note: form.note,
          terms: form.terms,
          cover_image_url: form.cover_image_url,
          lines: lines.map((l, i) => ({ ...l, sort_order: i })),
        },
      });
    },
  });

  const filteredCatalog = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return [];
    return (catalog as any[])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.keywords ?? []).some((k: string) => k.toLowerCase().includes(q)) ||
          (c.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [catalog, kw]);

  if (isLoading || !form || !quotePreview) {
    return (
      <AppShell>
        <p className="flex items-center gap-2 text-sm text-[#6b5c4d]">
          <Loader2 className="h-4 w-4 animate-spin" /> 載入中…
        </p>
      </AppShell>
    );
  }

  async function doExport() {
    setPreviewFull(false);
    setExporting(true);
    try {
      await saveMut.mutateAsync();
      await exportQuotePdf(`${form.client_name || "報價"}-${form.title}.pdf`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "匯出失敗");
    } finally {
      setExporting(false);
    }
  }

  async function doShare() {
    await saveMut.mutateAsync();
    const res = await shareFn({ data: { id } });
    const url = `${window.location.origin}/q/${res.token}`;
    setShareUrl(url);
    const text = lineShareText({ ...quotePreview, client_name: form.client_name }, url);
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  }

  function handleQuoteLinesCsv(text: string) {
    const { rows, errors } = parseQuoteLinesCsv(text);
    if (!rows.length) {
      setImportMsg(errors[0] ?? "CSV 沒有有效資料");
      return;
    }
    const imported = quoteLineCsvToQuoteLines(rows, lines.length);
    setLines([...lines, ...imported]);
    const base = `已匯入 ${imported.length} 行明細`;
    setImportMsg(errors.length ? `${base}（${errors.length} 行已略過）` : base);
  }

  const editor = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(templateMeta) as QuoteTemplate[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm({ ...form, template: t })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${form.template === t ? "bg-[#C45A3C] text-white" : "bg-white text-[#6b5c4d] border border-[#e8dfd3]"}`}
          >
            {templateMeta[t].label}
          </button>
        ))}
      </div>

      <Field label="報價標題" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <Field label="客戶名稱" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="公司（選填）" value={form.client_company ?? ""} onChange={(v) => setForm({ ...form, client_company: v })} />
        <Field label="電話" value={form.client_phone ?? ""} onChange={(v) => setForm({ ...form, client_phone: v })} />
      </div>
      <Field label="封面圖 URL（工作室模板）" value={form.cover_image_url ?? ""} onChange={(v) => setForm({ ...form, cover_image_url: v })} />

      <div className="rounded-xl border border-[#e8dfd3] bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-[#6b5c4d]">稅務設定</p>
        <div className="space-y-2 text-sm">
          <Toggle checked={form.show_seller_tax_id} onChange={(v) => setForm({ ...form, show_seller_tax_id: v })} label="顯示賣方統編" />
          {form.show_seller_tax_id && (
            <input value={form.seller_tax_id ?? ""} onChange={(e) => setForm({ ...form, seller_tax_id: e.target.value })} placeholder="賣方統編" className={inp} />
          )}
          <Toggle checked={form.show_buyer_tax_id} onChange={(v) => setForm({ ...form, show_buyer_tax_id: v })} label="顯示買方統編" />
          {form.show_buyer_tax_id && (
            <input value={form.client_tax_id ?? ""} onChange={(e) => setForm({ ...form, client_tax_id: e.target.value })} placeholder="買方統編" className={inp} />
          )}
          <Toggle checked={form.tax_included} onChange={(v) => setForm({ ...form, tax_included: v })} label="本報價含稅" />
          <Toggle checked={form.show_tax_breakdown} onChange={(v) => setForm({ ...form, show_tax_breakdown: v })} label="顯示稅額明細" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#6b5c4d]">項目</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCsv("報價明細範本.csv", quoteLinesToCsv())}
              className="text-xs font-semibold text-[#C45A3C] hover:underline"
            >
              下載範本
            </button>
            <CsvImportButton label="匯入 CSV" onFile={handleQuoteLinesCsv} />
          </div>
        </div>
        {importMsg && (
          <p className="mb-2 rounded-lg border border-[#C45A3C]/30 bg-[#C45A3C]/10 px-3 py-2 text-xs font-medium text-[#8B4513]">
            {importMsg}
          </p>
        )}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7b6a]" />
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="關鍵字搜尋項目庫…" className={`${inp} pl-9`} />
        </div>
        {filteredCatalog.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-xl border border-[#e8dfd3] bg-white">
            {filteredCatalog.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setLines([
                    ...lines,
                    {
                      sort_order: lines.length,
                      line_type: "item" as const,
                      name: c.name,
                      unit: c.unit,
                      quantity: 1,
                      unit_price: Number(c.unit_price),
                    },
                  ]);
                  setKw("");
                }}
                className="flex w-full justify-between border-b border-[#f0e6d8] px-3 py-2 text-left text-sm last:border-0 hover:bg-[#F5F0E8]"
              >
                <span>{c.name}</span>
                <span className="text-[#6b5c4d]">NT${Number(c.unit_price).toLocaleString()}/{c.unit}</span>
              </button>
            ))}
          </div>
        )}
        <QuoteLineList lines={lines} onChange={setLines} />
      </div>

      <Field label="備註" value={form.note ?? ""} onChange={(v) => setForm({ ...form, note: v })} multiline />
      <Field label="條款" value={form.terms ?? ""} onChange={(v) => setForm({ ...form, terms: v })} multiline />
      <Field label="有效期限" value={form.valid_until ?? ""} onChange={(v) => setForm({ ...form, valid_until: v })} type="date" />
    </div>
  );

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => nav({ to: "/quotes" })} className="text-sm text-[#6b5c4d] hover:underline">← 返回</button>
        <div className="flex-1" />
        <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-1 rounded-full border border-[#e8dfd3] bg-white px-4 py-2 text-sm font-semibold">
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 儲存
        </button>
        <button type="button" onClick={() => setPreviewFull(true)} className="inline-flex items-center gap-1 rounded-full border border-[#e8dfd3] bg-white px-4 py-2 text-sm font-semibold">
          <Eye className="h-4 w-4" /> 預覽
        </button>
        <button type="button" onClick={doExport} disabled={exporting} className="inline-flex items-center gap-1 rounded-full bg-[#1a1612] px-4 py-2 text-sm font-semibold text-white">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </button>
        <button type="button" onClick={doShare} className="inline-flex items-center gap-1 rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white">
          <Share2 className="h-4 w-4" /> LINE
        </button>
      </div>

      {shareUrl && <p className="mb-3 truncate rounded-lg bg-white px-3 py-2 text-xs text-[#6b5c4d]">分享連結：{shareUrl}</p>}

      <div className="mb-3 flex gap-2 md:hidden">
        <button type="button" onClick={() => setTab("edit")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "edit" ? "bg-[#C45A3C] text-white" : "bg-white"}`}>編輯</button>
        <button type="button" onClick={() => setTab("preview")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === "preview" ? "bg-[#C45A3C] text-white" : "bg-white"}`}>預覽</button>
      </div>

      {/* PDF 匯出專用離屏節點：不可 display:none / visibility:hidden，否則 PDF 會空白 */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[99999px] z-0 w-[794px] overflow-visible"
      >
        <QuoteDocument quote={quotePreview} lines={lines} profile={profile} exportTarget />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className={`min-w-0 overflow-hidden rounded-2xl border border-[#e8dfd3] bg-[#FDFBF7] p-4 ${tab === "preview" ? "hidden lg:block" : ""}`}>{editor}</div>
        <div className={`min-w-0 overflow-x-auto rounded-2xl border border-[#e8dfd3] bg-[#ece3d6] p-2 ${tab === "edit" ? "hidden lg:block" : ""}`}>
          <QuoteDocument quote={quotePreview} lines={lines} profile={profile} preview />
        </div>
      </div>

      {previewFull && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 p-4">
          <div className="mx-auto flex w-full max-w-3xl justify-end pb-2">
            <button type="button" onClick={() => setPreviewFull(false)} className="rounded-full bg-white p-2"><X className="h-5 w-5" /></button>
          </div>
          <div className="mx-auto max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg">
            <QuoteDocument quote={quotePreview} lines={lines} profile={profile} preview />
          </div>
          <div className="mx-auto mt-3 flex gap-2">
            <button type="button" onClick={doExport} className="rounded-full bg-white px-5 py-2 text-sm font-semibold">下載 PDF</button>
            <button type="button" onClick={doShare} className="rounded-full bg-[#06C755] px-5 py-2 text-sm font-semibold text-white">LINE 分享</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange, multiline, type = "text" }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-[#6b5c4d]">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={inp} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inp} />
      )}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-[#d9cfc0]" />
      <span>{label}</span>
    </label>
  );
}

const inp = "w-full min-w-0 rounded-xl border border-[#ece3d6] bg-white px-3 py-2 text-sm break-words outline-none focus:border-[#C45A3C]";
