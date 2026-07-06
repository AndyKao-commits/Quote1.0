import { calcQuoteTotals, clampPriceAdjustPct, DEFAULT_QUOTE_TEMPLATE, type QuoteLine } from "@/lib/quotes.types";
import { DEFAULT_QUOTE_TERMS, formatPaymentScheduleText } from "@/lib/quote-document.utils";
import { getSampleQuote, type SampleQuoteId } from "@/lib/landing-demo-quotes";
import { DEMO_CATALOG_ITEMS } from "@/lib/demo-catalog";
import { localDb } from "@/lib/local-first/db";
import { assertCanEdit, assertCanImport } from "@/lib/local-first/gate";
import { scheduleAutoCloudBackup } from "@/lib/local-first/auto-backup";
import { getStoredLicense } from "@/lib/local-first/license";
import { randomId } from "@/lib/local-first/random-id";

function notifyDataChanged() {
  scheduleAutoCloudBackup();
}

function uid() {
  return randomId();
}

function nowIso() {
  return new Date().toISOString();
}

function requireUserId() {
  const license = getStoredLicense();
  if (!license?.userId) throw new Error("請先登入");
  return license.userId;
}

export async function ensureLocalProfile() {
  const userId = requireUserId();
  const existing = await localDb.profiles.get(userId);
  if (existing) return existing;
  const license = getStoredLicense()!;
  const profile = {
    id: userId,
    display_name: license.email.split("@")[0],
    company_name: "",
    phone: null,
    email: license.email,
    logo_url: null,
    brand_color: "#C45A3C",
    default_template: DEFAULT_QUOTE_TEMPLATE,
    default_terms: DEFAULT_QUOTE_TERMS,
    default_show_tax_id: false,
    default_tax_included: false,
    default_show_tax_breakdown: false,
    seller_tax_id: null,
  };
  await localDb.profiles.put(profile);
  return profile;
}

export async function getLocalProfile() {
  const userId = requireUserId();
  return (await localDb.profiles.get(userId)) ?? ensureLocalProfile();
}

export async function updateLocalProfile(patch: Partial<Awaited<ReturnType<typeof ensureLocalProfile>>>) {
  assertCanEdit();
  const userId = requireUserId();
  const cur = await ensureLocalProfile();
  const next = { ...cur, ...patch, id: userId };
  await localDb.profiles.put(next);
  notifyDataChanged();
  return { ok: true as const };
}

export async function listLocalQuotes() {
  const userId = requireUserId();
  return localDb.quotes.where("user_id").equals(userId).reverse().sortBy("updated_at");
}

export async function getLocalQuote(id: string) {
  const userId = requireUserId();
  const quote = await localDb.quotes.get(id);
  if (!quote || quote.user_id !== userId) throw new Error("找不到報價");
  const lines = await localDb.quoteLines.where("quote_id").equals(id).sortBy("sort_order");
  return { ...quote, quote_lines: lines };
}

export async function createLocalQuote() {
  assertCanEdit();
  const userId = requireUserId();
  const profile = await ensureLocalProfile();
  const id = uid();
  const ts = nowIso();
  const lines: QuoteLine[] = [
    { sort_order: 0, line_type: "group", name: "泥作工程", unit: "—", quantity: 0, unit_price: 0 },
    { sort_order: 1, line_type: "item", name: "地坪整平", unit: "式", quantity: 1, unit_price: 0 },
  ];
  const tax_included = profile.default_tax_included ?? false;
  const show_tax_breakdown = profile.default_show_tax_breakdown ?? true;
  const totals = calcQuoteTotals(lines, { tax_included, show_tax_breakdown, tax_rate: 0.05 });
  const quote = {
    id,
    user_id: userId,
    contact_id: null,
    title: "工程施工報價單",
    template: DEFAULT_QUOTE_TEMPLATE,
    status: "draft" as const,
    client_name: "",
    client_company: null,
    client_phone: null,
    client_email: null,
    client_tax_id: null,
    client_address: null,
    show_seller_tax_id: profile.default_show_tax_id ?? false,
    show_buyer_tax_id: profile.default_show_tax_id ?? false,
    seller_tax_id: profile.seller_tax_id,
    tax_included,
    show_tax_breakdown,
    tax_rate: 0.05,
    valid_until: null,
    note: null,
    terms: profile.default_terms?.trim() || DEFAULT_QUOTE_TERMS,
    payment_schedule: null,
    price_adjust_pct: 0,
    cover_image_url: null,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    share_token: null,
    share_expires_at: null,
    created_at: ts,
    updated_at: ts,
  };
  await localDb.quotes.put(quote);
  await localDb.quoteLines.bulkPut(
    lines.map((l, i) => ({
      ...l,
      id: uid(),
      quote_id: id,
      user_id: userId,
      sort_order: i,
      note: null,
    })),
  );
  notifyDataChanged();
  return { id };
}

