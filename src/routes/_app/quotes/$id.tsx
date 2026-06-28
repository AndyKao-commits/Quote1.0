import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download, Eye, Loader2, Save, Search, Share2, X,
} from "lucide-react";
import { QuoteLineList } from "@/components/QuoteLineList";
import { QuotePriceAdjustBar } from "@/components/QuotePriceAdjustBar";
import { CsvImportButton } from "@/components/CsvImportButton";
import { AppShell } from "@/components/BdgAppShell";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuotePreviewPane } from "@/components/QuotePreviewPane";
import {
  getQuote, saveQuote, publishShare, revokeShare, renewShare, listCatalogItems, getProfile,
} from "@/lib/quotes.functions";
import {
  applyPricePercentAdjustment,
  calcQuoteTotals,
  cloneQuoteLines,
  prepareQuoteLinesForSave,
  unapplyPricePercentAdjustment,
  lineShareText,
  formatShareExpiry,
  type QuoteLine,
} from "@/lib/quotes.types";
import { exportQuotePdf } from "@/lib/quote-pdf";
import { shareLinkViaLine } from "@/lib/line-share";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { downloadCsv, parseQuoteLinesCsv, quoteLineCsvToQuoteLines, quoteLinesToCsv } from "@/lib/csv-import";
import { DEFAULT_QUOTE_TERMS, formatPaymentScheduleText, resolveQuoteTerms } from "@/lib/quote-document.utils";
import { getSampleQuote, SAMPLE_QUOTES, type SampleQuoteId } from "@/lib/landing-demo-quotes";

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
  const revokeShareFn = useServerFn(revokeShare);
  const renewShareFn = useServerFn(renewShare);
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
  const baseLinesRef = useRef<QuoteLine[]>([]);
  const [kw, setKw] = useState("");
  const [previewFull, setPreviewFull] = useState(false);

  useEffect(() => {
    if (!previewFull) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewFull]);
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [priceAdjustPct, setPriceAdjustPct] = useState(0);

  useEffect(() => {
    if (data) {
      const loadedLines = (data.quote_lines ?? []).map((l: any, i: number) => ({
        ...l,
        sort_order: i,
        line_type: l.line_type ?? "item",
      }));
      const loadedTotals = calcQuoteTotals(loadedLines, {
        tax_included: data.tax_included,
        show_tax_breakdown: data.show_tax_breakdown,
        tax_rate: Number(data.tax_rate ?? 0.05),
      });
      const hasCustomPayment = Boolean(data.payment_schedule?.trim());
      setForm({
        ...data,
        quote_lines: undefined,
        terms: data.terms?.trim() || DEFAULT_QUOTE_TERMS,
        payment_schedule: hasCustomPayment
          ? data.payment_schedule
          : formatPaymentScheduleText(loadedTotals.total),
      });
      setLines(loadedLines);
      baseLinesRef.current = cloneQuoteLines(loadedLines);
      setPriceAdjustPct(0);
      setPaymentTouched(hasCustomPayment);
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

  useEffect(() => {
    if (paymentTouched) return;
    setForm((prev: any) => {
      if (!prev) return prev;
      const next = formatPaymentScheduleText(totals.total);
      if (prev.payment_schedule === next) return prev;
      return { ...prev, payment_schedule: next };
    });
  }, [totals.total, paymentTouched]);

  const quotePreview = form
    ? {
        ...form,
        ...totals,
        terms: resolveQuoteTerms(form.terms),
        payment_schedule: paymentTouched
          ? form.payment_schedule
          : formatPaymentScheduleText(totals.total),
      }
    : null;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form) return null;
      const { lines: saveLines, skipped, truncated } = prepareQuoteLinesForSave(lines);
      if (!saveLines.length) throw new Error("至少需要一筆有名稱的項目");
      if (skipped > 0 || truncated > 0) {
        baseLinesRef.current = cloneQuoteLines(saveLines);
        setLines(saveLines);
        setPriceAdjustPct(0);
      }
      await saveFn({
        data: {
          id,
          title: form.title,
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
          terms: resolveQuoteTerms(form.terms),
          payment_schedule: paymentTouched
            ? form.payment_schedule
            : formatPaymentScheduleText(totals.total),
          cover_image_url: form.cover_image_url,
          lines: saveLines,
        },
      });
      return { skipped, truncated };
    },
    onSuccess: (res) => {
      if (!res) return;
      const parts: string[] = [];
      if (res.skipped > 0) parts.push(`已略過 ${res.skipped} 筆空白列`);
      if (res.truncated > 0) parts.push(`${res.truncated} 筆已截斷至字數上限（項目 100 字、備註 200 字）`);
      if (parts.length) setImportMsg(parts.join("；"));
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "儲存失敗";
      if (msg.includes("String must contain at least 1 character")) {
        setImportMsg("有項目名稱是空的，請填寫或刪除空白列後再儲存");
        return;
      }
      setImportMsg(msg);
    },
  });

  const filteredCatalog = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return [];
    return (catalog as any[])
      .filter((c) => {
        const hay = [
          c.name,
          c.category ?? "",
          ...(c.keywords ?? []),
          ...(c.package_lines ?? []).map((l: { name: string }) => l.name),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
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
    setExporting(true);
    try {
      try {
        await saveMut.mutateAsync();
      } catch {
        // PDF 不依賴儲存成功
      }
      await exportQuotePdf(`${form.client_name || "報價"}-${form.title}.pdf`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "匯出失敗");
    } finally {
      setExporting(false);
    }
  }

  const termsValue = resolveQuoteTerms(form.terms);
  const paymentValue = paymentTouched
    ? (form.payment_schedule ?? "")
    : formatPaymentScheduleText(totals.total);

  async function doShare() {
    await saveMut.mutateAsync();
    const res = await shareFn({ data: { id } });
    const url = `${window.location.origin}/q/${res.token}`;
    setShareUrl(url);
    setForm((prev: any) => ({
      ...prev,
      share_token: res.token,
      share_expires_at: res.share_expires_at,
    }));
    const text = lineShareText(
      {
        ...quotePreview,
        client_name: form.client_name,
        title: form.title,
        valid_until: form.valid_until,
        share_expires_at: res.share_expires_at,
      },
      url,
    );
    await shareLinkViaLine(url, text);
  }

  async function doRevokeShare() {
    if (!confirm("確定作廢分享連結？客戶將無法再開啟此連結。")) return;
    await revokeShareFn({ data: { id } });
    setShareUrl(null);
    setForm((prev: any) => ({ ...prev, share_token: null, share_expires_at: null }));
  }

  async function doRenewShare() {
    const res = await renewShareFn({ data: { id } });
    setForm((prev: any) => ({ ...prev, share_expires_at: res.share_expires_at }));
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    const copied = await copyToClipboard(shareUrl);
    if (copied) toast.success("連結已複製");
    else toast.error("請長按下方連結手動複製");
  }

  function setAllLines(nextBase: QuoteLine[], resetAdjust = true) {
    baseLinesRef.current = cloneQuoteLines(nextBase);
    const pct = resetAdjust ? 0 : priceAdjustPct;
    if (resetAdjust) setPriceAdjustPct(0);
    setLines(applyPricePercentAdjustment(baseLinesRef.current, pct));
  }

  function handlePriceAdjustChange(pct: number) {
    setPriceAdjustPct(pct);
    setLines(applyPricePercentAdjustment(baseLinesRef.current, pct));
  }

  function resetPriceAdjust() {
    setPriceAdjustPct(0);
    setLines(cloneQuoteLines(baseLinesRef.current));
  }

  function handleLinesChange(next: QuoteLine[]) {
    baseLinesRef.current =
      priceAdjustPct === 0
        ? cloneQuoteLines(next)
        : unapplyPricePercentAdjustment(next, priceAdjustPct);
    setLines(next);
  }

  function appendToBase(extra: QuoteLine[]) {
    const start = baseLinesRef.current.length;
    const withOrder = extra.map((l, i) => ({ ...l, sort_order: start + i }));
    const merged = [...baseLinesRef.current, ...withOrder].map((l, i) => ({ ...l, sort_order: i }));
    baseLinesRef.current = merged;
    setLines(applyPricePercentAdjustment(merged, priceAdjustPct));
  }

  function handleQuoteLinesCsv(text: string) {
    const { rows, errors } = parseQuoteLinesCsv(text);
    if (!rows.length) {
      setImportMsg(errors[0] ?? "CSV 沒有有效資料");
      return;
    }
    const existing = baseLinesRef.current.filter((l) => l.name.trim());
    const imported = quoteLineCsvToQuoteLines(rows, existing.length);
    const merged = [...existing, ...imported].map((l, i) => ({ ...l, sort_order: i }));
    setAllLines(merged);
    const base = `已匯入 ${imported.length} 行明細`;
    setImportMsg(errors.length ? `${base}（${errors.length} 行已略過）` : base);
  }

  function loadSample(sampleId: SampleQuoteId) {
    const sample = getSampleQuote(sampleId);
    if (!sample) return;
    if (!confirm(`載入「${sample.tabLabel}」？目前未儲存的內容會被取代。`)) return;

    const payment = formatPaymentScheduleText(
      calcQuoteTotals(sample.lines, {
        tax_included: form.tax_included,
        show_tax_breakdown: form.show_tax_breakdown,
        tax_rate: Number(form.tax_rate ?? 0.05),
      }).total,
    );

    setForm({
      ...form,
      title: sample.title,
      client_name: sample.client_name,
      client_company: sample.client_company,
      client_phone: sample.client_phone,
      client_address: sample.client_address,
      terms: DEFAULT_QUOTE_TERMS,
      payment_schedule: payment,
    });
    setAllLines(sample.lines.map((l, i) => ({ ...l, sort_order: i })));
    setPaymentTouched(false);
    setImportMsg(`已載入${sample.tabLabel}，記得按儲存`);
  }

  const editor = (
    <div className="space-y-5">
      <div className="bdg-card p-4">
        <p className="bdg-section-title mb-2">學習範例</p>
        <p className="bdg-meta mb-3">載入完整範例報價，觀察欄位與 PDF 排版（可再修改後儲存）。</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUOTES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s.id as SampleQuoteId)}
              className="bdg-btn bdg-btn-secondary text-xs"
            >
              {s.tabLabel}
            </button>
          ))}
        </div>
      </div>
      <div className="bdg-card space-y-3 p-4">
        <p className="bdg-section-title">客戶</p>
        <Field label="報價標題" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="客戶名稱" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="公司（選填）" value={form.client_company ?? ""} onChange={(v) => setForm({ ...form, client_company: v })} />
          <Field label="電話" value={form.client_phone ?? ""} onChange={(v) => setForm({ ...form, client_phone: v })} />
        </div>
        <Field label="地址" value={form.client_address ?? ""} onChange={(v) => setForm({ ...form, client_address: v })} />
      </div>

      <div className="bdg-card p-4">
        <p className="bdg-section-title mb-3">稅務</p>
        <div className="space-y-2 text-sm text-stone-700">
          <Toggle checked={form.show_seller_tax_id} onChange={(v) => setForm({ ...form, show_seller_tax_id: v })} label="顯示賣方統編" />
          {form.show_seller_tax_id && (
            <input value={form.seller_tax_id ?? ""} onChange={(e) => setForm({ ...form, seller_tax_id: e.target.value })} placeholder="賣方統編" className="bdg-input" />
          )}
          <Toggle checked={form.show_buyer_tax_id} onChange={(v) => setForm({ ...form, show_buyer_tax_id: v })} label="顯示買方統編" />
          {form.show_buyer_tax_id && (
            <input value={form.client_tax_id ?? ""} onChange={(e) => setForm({ ...form, client_tax_id: e.target.value })} placeholder="買方統編" className="bdg-input" />
          )}
          <Toggle checked={form.tax_included} onChange={(v) => setForm({ ...form, tax_included: v })} label="本報價含稅" />
          <Toggle checked={form.show_tax_breakdown} onChange={(v) => setForm({ ...form, show_tax_breakdown: v })} label="顯示稅額明細" />
        </div>
      </div>

      <div className="bdg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="bdg-section-title">明細</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => downloadCsv("報價明細範本.csv", quoteLinesToCsv())} className="text-xs font-medium text-[var(--bdg-brand)] hover:underline">
              下載範本
            </button>
            <CsvImportButton label="匯入 CSV" onFile={handleQuoteLinesCsv} />
          </div>
        </div>
        {importMsg && (
          <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {importMsg}
          </p>
        )}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜尋項目庫…" className="bdg-input pl-9" />
        </div>
        {filteredCatalog.length > 0 && (
          <div className="mb-3 overflow-hidden rounded border border-[var(--bdg-line)] bg-white">
            {filteredCatalog.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (c.item_type === "package" && Array.isArray(c.package_lines) && c.package_lines.length > 0) {
                    const extra: QuoteLine[] = [
                      {
                        sort_order: 0,
                        line_type: "group" as const,
                        name: c.name,
                        unit: "—",
                        quantity: 0,
                        unit_price: 0,
                      },
                    ];
                    c.package_lines.forEach((pl: { name: string; unit: string; quantity: number; unit_price: number }) => {
                      extra.push({
                        sort_order: 0,
                        line_type: "item" as const,
                        name: pl.name,
                        unit: pl.unit,
                        quantity: Number(pl.quantity) || 1,
                        unit_price: Number(pl.unit_price),
                      });
                    });
                    appendToBase(extra);
                  } else {
                    appendToBase([
                      {
                        sort_order: 0,
                        line_type: "item" as const,
                        name: c.name,
                        unit: c.unit,
                        quantity: 1,
                        unit_price: Number(c.unit_price),
                      },
                    ]);
                  }
                  setKw("");
                }}
                className="flex w-full justify-between border-b border-[var(--bdg-line)] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-stone-50"
              >
                <span className="truncate pr-2">
                  {c.name}
                  {c.item_type === "package" ? "（套餐）" : ""}
                </span>
                <span className="shrink-0 text-stone-500">NT${Number(c.unit_price).toLocaleString()}/{c.unit}</span>
              </button>
            ))}
          </div>
        )}
        <QuotePriceAdjustBar
          value={priceAdjustPct}
          onChange={handlePriceAdjustChange}
          onReset={resetPriceAdjust}
          disabled={!lines.some((l) => (l.line_type ?? "item") !== "group")}
        />
        <QuoteLineList lines={lines} onChange={handleLinesChange} />
      </div>

      <div className="bdg-card space-y-3 p-4">
        <p className="bdg-section-title">其他</p>
        <Field label="備註" value={form.note ?? ""} onChange={(v) => setForm({ ...form, note: v })} multiline />
        <Field
          label="條款"
          value={termsValue}
          onChange={(v) => setForm({ ...form, terms: v })}
          multiline
          rows={6}
        />
        <Field
          label="付款明細"
          value={paymentValue}
          onChange={(v) => {
            setPaymentTouched(true);
            setForm({ ...form, payment_schedule: v });
          }}
          multiline
          rows={5}
          hint="依總價自動產生；手動修改後不再隨總價更新"
        />
        <Field label="有效期限" value={form.valid_until ?? ""} onChange={(v) => setForm({ ...form, valid_until: v })} type="date" />
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--bdg-line)] pb-4">
        <button type="button" onClick={() => nav({ to: "/quotes" })} className="text-sm text-stone-500 hover:text-[var(--bdg-ink)]">
          ← 返回
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bdg-btn bdg-btn-secondary">
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 儲存
        </button>
        <button type="button" onClick={() => setPreviewFull(true)} className="bdg-btn bdg-btn-secondary">
          <Eye className="h-4 w-4" /> 預覽
        </button>
        <button type="button" onClick={doExport} disabled={exporting} className="bdg-btn bdg-btn-secondary">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </button>
        <button type="button" onClick={doShare} className="bdg-btn bg-[#06C755] text-white hover:brightness-105">
          <Share2 className="h-4 w-4" /> LINE
        </button>
      </div>

      {shareUrl && (
        <div className="mb-3 rounded border border-[var(--bdg-line)] bg-white px-3 py-2 text-xs text-stone-500">
          <p>
            分享連結
            {form?.share_expires_at
              ? `（有效至 ${formatShareExpiry(form.share_expires_at)}）`
              : "（長期有效）"}
          </p>
          <p className="mt-1 break-all text-stone-600">{shareUrl}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={copyShareUrl} className="bdg-btn bdg-btn-secondary py-1 text-xs">
              複製連結
            </button>
            <button type="button" onClick={doRenewShare} className="bdg-btn bdg-btn-secondary py-1 text-xs">
              延長 90 天
            </button>
            <button type="button" onClick={doRevokeShare} className="bdg-btn bdg-btn-secondary py-1 text-xs text-rose-700">
              作廢連結
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-2 md:hidden">
        <button type="button" onClick={() => setTab("edit")} className={`flex-1 bdg-btn text-sm ${tab === "edit" ? "bdg-btn-primary" : "bdg-btn-secondary"}`}>編輯</button>
        <button type="button" onClick={() => setTab("preview")} className={`flex-1 bdg-btn text-sm ${tab === "preview" ? "bdg-btn-primary" : "bdg-btn-secondary"}`}>預覽</button>
      </div>

      {/* 手機編輯模式時預覽隱藏，PDF 改擷取此離屏節點（與預覽相同排版） */}
      <div
        id="quote-document-fallback"
        aria-hidden
        className="quote-preview-root pointer-events-none fixed top-0 -left-[99999px] z-0 w-[794px] overflow-visible"
      >
        <QuoteDocument quote={quotePreview} lines={lines} profile={profile} preview />
      </div>

      <div className="quote-editor-layout grid min-w-0 items-stretch gap-5 lg:grid-cols-2">
        <div className={`min-w-0 ${tab === "preview" ? "hidden lg:block" : ""}`}>{editor}</div>
        <div
          className={`quote-editor-preview-col min-w-0 ${tab === "edit" ? "hidden lg:block" : "block"} ${previewFull ? "hidden" : ""}`}
        >
          <div className="quote-editor-sticky">
            <QuotePreviewPane className="quote-editor-pan flex w-full">
              <QuoteDocument quote={quotePreview} lines={lines} profile={profile} preview />
            </QuotePreviewPane>
          </div>
        </div>
      </div>

      {previewFull && (
        <div className="quote-preview-modal fixed inset-0 z-50 flex flex-col bg-stone-900/97 p-2">
          <div className="flex shrink-0 items-center justify-end pb-1">
            <button
              type="button"
              onClick={() => setPreviewFull(false)}
              className="rounded-full bg-white p-2 shadow-sm"
              aria-label="關閉預覽"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <QuotePreviewPane fullscreen className="flex min-h-0 w-full flex-1 flex-col">
            <QuoteDocument quote={quotePreview} lines={lines} profile={profile} preview />
          </QuotePreviewPane>
          <div className="mx-auto mt-2 flex shrink-0 gap-2 pb-1">
            <button type="button" onClick={doExport} className="rounded-full bg-white px-5 py-2 text-sm font-semibold shadow-sm">
              下載 PDF
            </button>
            <button type="button" onClick={doShare} className="rounded-full bg-[#06C755] px-5 py-2 text-sm font-semibold text-white shadow-sm">
              LINE 分享
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange, multiline, type = "text", hint, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string; hint?: string; rows?: number }) {
  return (
    <label className="block text-base">
      <span className="bdg-label">{label}</span>
      {hint && <span className="bdg-hint mb-1 block">{hint}</span>}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="bdg-input resize-y break-words" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bdg-input break-words" />
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

