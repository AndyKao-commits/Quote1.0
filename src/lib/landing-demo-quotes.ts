import type { QuoteLine } from "@/lib/quotes.types";
import { DEFAULT_QUOTE_TERMS, formatPaymentScheduleText } from "@/lib/quote-document.utils";
import { calcQuoteTotals } from "@/lib/quotes.types";

export type LandingDemoQuote = {
  id: string;
  tabLabel: string;
  hint: string;
  title: string;
  client_name: string;
  client_company: string | null;
  client_address: string;
  client_phone: string;
  lines: QuoteLine[];
  total: number;
  paymentLine: string;
};

function buildDemo(
  id: string,
  tabLabel: string,
  hint: string,
  meta: {
    title: string;
    client_name: string;
    client_company?: string;
    client_address: string;
    client_phone: string;
  },
  lines: QuoteLine[],
): LandingDemoQuote {
  const totals = calcQuoteTotals(lines, {
    tax_included: false,
    show_tax_breakdown: true,
    tax_rate: 0.05,
  });
  const payment = formatPaymentScheduleText(totals.total);
  const firstPayment = payment.split("\n")[0] ?? "";
  return {
    id,
    tabLabel,
    hint,
    title: meta.title,
    client_name: meta.client_name,
    client_company: meta.client_company ?? null,
    client_address: meta.client_address,
    client_phone: meta.client_phone,
    lines,
    total: totals.total,
    paymentLine: firstPayment,
  };
}

const demo1Lines: QuoteLine[] = [
  { sort_order: 0, line_type: "group", name: "拆除工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 1, line_type: "item", name: "浴室敲除清運", unit: "式", quantity: 1, unit_price: 18000 },
  { sort_order: 2, line_type: "group", name: "防水工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 3, line_type: "item", name: "浴室防水施作", unit: "式", quantity: 1, unit_price: 28000 },
  { sort_order: 4, line_type: "group", name: "泥作工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 5, line_type: "item", name: "地坪整平", unit: "式", quantity: 1, unit_price: 22000 },
  { sort_order: 6, line_type: "group", name: "衛浴設備", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 7, line_type: "item", name: "馬桶＋面盆組", unit: "式", quantity: 1, unit_price: 35000, note: "含安裝" },
];

const demo2Lines: QuoteLine[] = [
  { sort_order: 0, line_type: "group", name: "泥作工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 1, line_type: "item", name: "全室地坪整平", unit: "式", quantity: 1, unit_price: 85000 },
  { sort_order: 2, line_type: "item", name: "浴室磁磚鋪設", unit: "式", quantity: 1, unit_price: 62000 },
  { sort_order: 3, line_type: "group", name: "木作工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 4, line_type: "item", name: "玄關櫃體", unit: "尺", quantity: 8, unit_price: 3500 },
  { sort_order: 5, line_type: "item", name: "臥室系統櫃", unit: "尺", quantity: 24, unit_price: 3200 },
  { sort_order: 6, line_type: "group", name: "水電工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 7, line_type: "item", name: "全室配管配線", unit: "式", quantity: 1, unit_price: 128000 },
  { sort_order: 8, line_type: "group", name: "油漆工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 9, line_type: "item", name: "全室批土粉刷", unit: "式", quantity: 1, unit_price: 95000 },
  { sort_order: 10, line_type: "group", name: "衛浴設備", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 11, line_type: "item", name: "主浴衛浴套組", unit: "式", quantity: 1, unit_price: 185000 },
  { sort_order: 12, line_type: "group", name: "廚房工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 13, line_type: "item", name: "廚具＋檯面", unit: "式", quantity: 1, unit_price: 220000 },
  { sort_order: 14, line_type: "group", name: "地坪工程", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 15, line_type: "item", name: "超耐磨地板", unit: "坪", quantity: 18, unit_price: 4500 },
  { sort_order: 16, line_type: "group", name: "設計監工", unit: "—", quantity: 0, unit_price: 0 },
  { sort_order: 17, line_type: "item", name: "設計與工程監造", unit: "式", quantity: 1, unit_price: 120000 },
];

export type SampleQuoteId = "bathroom" | "full-home";

export const SAMPLE_QUOTES: LandingDemoQuote[] = [
  buildDemo(
    "bathroom",
    "範例一：浴室翻新",
    "小坪數局部工程，適合初次接案練習欄位與輸出。",
    {
      title: "浴室翻新報價單",
      client_name: "林小姐",
      client_address: "台北市大安區復興南路一段…",
      client_phone: "0912-345-678",
    },
    demo1Lines,
  ),
  buildDemo(
    "full-home",
    "範例二：全室整修",
    "多工種、多頁明細，觀察摘要頁與分頁效果。",
    {
      title: "工程施工報價單",
      client_name: "陳先生",
      client_company: "創意限制",
      client_address: "新北市汐止區新台五路一段…",
      client_phone: "0987-984-221",
    },
    demo2Lines,
  ),
];

/** @deprecated 使用 SAMPLE_QUOTES */
export const LANDING_DEMO_QUOTES = SAMPLE_QUOTES;

export function getSampleQuote(id: string) {
  return SAMPLE_QUOTES.find((d) => d.id === id);
}

export function toQuotePreview(demo: LandingDemoQuote) {
  const totals = calcQuoteTotals(demo.lines, {
    tax_included: false,
    show_tax_breakdown: true,
    tax_rate: 0.05,
  });
  return {
    title: demo.title,
    client_name: demo.client_name,
    client_company: demo.client_company,
    client_address: demo.client_address,
    client_phone: demo.client_phone,
    template: "craft" as const,
    tax_included: false,
    show_tax_breakdown: true,
    tax_rate: 0.05,
    terms: DEFAULT_QUOTE_TERMS,
    payment_schedule: formatPaymentScheduleText(totals.total),
    ...totals,
  };
}