export async function createLocalSampleQuote(sampleId: SampleQuoteId) {
  assertCanEdit();
  const userId = requireUserId();
  const sample = getSampleQuote(sampleId);
  if (!sample) throw new Error("找不到範例報價");
  const profile = await ensureLocalProfile();
  const tax_included = profile.default_tax_included ?? false;
  const show_tax_breakdown = profile.default_show_tax_breakdown ?? true;
  const totals = calcQuoteTotals(sample.lines, { tax_included, show_tax_breakdown, tax_rate: 0.05 });
  const payment_schedule = formatPaymentScheduleText(totals.total);
  const id = uid();
  const ts = nowIso();
  const quote = {
    id,
    user_id: userId,
    contact_id: null,
    title: sample.title,
    template: DEFAULT_QUOTE_TEMPLATE,
    status: "draft" as const,
    client_name: sample.client_name,
    client_company: sample.client_company ?? null,
    client_phone: sample.client_phone ?? null,
    client_email: null,
    client_tax_id: null,
    client_address: sample.client_address ?? null,
    show_seller_tax_id: profile.default_show_tax_id ?? false,
    show_buyer_tax_id: profile.default_show_tax_id ?? false,
    seller_tax_id: profile.seller_tax_id,
    tax_included,
    show_tax_breakdown,
    tax_rate: 0.05,
    valid_until: null,
    note: null,
    terms: profile.default_terms?.trim() || DEFAULT_QUOTE_TERMS,
    payment_schedule,
    price_adjust_pct: 0,
    cover_image_url: null,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    share_token: null,
    share_expires_at: null,
    created_at: ts,
    updated_at: ts,
  };
  await localDb.quotes.put(quote);
  await localDb.quoteLines.bulkPut(
    sample.lines.map((l, i) => ({
      ...l,
      id: uid(),
      quote_id: id,
      user_id: userId,
      sort_order: i,
      line_type: l.line_type ?? "item",
      note: l.note ?? null,
    })),
  );
  notifyDataChanged();
  return { id };
}

export async function duplicateLocalQuote(id: string) {
  assertCanEdit();
  const userId = requireUserId();
  const src = await getLocalQuote(id);
  const newId = uid();
  const ts = nowIso();
  const { quote_lines, ...rest } = src;
  const quote = {
    ...rest,
    id: newId,
    title: `${rest.title}（複本）`,
    status: "draft" as const,
    share_token: null,
    share_expires_at: null,
    created_at: ts,
    updated_at: ts,
  };
  await localDb.quotes.put(quote);
  await localDb.quoteLines.bulkPut(
    quote_lines.map((l, i) => ({
      ...l,
      id: uid(),
      quote_id: newId,
      user_id: userId,
      sort_order: i,
    })),
  );
  notifyDataChanged();
  return { id: newId };
}

