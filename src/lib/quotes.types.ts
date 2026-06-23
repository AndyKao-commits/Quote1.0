export const QUOTE_LIMITS = {
  lineName: 100,
  lineNote: 200,
  catalogName: 100,
} as const;

export function clampText(s: string, max: number) {
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  return chars.slice(0, max).join("");
}
export type QuoteStatus = "draft" | "sent" | "archived";

export type QuoteTemplate = "craft" | "studio" | "formal";

/** 全系統統一使用工程施工報價單版型 */
export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplate = "craft";

export interface Profile {
  id: string;
  display_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  brand_color: string;
  default_template: QuoteTemplate;
  default_terms: string | null;
  default_show_tax_id: boolean;
  default_tax_included: boolean;
  default_show_tax_breakdown: boolean;
  seller_tax_id: string | null;
}

export interface CatalogPackageLine {
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface CatalogItem {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  unit_price: number;
  category: string | null;
  keywords: string[];
  sort_order: number;
  item_type?: "single" | "package";
  package_lines?: CatalogPackageLine[] | null;
}

export type QuoteLineType = "group" | "item";

export interface QuoteLine {
  id?: string;
  sort_order: number;
  line_type: QuoteLineType;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  note?: string | null;
}

export interface Quote {
  id: string;
  user_id: string;
  contact_id: string | null;
  title: string;
  template: QuoteTemplate;
  status: QuoteStatus;
  client_name: string;
  client_company: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_tax_id: string | null;
  client_address: string | null;
  show_seller_tax_id: boolean;
  show_buyer_tax_id: boolean;
  seller_tax_id: string | null;
  tax_included: boolean;
  show_tax_breakdown: boolean;
  tax_rate: number;
  valid_until: string | null;
  note: string | null;
  terms: string | null;
  payment_schedule: string | null;
  cover_image_url: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  share_token: string | null;
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
  quote_lines?: QuoteLine[];
}

export function calcQuoteTotals(
  lines: QuoteLine[],
  opts: { tax_included: boolean; show_tax_breakdown: boolean; tax_rate: number },
) {
  const subtotal = lines
    .filter((l) => (l.line_type ?? "item") !== "group")
    .reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  let tax_amount = 0;
  let total = subtotal;
  if (opts.show_tax_breakdown || opts.tax_included) {
    if (opts.tax_included) {
      tax_amount = subtotal - subtotal / (1 + opts.tax_rate);
      total = subtotal;
    } else {
      tax_amount = subtotal * opts.tax_rate;
      total = subtotal + tax_amount;
    }
  }
  return {
    subtotal: round2(subtotal),
    tax_amount: round2(tax_amount),
    total: round2(total),
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Drop blank rows and enforce name / note length limits before save. */
export function prepareQuoteLinesForSave(lines: QuoteLine[]) {
  const kept = lines.filter((l) => l.name.trim());
  let truncated = 0;
  const normalized = kept.map((l, i) => {
    const name = clampText(l.name.trim(), QUOTE_LIMITS.lineName);
    const rawNote = l.note?.trim() || "";
    const note = rawNote ? clampText(rawNote, QUOTE_LIMITS.lineNote) : null;
    if (name.length < l.name.trim().length || (rawNote && note && note.length < rawNote.length)) {
      truncated++;
    }
    return { ...l, sort_order: i, name, note };
  });
  return {
    lines: normalized,
    skipped: lines.length - kept.length,
    truncated,
  };
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatShareExpiry(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function lineShareText(quote: Quote, url: string) {
  return `【報得過】${quote.client_name || "報價單"}\n總計 ${formatMoney(quote.total)}\n${url}`;
}
