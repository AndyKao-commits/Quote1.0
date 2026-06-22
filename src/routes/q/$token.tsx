import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Share2 } from "lucide-react";
import { QuoteDocument } from "@/components/QuoteDocument";
import { getQuoteByShareToken } from "@/lib/quotes.functions";
import { formatMoney, lineShareText } from "@/lib/quotes.types";

export const Route = createFileRoute("/q/$token")({
  head: () => ({ meta: [{ title: "報價預覽 — 報得過" }] }),
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getQuoteByShareToken);
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

  return (
    <div className="bdg-theme min-h-screen bg-[#ece3d6] py-6">
      <div className="mx-auto mb-4 max-w-3xl px-4 text-center">
        <p className="font-display text-lg font-bold text-[#1a1612]">報得過 · 報價預覽</p>
        <p className="text-sm text-[#6b5c4d]">{data.quote.client_name} · {formatMoney(Number(data.quote.total))}</p>
        <button
          type="button"
          onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank")}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
        >
          <Share2 className="h-4 w-4" /> 轉傳 LINE
        </button>
      </div>
      <div className="mx-auto max-w-3xl overflow-auto px-2">
        <QuoteDocument quote={data.quote} lines={data.lines} profile={data.profile} preview />
      </div>
    </div>
  );
}