export async function saveLocalQuote(input: {
  id?: string;
  title: string;
  client_name: string;
  client_company?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  client_tax_id?: string | null;
  client_address?: string | null;
  show_seller_tax_id: boolean;
  show_buyer_tax_id: boolean;
  seller_tax_id?: string | null;
  tax_included: boolean;
  show_tax_breakdown: boolean;
  tax_rate: number;
  valid_until?: string | null;
  note?: string | null;
  terms?: string | null;
  payment_schedule?: string | null;
  price_adjust_pct?: number;
  cover_image_url?: string | null;
  lines: QuoteLine[];
}) {
  assertCanEdit();
  const userId = requireUserId();
  const quoteId = input.id || uid();
  const existing = input.id ? await localDb.quotes.get(input.id) : null;
  const ts = nowIso();
  const totals = calcQuoteTotals(input.lines, {
    tax_included: input.tax_included,
    show_tax_breakdown: input.show_tax_breakdown,
    tax_rate: input.tax_rate,
  });
  const quote = {
    id: quoteId,
    user_id: userId,
    contact_id: existing?.contact_id ?? null,
    title: input.title,
    template: existing?.template ?? DEFAULT_QUOTE_TEMPLATE,
    status: existing?.status ?? ("draft" as const),
    client_name: input.client_name,
    client_company: input.client_company ?? null,
    client_phone: input.client_phone ?? null,
    client_email: input.client_email ?? null,
    client_tax_id: input.client_tax_id ?? null,
    client_address: input.client_address ?? null,
    show_seller_tax_id: input.show_seller_tax_id,
    show_buyer_tax_id: input.show_buyer_tax_id,
    seller_tax_id: input.seller_tax_id ?? null,
    tax_included: input.tax_included,
    show_tax_breakdown: input.show_tax_breakdown,
    tax_rate: input.tax_rate,
    valid_until: input.valid_until ?? null,
    note: input.note ?? null,
    terms: input.terms ?? null,
    payment_schedule: input.payment_schedule ?? null,
    price_adjust_pct: clampPriceAdjustPct(input.price_adjust_pct ?? 0),
    cover_image_url: input.cover_image_url ?? existing?.cover_image_url ?? null,
    share_token: null,
    share_expires_at: null,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await localDb.quotes.put(quote);
  await localDb.quoteLines.where("quote_id").equals(quoteId).delete();
  await localDb.quoteLines.bulkPut(
    input.lines.map((l, i) => ({
      ...l,
      id: l.id || uid(),
      quote_id: quoteId,
      user_id: userId,
      sort_order: l.sort_order ?? i,
      line_type: l.line_type ?? "item",
    })),
  );
  notifyDataChanged();
  return getLocalQuote(quoteId);
}

export async function deleteLocalQuote(id: string) {
  assertCanEdit();
  const userId = requireUserId();
  const quote = await localDb.quotes.get(id);
  if (!quote || quote.user_id !== userId) throw new Error("找不到報價");
  await localDb.quoteLines.where("quote_id").equals(id).delete();
  await localDb.quotes.delete(id);
  notifyDataChanged();
  return { ok: true as const };
}

export async function listLocalCatalog() {
  const userId = requireUserId();
  return localDb.catalogItems.where("user_id").equals(userId).sortBy("sort_order");
}

export async function saveLocalCatalogItem(data: {
  id?: string;
  name: string;
  unit?: string;
  unit_price?: number;
  category?: string | null;
  keywords?: string[];
  item_type?: "single" | "package";
  package_lines?: Array<{ name: string; unit: string; quantity: number; unit_price: number }>;
}) {
  assertCanEdit();
  const userId = requireUserId();
  const isPackage = data.item_type === "package";
  if (isPackage && (!data.package_lines || data.package_lines.length === 0)) {
    throw new Error("套餐至少需要一筆項目");
  }
  const row = {
    user_id: userId,
    name: data.name,
    unit: isPackage ? "式" : (data.unit ?? "式"),
    unit_price: isPackage ? 0 : (data.unit_price ?? 0),
    category: data.category ?? null,
    keywords: data.keywords ?? [],
    item_type: data.item_type ?? ("single" as const),
    package_lines: isPackage ? data.package_lines : null,
  };
  if (data.id) {
    await localDb.catalogItems.update(data.id, row);
    notifyDataChanged();
    return { id: data.id };
  }
  const id = uid();
  const maxSort = await localDb.catalogItems
    .where("user_id")
    .equals(userId)
    .toArray()
    .then((rows) => rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1));
  await localDb.catalogItems.put({ ...row, id, sort_order: maxSort + 1 });
  notifyDataChanged();
  return { id };
}

export async function deleteLocalCatalogItem(id: string) {
  assertCanEdit();
  const userId = requireUserId();
  const item = await localDb.catalogItems.get(id);
  if (!item || item.user_id !== userId) throw new Error("找不到項目");
  await localDb.catalogItems.delete(id);
  notifyDataChanged();
  return { ok: true as const };
}

export async function bulkDeleteLocalCatalogItems(ids: string[]) {
  assertCanEdit();
  const userId = requireUserId();
  const items = await localDb.catalogItems.where("user_id").equals(userId).toArray();
  const idSet = new Set(ids);
  const toDelete = items.filter((i) => idSet.has(i.id));
  await localDb.catalogItems.bulkDelete(toDelete.map((i) => i.id));
  notifyDataChanged();
  return { ok: true as const, deleted: toDelete.length };
}

