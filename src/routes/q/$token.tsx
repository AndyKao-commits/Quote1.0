import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuotePreviewPane } from "@/components/QuotePreviewPane";
import { getQuoteByShareToken } from "@/lib/quotes.functions";
import { exportQuotePdf } from "@/lib/quote-pdf";
import { shareViaLine } from "@/lib/line-share";
import { formatMoney, formatShareExpiry, lineShareText } from "@/lib/quotes.types";

export const Route = createFileRoute("/q/$token")({
  head: () => ({ meta: [{ title: "報價預覽 — 報得過" }] }),
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getQuoteByShareToken);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["share", token],
    queryFn: () => fn({ data: { token } }) as Promise<any>,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#C45A3C]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8] p-6 text-center">
        <p className="text-[#6b5c4d]">{(error as Error)?.message || "找不到報價"}</p>
      </div>
    );
  }

  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareText = lineShareText(data.quote, url);
  const pdfName = `${data.quote.client_name || "報價"}-${data.quote.title || "報價單"}.pdf`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("連結已複製");
    } catch {
      toast.error("無法複製連結");
    }
  }

  async function doExport() {
    setExporting(true);
    try {
      await exportQuotePdf(pdfName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "匯出失敗");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bdg-theme min-h-screen bg-[#ece3d6] pb-6">
      <div className="sticky top-0 z-10 border-b border-[var(--bdg-line)] bg-[#F5F0E8]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <p className="font-display text-lg font-bold text-[#1a1612]">報得過 · 報價預覽</p>
          <p className="text-sm text-[#6b5c4d]">
            {data.quote.client_name || "客戶"} · {formatMoney(Number(data.quote.total))}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {data.quote.share_expires_at
              ? `此連結有效至 ${formatShareExpiry(data.quote.share_expires_at)}`
              : "此連結長期有效"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => shareViaLine(shareText)}
              className="bdg-btn bg-[#06C755] text-white hover:brightness-105"
            >
              <Share2 className="h-4 w-4" /> 轉傳 LINE
            </button>
            <button type="button" onClick={doExport} disabled={exporting} className="bdg-btn bdg-btn-secondary">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              下載 PDF
            </button>
            <button type="button" onClick={copyLink} className="bdg-btn bdg-btn-secondary">
              <Copy className="h-4 w-4" /> 複製連結
            </button>
          </div>
        </div>
      </div>

      <div
        id="quote-document-fallback"
        aria-hidden
        className="quote-preview-root pointer-events-none fixed top-0 -left-[99999px] z-0 w-[794px] overflow-visible"
      >
        <QuoteDocument quote={data.quote} lines={data.lines} profile={data.profile} preview />
      </div>

      <div className="mx-auto max-w-5xl px-2 pt-3 md:px-4">
        <QuotePreviewPane className="quote-editor-pan">
          <QuoteDocument quote={data.quote} lines={data.lines} profile={data.profile} preview />
        </QuotePreviewPane>
      </div>
    </div>
  );
}
