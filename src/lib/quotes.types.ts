export type QuoteTemplate = "craft" | "studio" | "formal";
export type QuoteStatus = "draft" | "sent" | "archived";

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

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  address: string | null;
  note: string | null;
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
}

export interface QuoteLine {
  id?: string;
  sort_order: number;
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
  cover_image_url: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  quote_lines?: QuoteLine[];
}

export const templateMeta: Record<
  QuoteTemplate,
  { label: string; desc: string }
> = {
  craft: { label: "工班清楚", desc: "表格清楚，適合師傅與統包" },
  studio: { label: "工作室", desc: "可放 Logo 與照片，適合設計師" },
  formal: { label: "正式文件", desc: "襯線排版，適合對公司報價" },
};

export function calcQuoteTotals(
  lines: QuoteLine[],
  opts: { tax_included: boolean; show_tax_breakdown: boolean; tax_rate: number },
) {
  const subtotal = lines.reduce(
    (s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0),
    0,
  );
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

export function formatMoney(n: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function lineShareText(quote: Quote, url: string) {
  return `【報得過】${quote.client_name || "報價單"}\n總計 ${formatMoney(quote.total)}\n${url}`;
}
