import type { Profile, Quote, QuoteLine } from "@/lib/quotes.types";
import {
  amountToChineseUpper,
  buildGroupSummaryRows,
  buildLineLabels,
  buildPaymentSchedule,
  buildTableRows,
  DETAIL_ROWS_PER_PAGE,
  formatQuoteDate,
  formatTermsList,
  paginateQuoteDocument,
  resolveQuoteTerms,
  type DocumentPage,
} from "@/lib/quote-document.utils";

function formatAmount(n: number) {
  return Number(n).toLocaleString("zh-TW");
}

const BORDER = "#222";

export function QuoteDocument({
  quote,
  lines,
  profile,
  preview = false,
}: {
  quote: Partial<Quote> & { title: string; client_name: string };
  lines: QuoteLine[];
  profile?: Partial<Profile> | null;
  preview?: boolean;
}) {
  const labels = buildLineLabels(lines);
  const pages: DocumentPage[] = preview
    ? paginateQuoteDocument(lines)
    : [{ kind: "summary" }, { kind: "detail", lines, lineStart: 0, isFirst: true, isLast: true }];

  if (preview) {
    return (
      <div className={preview ? "space-y-1.5" : undefined}>
        {pages.map((page, pi) => (
          <QuotePage
            key={pi}
            quote={quote}
            profile={profile}
            allLines={lines}
            page={page}
            labels={labels}
            preview={preview}
            pageIndex={pi}
            totalPages={pages.length}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {pages.map((page, pi) => (
        <QuotePage
          key={pi}
          quote={quote}
          profile={profile}
          allLines={lines}
          page={page}
          labels={labels}
          preview={false}
          pageIndex={pi}
          totalPages={pages.length}
        />
      ))}
    </>
  );
}

function QuotePage({
  quote,
  profile,
  allLines,
  page,
  labels,
  preview,
  pageIndex,
  totalPages,
}: {
  quote: Partial<Quote> & { title: string; client_name: string };
  profile?: Partial<Profile> | null;
  allLines: QuoteLine[];
  page: DocumentPage;
  labels: string[];
  preview: boolean;
  pageIndex: number;
  totalPages: number;
}) {
  const company = profile?.company_name || profile?.display_name || "報得過";
  const fontFamily = "'Noto Sans TC', 'Microsoft JhengHei', sans-serif";

  const isSummary = page.kind === "summary";

  const pageClass =
    `quote-page quote-page-flex box-border bg-white text-black ` +
    (isSummary ? "quote-page-summary " : "quote-page-detail px-[10mm] pt-[7mm] pb-[5mm] ") +
    (preview ? "shadow-sm ring-1 ring-black/10" : "");

  const subtotal = quote.subtotal ?? 0;
  const tax = quote.tax_amount ?? 0;
  const total = quote.total ?? 0;
  const showTaxRows = quote.show_tax_breakdown || quote.tax_included;
  const taxRate = Number(quote.tax_rate ?? 0.05);

  return (
    <div
      data-quote-page
      data-page-kind={isSummary ? "summary" : "detail"}
      className={pageClass}
      style={{
        fontFamily,
        fontSize: isSummary ? "10.5px" : "10px",
        lineHeight: isSummary ? 1.55 : 1.4,
      }}
    >
      <ProHeader
        quote={quote}
        profile={profile}
        company={company}
        summary={isSummary}
      />

      <div className={`quote-page-body min-h-0 flex-1 ${isSummary ? "quote-summary-body" : ""}`}>
        {isSummary ? (
          <SummaryTable
            lines={allLines}
            subtotal={subtotal}
            tax={tax}
            total={total}
            showTaxRows={showTaxRows}
            taxIncluded={quote.tax_included}
            taxRate={taxRate}
          />
        ) : (
          <LinesTable
            allLines={allLines}
            pageLines={page.lines}
            labels={labels}
            lineStart={page.lineStart}
          />
        )}

        {isSummary && (
          <SummaryFooter
            quote={quote}
            profile={profile}
            company={company}
            total={total}
            taxIncluded={quote.tax_included}
          />
        )}
      </div>

      <p
        className={`quote-page-footer shrink-0 text-center text-[#666] ${
          isSummary ? "pt-4 text-[9px]" : "pt-1 text-[9px]"
        }`}
      >
        第 {pageIndex + 1} / {totalPages} 頁
      </p>
    </div>
  );
}

function ProHeader({
  quote,
  profile,
  company,
  summary = false,
}: {
  quote: Partial<Quote> & { title: string; client_name: string };
  profile?: Partial<Profile> | null;
  company: string;
  summary?: boolean;
}) {
  const dateStr = formatQuoteDate(quote);
  const contentTitle = quote.title || "工程施工報價單";

  return (
    <header className={`shrink-0 break-words ${summary ? "mb-4" : "mb-2"}`}>
      <div className="text-center">
        {profile?.logo_url ? (
          <img
            src={profile.logo_url}
            alt=""
            className={`mx-auto object-contain ${summary ? "mb-1 h-12" : "mb-0.5 h-10"}`}
          />
        ) : null}
        <p
          className={`font-semibold tracking-wide text-[#222] ${
            summary ? "text-xs" : "text-[11px]"
          }`}
        >
          {company}
        </p>
      </div>

      <div
        className={`grid grid-cols-[1fr_auto] gap-x-6 ${
          summary ? "mt-3 gap-y-1 text-[10.5px] leading-relaxed" : "mt-1.5 gap-y-0.5 text-[10px] leading-snug"
        }`}
      >
        <p>
          <span className="text-[#444]">內容：</span>
          {contentTitle}
        </p>
        {!summary && dateStr && <p className="text-right whitespace-nowrap">{dateStr}</p>}
        <p className="col-span-2">
          <span className="text-[#444]">業主：</span>
          {quote.client_name || "—"}
          {quote.client_company ? `（${quote.client_company}）` : ""}
        </p>
        {summary ? (
          <>
            <p>
              <span className="text-[#444]">案址：</span>
              {quote.client_address || "—"}
            </p>
            {dateStr && <p className="text-right whitespace-nowrap">{dateStr}</p>}
          </>
        ) : (
          <p className="col-span-2">
            <span className="text-[#444]">案址：</span>
            {quote.client_address || "—"}
          </p>
        )}
        {(quote.client_phone || quote.show_buyer_tax_id) && !summary && (
          <p className="col-span-2 text-[#444]">
            {quote.client_phone && <span>電話：{quote.client_phone}　</span>}
            {quote.show_buyer_tax_id && quote.client_tax_id && <span>統編：{quote.client_tax_id}</span>}
          </p>
        )}
      </div>
    </header>
  );
}

function cellCls(extra = "") {
  return `border border-black px-1 py-[3px] align-middle break-words ${extra}`.trim();
}

function summaryCellCls(extra = "") {
  return `border border-black px-2 py-[6px] align-middle break-words ${extra}`.trim();
}

function TableColGroup() {
  return (
    <colgroup>
      <col style={{ width: "5%" }} />
      <col style={{ width: "30%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "13%" }} />
      <col style={{ width: "13%" }} />
      <col style={{ width: "25%" }} />
    </colgroup>
  );
}

function TableHead({ summary = false }: { summary?: boolean }) {
  const border = { borderColor: BORDER };
  const cls = summary ? summaryCellCls : cellCls;
  return (
    <thead>
      <tr className="bg-[#f5f5f5]">
        {["序號", "名稱", "單位", "數量", "單價", "總價", "備註"].map((h, idx) => (
          <th
            key={h}
            className={cls(
              `font-bold text-[#111] ${idx === 1 ? "text-left" : idx >= 4 ? "text-right" : "text-center"}`,
            )}
            style={border}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SummaryTable({
  lines,
  subtotal,
  tax,
  total,
  showTaxRows,
  taxIncluded,
  taxRate,
}: {
  lines: QuoteLine[];
  subtotal: number;
  tax: number;
  total: number;
  showTaxRows: boolean;
  taxIncluded?: boolean;
  taxRate: number;
}) {
  const summaryRows = buildGroupSummaryRows(lines);
  const border = { borderColor: BORDER };

  return (
    <table className="quote-summary-table w-full border-collapse" style={{ tableLayout: "fixed" }}>
      <TableColGroup />
      <TableHead summary />
      <tbody>
        {summaryRows.map((row) => (
          <tr key={row.key}>
            <td className={summaryCellCls("text-center")} style={border}>
              {row.index}
            </td>
            <td className={summaryCellCls("text-left")} style={border}>
              {row.name}
            </td>
            <td className={summaryCellCls("text-center")} style={border}>
              {row.unit}
            </td>
            <td className={summaryCellCls("text-center")} style={border}>
              {row.quantity}
            </td>
            <td className={summaryCellCls("text-right")} style={border}>
              {formatAmount(row.unitPrice)}
            </td>
            <td className={summaryCellCls("text-right")} style={border}>
              {formatAmount(row.total)}
            </td>
            <td className={summaryCellCls("text-left")} style={border}>
              {row.note}
            </td>
          </tr>
        ))}

        <TotalsRows
          subtotal={subtotal}
          tax={tax}
          total={total}
          showTaxRows={showTaxRows}
          taxIncluded={taxIncluded}
          taxRate={taxRate}
          summary
        />
      </tbody>
    </table>
  );
}

function TotalsRows({
  subtotal,
  tax,
  total,
  showTaxRows,
  taxIncluded,
  taxRate,
  summary = false,
}: {
  subtotal: number;
  tax: number;
  total: number;
  showTaxRows: boolean;
  taxIncluded?: boolean;
  taxRate: number;
  summary?: boolean;
}) {
  const border = { borderColor: BORDER };
  const cls = summary ? summaryCellCls : cellCls;
  const taxLabel = `營業稅${taxIncluded ? "（含稅）" : ` ${Math.round(taxRate * 100)}%`}`;

  return (
    <>
      <tr>
        <td colSpan={5} className={cls("text-right font-medium")} style={border}>
          合計
        </td>
        <td className={cls("text-right font-medium")} style={border}>
          ${formatAmount(subtotal)}
        </td>
        <td className={cls()} style={border} />
      </tr>
      {showTaxRows && (
        <tr>
          <td colSpan={5} className={cls("text-right")} style={border}>
            {taxLabel}
          </td>
          <td className={cls("text-right")} style={border}>
            ${formatAmount(tax)}
          </td>
          <td className={cls()} style={border} />
        </tr>
      )}
      <tr className="bg-[#f5f5f5]">
        <td colSpan={5} className={cls("text-right font-bold")} style={border}>
          總價
        </td>
        <td className={cls("text-right font-bold")} style={border}>
          ${formatAmount(total)}
        </td>
        <td className={cls()} style={border} />
      </tr>
      <tr>
        <td colSpan={2} className={cls("font-medium")} style={border}>
          總價
        </td>
        <td colSpan={5} className={cls("text-left font-medium")} style={border}>
          {amountToChineseUpper(total)}
        </td>
      </tr>
    </>
  );
}

function LinesTable({
  allLines,
  pageLines,
  labels,
  lineStart,
}: {
  allLines: QuoteLine[];
  pageLines: QuoteLine[];
  labels: string[];
  lineStart: number;
}) {
  const rows = buildTableRows(pageLines, allLines, lineStart, labels);
  const border = { borderColor: BORDER };
  const padCount = Math.max(0, DETAIL_ROWS_PER_PAGE - rows.length);

  return (
    <table className="quote-detail-table h-full w-full border-collapse" style={{ tableLayout: "fixed" }}>
      <TableColGroup />
      <TableHead />
      <tbody>
        {rows.map((row) => {
          if (row.type === "group") {
            return (
              <tr key={row.key} className="bg-[#f0f0f0]">
                <td className={cellCls("text-center font-bold")} style={border}>
                  {row.label}
                </td>
                <td className={cellCls("text-left font-bold")} style={border}>
                  {row.line.name}
                </td>
                <td className={cellCls()} style={border} />
                <td className={cellCls()} style={border} />
                <td className={cellCls()} style={border} />
                <td className={cellCls()} style={border} />
                <td className={cellCls("text-left")} style={border}>
                  {row.line.note || ""}
                </td>
              </tr>
            );
          }
          const l = row.line;
          const lineTotal = Number(l.quantity) * Number(l.unit_price);
          return (
            <tr key={row.key}>
              <td className={cellCls("text-center")} style={border}>
                {row.label}
              </td>
              <td className={cellCls("text-left")} style={border}>
                {l.name}
              </td>
              <td className={cellCls("text-center")} style={border}>
                {l.unit}
              </td>
              <td className={cellCls("text-center")} style={border}>
                {l.quantity}
              </td>
              <td className={cellCls("text-right")} style={border}>
                {formatAmount(l.unit_price)}
              </td>
              <td className={cellCls("text-right")} style={border}>
                {formatAmount(lineTotal)}
              </td>
              <td className={cellCls("text-left")} style={border}>
                {l.note || ""}
              </td>
            </tr>
          );
        })}
        {Array.from({ length: padCount }, (_, i) => (
          <tr key={`pad-${i}`} className="quote-pad-row">
            {Array.from({ length: 7 }, (__, j) => (
              <td key={j} className={cellCls()} style={border}>
                {"\u00a0"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryFooter({
  quote,
  profile,
  company,
  total,
  taxIncluded,
}: {
  quote: Partial<Quote>;
  profile?: Partial<Profile> | null;
  company: string;
  total: number;
  taxIncluded?: boolean;
}) {
  const termLines = formatTermsList(resolveQuoteTerms(quote.terms));
  const paymentLines = buildPaymentSchedule(total, quote.payment_schedule);
  const hasNote = Boolean(quote.note?.trim());
  const paymentTitle = taxIncluded ? "付款明細" : "付款明細（未稅）";

  return (
    <div className="quote-summary-footer mt-5 space-y-4 break-words text-[10px] leading-[1.65]">
      {hasNote && (
        <div>
          <p className="mb-1 font-bold">備註</p>
          <p className="whitespace-pre-wrap">{quote.note}</p>
        </div>
      )}

      <ul className="space-y-1.5">
        {termLines.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {paymentLines.length > 0 && (
        <div
          className="space-y-1.5 border border-black bg-[#f7f7f7] px-3 py-2.5"
          style={{ borderColor: BORDER }}
        >
          <p className="font-bold">{paymentTitle}</p>
          {paymentLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      <p className="text-[#333]">
        承蒙惠顧，下列工項經貴府同意施作，請於下方簽名確認。
      </p>

      <div className="space-y-3">
        <SignBox left="業主代表：" right="（以下簡稱甲方）" summary />
        <SignBox
          left={`設計業務：${company}${profile?.phone ? `　${profile.phone}` : ""}`}
          right="（以下簡稱乙方）"
          summary
        />
        {quote.show_seller_tax_id && quote.seller_tax_id && (
          <p className="text-[9px] text-[#666]">乙方統編：{quote.seller_tax_id}</p>
        )}
      </div>
    </div>
  );
}

function SignBox({
  left,
  right,
  summary = false,
}: {
  left: string;
  right: string;
  summary?: boolean;
}) {
  return (
    <div
      className={`flex items-end justify-between border border-black ${
        summary ? "min-h-[2.75rem] px-3 py-2" : "min-h-[2rem] px-2 py-1.5"
      }`}
      style={{ borderColor: BORDER }}
    >
      <span className="pr-2">{left}</span>
      <span className="shrink-0 text-[#444]">{right}</span>
    </div>
  );
}
