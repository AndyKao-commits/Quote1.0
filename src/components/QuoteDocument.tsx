import type { Profile, Quote, QuoteLine, QuoteTemplate } from "@/lib/quotes.types";
import { formatMoney } from "@/lib/quotes.types";

export function QuoteDocument({
  quote,
  lines,
  profile,
  preview = false,
  exportTarget = false,
}: {
  quote: Partial<Quote> & { template: QuoteTemplate; title: string; client_name: string };
  lines: QuoteLine[];
  profile?: Partial<Profile> | null;
  preview?: boolean;
  /** 僅 PDF 匯出用的預覽節點，避免重複 id */
  exportTarget?: boolean;
}) {
  const brand = profile?.brand_color || "#C45A3C";
  const company = profile?.company_name || profile?.display_name || "報得過";
  const tpl = quote.template;

  const wrapper =
    "quote-doc mx-auto box-border overflow-hidden bg-white text-[#1a1612] shadow-sm " +
    (preview ? "w-full max-w-[210mm] min-h-[297mm] p-6 md:p-10" : "w-[210mm] min-h-[297mm] p-10");

  const body = (
    <>
      <LinesTable lines={lines} brand={brand} rounded={tpl === "studio"} formal={tpl === "formal"} />
      <TotalsBlock quote={quote} brand={brand} />
      <FooterBlock quote={quote} profile={profile} />
    </>
  );

  const docProps = exportTarget ? { id: "quote-document" as const } : {};

  if (tpl === "studio") {
    return (
      <div {...docProps} className={wrapper} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
        <div className="mb-6 flex items-start justify-between gap-4 break-words">
          <div className="min-w-0 flex-1">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="mb-3 h-14 max-w-full object-contain" />
            ) : (
              <div className="mb-3 text-2xl font-bold break-words" style={{ color: brand }}>
                {company}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight break-words">{quote.title || "報價單"}</h1>
            <p className="mt-2 text-sm text-[#6b5c4d] break-words">給 {quote.client_name || "—"}</p>
          </div>
          {quote.cover_image_url && (
            <img src={quote.cover_image_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          )}
        </div>
        <ClientBlock quote={quote} />
        {body}
      </div>
    );
  }

  if (tpl === "formal") {
    return (
      <div {...docProps} className={wrapper} style={{ fontFamily: "'Noto Serif TC', 'Noto Serif', serif" }}>
        <div className="border-b-2 border-[#1a1612] pb-4 text-center">
          <p className="text-xs tracking-[0.35em] text-[#6b5c4d] break-words">{company}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[0.2em]">報 價 單</h1>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm break-words">
          <Party label="報價方" name={company} taxId={quote.show_seller_tax_id ? quote.seller_tax_id : null} profile={profile} />
          <Party label="客戶" name={quote.client_name} company={quote.client_company} taxId={quote.show_buyer_tax_id ? quote.client_tax_id : null} quote={quote} />
        </div>
        {body}
      </div>
    );
  }

  return (
    <div {...docProps} className={wrapper} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div className="flex items-end justify-between gap-2 border-b-2 pb-3 break-words" style={{ borderColor: brand }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6b5c4d]">{company}</p>
          <h1 className="mt-1 text-xl font-bold break-words">{quote.title || "報價單"}</h1>
        </div>
        <div className="shrink-0 text-right text-sm text-[#6b5c4d]">
          {quote.valid_until && <p>有效至 {quote.valid_until}</p>}
        </div>
      </div>
      <ClientBlock quote={quote} compact />
      {body}
    </div>
  );
}

function Party({
  label,
  name,
  company,
  taxId,
  profile,
  quote,
}: {
  label: string;
  name?: string | null;
  company?: string | null;
  taxId?: string | null;
  profile?: Partial<Profile> | null;
  quote?: Partial<Quote>;
}) {
  return (
    <div className="min-w-0 break-words">
      <p className="text-xs font-semibold text-[#6b5c4d]">{label}</p>
      <p className="mt-1 font-medium">{name}</p>
      {company && <p className="text-[#6b5c4d]">{company}</p>}
      {taxId && <p className="mt-1">統編 {taxId}</p>}
      {profile?.phone && label === "報價方" && <p className="mt-1">{profile.phone}</p>}
      {quote?.client_phone && label === "客戶" && <p className="mt-1">{quote.client_phone}</p>}
    </div>
  );
}

function ClientBlock({ quote, compact }: { quote: Partial<Quote>; compact?: boolean }) {
  return (
    <div className={`grid gap-1 text-sm break-words ${compact ? "mt-3" : "mt-5"} text-[#3d342b]`}>
      <p>
        <span className="text-[#6b5c4d]">客戶 </span>
        <span className="font-semibold">{quote.client_name}</span>
        {quote.client_company && ` · ${quote.client_company}`}
      </p>
      {quote.client_phone && <p>電話 {quote.client_phone}</p>}
      {quote.client_address && <p>地址 {quote.client_address}</p>}
      {quote.show_buyer_tax_id && quote.client_tax_id && <p>統編 {quote.client_tax_id}</p>}
    </div>
  );
}

function LinesTable({
  lines,
  brand,
  rounded,
  formal,
}: {
  lines: QuoteLine[];
  brand: string;
  rounded?: boolean;
  formal?: boolean;
}) {
  const headers = ["項目", "單位", "數量", "單價", "小計", "備註"];
  return (
    <div className="mt-5 w-full overflow-hidden">
      <table className="w-full table-fixed border-collapse text-xs sm:text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "32%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: formal ? "#f5f0e8" : `${brand}12` }}>
            {headers.map((h, idx) => (
              <th
                key={h}
                className={`border border-[#e8dfd3] px-1.5 py-2 font-semibold break-words ${idx > 0 ? "text-right" : "text-left"} ${rounded && idx === 0 ? "rounded-tl-lg" : ""} ${rounded && idx === headers.length - 1 ? "rounded-tr-lg" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const isGroup = (l.line_type ?? "item") === "group";
            if (isGroup) {
              return (
                <tr key={i} style={{ backgroundColor: `${brand}08` }}>
                  <td colSpan={6} className="border border-[#e8dfd3] px-2 py-2 font-bold break-words text-[#1a1612]">
                    {l.name}
                  </td>
                </tr>
              );
            }
            const sub = Number(l.quantity) * Number(l.unit_price);
            return (
              <tr key={i}>
                <td className="border border-[#e8dfd3] px-1.5 py-2 break-words align-top">{l.name}</td>
                <td className="border border-[#e8dfd3] px-1.5 py-2 text-right break-words align-top">{l.unit}</td>
                <td className="border border-[#e8dfd3] px-1.5 py-2 text-right align-top">{l.quantity}</td>
                <td className="border border-[#e8dfd3] px-1.5 py-2 text-right break-words align-top">{formatMoney(l.unit_price)}</td>
                <td className="border border-[#e8dfd3] px-1.5 py-2 text-right font-medium align-top">{formatMoney(sub)}</td>
                <td className="border border-[#e8dfd3] px-1.5 py-2 text-left text-[11px] break-words align-top text-[#6b5c4d]">
                  {l.note || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ quote, brand }: { quote: Partial<Quote>; brand: string }) {
  return (
    <div className="mt-5 flex justify-end break-words">
      <div className="min-w-[200px] max-w-full space-y-1 text-sm">
        {quote.show_tax_breakdown && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[#6b5c4d]">小計</span>
              <span>{formatMoney(quote.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#6b5c4d]">營業稅</span>
              <span>{formatMoney(quote.tax_amount ?? 0)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between gap-4 border-t border-[#e8dfd3] pt-2 text-base font-bold" style={{ color: brand }}>
          <span>總計</span>
          <span>{formatMoney(quote.total ?? 0)}</span>
        </div>
        {!quote.tax_included && !quote.show_tax_breakdown && (
          <p className="text-right text-xs text-[#6b5c4d]">未含稅，稅另計</p>
        )}
        {quote.tax_included && !quote.show_tax_breakdown && (
          <p className="text-right text-xs text-[#6b5c4d]">含稅</p>
        )}
      </div>
    </div>
  );
}

function FooterBlock({ quote, profile }: { quote: Partial<Quote>; profile?: Partial<Profile> | null }) {
  return (
    <div className="mt-8 space-y-3 border-t border-[#e8dfd3] pt-4 text-xs leading-relaxed break-words text-[#6b5c4d]">
      {quote.note && (
        <div>
          <p className="font-semibold text-[#3d342b]">備註</p>
          <p className="whitespace-pre-wrap break-words">{quote.note}</p>
        </div>
      )}
      {quote.terms && (
        <div>
          <p className="font-semibold text-[#3d342b]">條款</p>
          <p className="whitespace-pre-wrap break-words">{quote.terms}</p>
        </div>
      )}
      {quote.show_seller_tax_id && quote.seller_tax_id && <p>賣方統編 {quote.seller_tax_id}</p>}
      {profile?.phone && <p>聯絡 {profile.phone}</p>}
    </div>
  );
}