export async function seedLocalDemoCatalog() {
  assertCanEdit();
  const userId = requireUserId();
  const existing = await localDb.catalogItems.where("user_id").equals(userId).toArray();
  const existingNames = new Set(existing.map((r) => r.name));
  const maxSort = existing.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1);
  const toInsert = DEMO_CATALOG_ITEMS.filter((it) => !existingNames.has(it.name)).map((it, i) => ({
    ...it,
    id: uid(),
    user_id: userId,
    sort_order: maxSort + 1 + i,
  }));
  if (!toInsert.length) {
    return { ok: true as const, added: 0, message: "範例項目已全部在項目庫中" };
  }
  const packages = toInsert.filter((it) => it.item_type === "package").length;
  const singles = toInsert.filter((it) => it.item_type === "single").length;
  const detail =
    packages && singles
      ? `（${packages} 組套餐、${singles} 項單品）`
      : packages
        ? `（${packages} 組套餐）`
        : "";
  await localDb.catalogItems.bulkPut(toInsert);
  notifyDataChanged();
  return { ok: true as const, added: toInsert.length, message: `已載入 ${toInsert.length} 項範例項目${detail}` };
}

export async function bulkImportLocalCatalog(items: Array<{
  name: string;
  unit: string;
  unit_price: number;
  category?: string | null;
  keywords?: string[];
}>) {
  assertCanImport();
  const userId = requireUserId();
  const existing = await localDb.catalogItems.where("user_id").equals(userId).toArray();
  const existingNames = new Set(existing.map((r) => r.name));
  const maxSort = existing.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1);
  const toInsert: Array<{
    id: string;
    user_id: string;
    name: string;
    unit: string;
    unit_price: number;
    category: string | null;
    keywords: string[];
    sort_order: number;
    item_type: "single";
    package_lines: null;
  }> = [];
  let skipped = 0;
  items.forEach((it) => {
    if (existingNames.has(it.name)) {
      skipped++;
      return;
    }
    existingNames.add(it.name);
    toInsert.push({
      id: uid(),
      user_id: userId,
      name: it.name,
      unit: it.unit,
      unit_price: it.unit_price,
      category: it.category ?? null,
      keywords: it.keywords ?? [],
      sort_order: maxSort + 1 + toInsert.length,
      item_type: "single",
      package_lines: null,
    });
  });
  if (!toInsert.length) {
    return {
      ok: true as const,
      added: 0,
      skipped,
      message: skipped ? `共 ${skipped} 項已存在，未新增` : "沒有可匯入的項目",
    };
  }
  await localDb.catalogItems.bulkPut(toInsert);
  notifyDataChanged();
  const msg =
    skipped > 0
      ? `已新增 ${toInsert.length} 項，略過 ${skipped} 項重複名稱`
      : `已匯入 ${toInsert.length} 項`;
  return { ok: true as const, added: toInsert.length, skipped, message: msg };
}

export async function exportLocalBackup() {
  const userId = requireUserId();
  const [profile, quotes, lines, catalog] = await Promise.all([
    localDb.profiles.where("id").equals(userId).toArray(),
    localDb.quotes.where("user_id").equals(userId).toArray(),
    localDb.quoteLines.where("user_id").equals(userId).toArray(),
    localDb.catalogItems.where("user_id").equals(userId).toArray(),
  ]);
  return {
    version: 1,
    exportedAt: nowIso(),
    userId,
    profile,
    quotes,
    quoteLines: lines,
    catalogItems: catalog,
  };
}

export async function importLocalBackup(payload: Awaited<ReturnType<typeof exportLocalBackup>>) {
  assertCanImport();
  const userId = requireUserId();
  if (payload.userId !== userId) throw new Error("存檔與目前帳號不符");
  await localDb.transaction("rw", localDb.profiles, localDb.quotes, localDb.quoteLines, localDb.catalogItems, async () => {
    if (payload.profile?.[0]) await localDb.profiles.put(payload.profile[0]);
    for (const q of payload.quotes) await localDb.quotes.put(q);
    for (const l of payload.quoteLines) await localDb.quoteLines.put(l);
    for (const c of payload.catalogItems) await localDb.catalogItems.put(c);
  });
  notifyDataChanged();
}
