import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireQuoteAuth } from "@/lib/quote-auth-middleware";
import { calcQuoteTotals, DEFAULT_QUOTE_TEMPLATE, type QuoteLine, QUOTE_LIMITS } from "@/lib/quotes.types";
import { DEFAULT_QUOTE_TERMS, formatPaymentScheduleText } from "@/lib/quote-document.utils";
import { getSampleQuote, type SampleQuoteId } from "@/lib/landing-demo-quotes";
import {
  assertNotRateLimited,
  recordRateLimitFailure,
  shareLookupBucket,
} from "@/lib/rate-limit.server";
import { DEMO_CATALOG_ITEMS } from "@/lib/demo-catalog";

export { DEMO_CATALOG_ITEMS };

const CATALOG_PACKAGES_MIGRATION_HINT =
  "請至 Supabase Dashboard → SQL Editor，執行專案內 supabase/add-catalog-packages.sql，完成後重新整理再試。";

function throwCatalogDbError(error: { message?: string }) {
  const msg = error.message ?? "資料庫錯誤";
  if (msg.includes("item_type") || msg.includes("package_lines")) {
    throw new Error(`項目庫尚未啟用套餐功能。${CATALOG_PACKAGES_MIGRATION_HINT}`);
  }
  throw new Error(msg);
}

const lineSchema = z.object({
  id: z.string().optional(),
  sort_order: z.number(),
  line_type: z.enum(["group", "item"]).optional().default("item"),
  name: z.string().min(1).max(QUOTE_LIMITS.lineName),
  unit: z.string(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  note: z.string().max(QUOTE_LIMITS.lineNote).nullable().optional(),
});

const quoteInput = z.object({
  id: z.string().optional(),
  title: z.string(),
  client_name: z.string(),
  client_company: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_email: z.string().nullable().optional(),
  client_tax_id: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  show_seller_tax_id: z.boolean(),
  show_buyer_tax_id: z.boolean(),
  seller_tax_id: z.string().nullable().optional(),
  tax_included: z.boolean(),
  show_tax_breakdown: z.boolean(),
  tax_rate: z.number(),
  valid_until: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  payment_schedule: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  lines: z.array(lineSchema),
});

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

const SHARE_VALID_DAYS = 90;

function shareExpiresAtFromNow() {
  return new Date(Date.now() + SHARE_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function extendShareExpiry(current: string | null | undefined) {
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  return new Date(base.getTime() + SHARE_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(
    z.object({
      display_name: z.string().nullable().optional(),
      company_name: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      logo_url: z.string().nullable().optional(),
      brand_color: z.string().optional(),
      default_terms: z.string().nullable().optional(),
      default_show_tax_id: z.boolean().optional(),
      default_tax_included: z.boolean().optional(),
      default_show_tax_breakdown: z.boolean().optional(),
      seller_tax_id: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCatalogItems = createServerFn({ method: "GET" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const catalogPackageLineSchema = z.object({
  name: z.string().min(1).max(QUOTE_LIMITS.lineName),
  unit: z.string(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
});

export const saveCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(QUOTE_LIMITS.catalogName),
      unit: z.string().optional(),
      unit_price: z.number().optional(),
      category: z.string().nullable().optional(),
      keywords: z.array(z.string()).optional(),
      item_type: z.enum(["single", "package"]).default("single"),
      package_lines: z.array(catalogPackageLineSchema).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
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
      item_type: data.item_type,
      package_lines: isPackage ? data.package_lines : null,
    };
    if (data.id) {
      const { error } = await supabase.from("catalog_items").update(row).eq("id", data.id).eq("user_id", userId);
      if (error) throwCatalogDbError(error);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabase.from("catalog_items").insert(row).select("id").single();
    if (error) throwCatalogDbError(error);
    return { id: inserted.id };
  });

export const deleteCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("catalog_items").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkDeleteCatalogItems = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ ids: z.array(z.string()).min(1).max(200) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("catalog_items").delete().eq("user_id", userId).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getQuote = createServerFn({ method: "GET" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("找不到報價單");
    const { data: lines } = await supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", data.id)
      .order("sort_order");
    return { ...quote, quote_lines: lines ?? [] };
  });

export const getQuoteByShareToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const shareBucket = shareLookupBucket(request);
    await assertNotRateLimited(shareBucket);

    const { getSupabaseAdmin } = await import("@/lib/supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote?.share_token) {
      await recordRateLimitFailure(shareBucket);
      throw new Error("連結已失效或已過期");
    }
    if (quote.share_expires_at && new Date(quote.share_expires_at) < new Date()) {
      throw new Error("分享連結已過期");
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", quote.user_id).maybeSingle();
    const { data: lines } = await supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quote.id)
      .order("sort_order");
    return { quote, profile, lines: lines ?? [] };
  });

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({}).optional())
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    const lines: QuoteLine[] = [
      { sort_order: 0, line_type: "group", name: "泥作工程", unit: "—", quantity: 0, unit_price: 0 },
      { sort_order: 1, line_type: "item", name: "地坪整平", unit: "式", quantity: 1, unit_price: 0 },
    ];
    const tax_included = profile?.default_tax_included ?? false;
    const show_tax_breakdown = profile?.default_show_tax_breakdown ?? true;
    const totals = calcQuoteTotals(lines, { tax_included, show_tax_breakdown, tax_rate: 0.05 });

    const { data: inserted, error } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        title: "工程施工報價單",
        template: DEFAULT_QUOTE_TEMPLATE,
        client_name: "",
        show_seller_tax_id: profile?.default_show_tax_id ?? false,
        show_buyer_tax_id: profile?.default_show_tax_id ?? false,
        seller_tax_id: profile?.seller_tax_id ?? null,
        tax_included,
        show_tax_breakdown,
        tax_rate: 0.05,
        terms: profile?.default_terms?.trim() || DEFAULT_QUOTE_TERMS,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total: totals.total,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const quoteId = inserted.id as string;
    const { error: lineErr } = await supabase.from("quote_lines").insert(
      lines.map((l, i) => ({
        quote_id: quoteId,
        user_id: userId,
        sort_order: i,
        line_type: l.line_type,
        name: l.name,
        unit: l.unit,
        quantity: l.quantity,
        unit_price: l.unit_price,
        note: null,
      })),
    );
    if (lineErr) throw new Error(lineErr.message);

    return { id: quoteId };
  });

export const createSampleQuote = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ sampleId: z.enum(["bathroom", "full-home"]) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const sample = getSampleQuote(data.sampleId as SampleQuoteId);
    if (!sample) throw new Error("找不到範例報價");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const tax_included = profile?.default_tax_included ?? false;
    const show_tax_breakdown = profile?.default_show_tax_breakdown ?? true;
    const totals = calcQuoteTotals(sample.lines, { tax_included, show_tax_breakdown, tax_rate: 0.05 });
    const payment_schedule = formatPaymentScheduleText(totals.total);

    const quoteRowBase = {
      user_id: userId,
      title: sample.title,
      template: DEFAULT_QUOTE_TEMPLATE,
      client_name: sample.client_name,
      client_company: sample.client_company,
      client_phone: sample.client_phone,
      client_address: sample.client_address,
      show_seller_tax_id: profile?.default_show_tax_id ?? false,
      show_buyer_tax_id: profile?.default_show_tax_id ?? false,
      seller_tax_id: profile?.seller_tax_id ?? null,
      tax_included,
      show_tax_breakdown,
      tax_rate: 0.05,
      terms: profile?.default_terms?.trim() || DEFAULT_QUOTE_TERMS,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
    };

    let { data: inserted, error } = await supabase
      .from("quotes")
      .insert({ ...quoteRowBase, payment_schedule })
      .select("id")
      .single();
    if (error?.message?.includes("payment_schedule")) {
      ({ data: inserted, error } = await supabase.from("quotes").insert(quoteRowBase).select("id").single());
    }
    if (error) throw new Error(error.message);

    const quoteId = inserted.id as string;
    const { error: lineErr } = await supabase.from("quote_lines").insert(
      sample.lines.map((l, i) => ({
        quote_id: quoteId,
        user_id: userId,
        sort_order: i,
        line_type: l.line_type,
        name: l.name,
        unit: l.unit,
        quantity: l.quantity,
        unit_price: l.unit_price,
        note: l.note ?? null,
      })),
    );
    if (lineErr) throw new Error(lineErr.message);

    return { id: quoteId };
  });

export const saveQuote = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(quoteInput)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const totals = calcQuoteTotals(data.lines as QuoteLine[], {
      tax_included: data.tax_included,
      show_tax_breakdown: data.show_tax_breakdown,
      tax_rate: data.tax_rate,
    });
    const quoteRowBase = {
      user_id: userId,
      title: data.title,
      template: DEFAULT_QUOTE_TEMPLATE,
      client_name: data.client_name,
      client_company: data.client_company ?? null,
      client_phone: data.client_phone ?? null,
      client_email: data.client_email ?? null,
      client_tax_id: data.client_tax_id ?? null,
      client_address: data.client_address ?? null,
      show_seller_tax_id: data.show_seller_tax_id,
      show_buyer_tax_id: data.show_buyer_tax_id,
      seller_tax_id: data.seller_tax_id ?? null,
      tax_included: data.tax_included,
      show_tax_breakdown: data.show_tax_breakdown,
      tax_rate: data.tax_rate,
      valid_until: data.valid_until ?? null,
      note: data.note ?? null,
      terms: data.terms ?? null,
      cover_image_url: data.cover_image_url ?? null,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
    };

    const quoteRowWithPayment = {
      ...quoteRowBase,
      payment_schedule: data.payment_schedule ?? null,
    };

    let quoteId = data.id;
    if (quoteId) {
      let { error } = await supabase.from("quotes").update(quoteRowWithPayment).eq("id", quoteId).eq("user_id", userId);
      if (error?.message?.includes("payment_schedule")) {
        ({ error } = await supabase.from("quotes").update(quoteRowBase).eq("id", quoteId).eq("user_id", userId));
      }
      if (error) throw new Error(error.message);
      await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    } else {
      let { data: inserted, error } = await supabase.from("quotes").insert(quoteRowWithPayment).select("id").single();
      if (error?.message?.includes("payment_schedule")) {
        ({ data: inserted, error } = await supabase
          .from("quotes")
          .insert(quoteRowBase)
          .select("id")
          .single());
      }
      if (error) throw new Error(error.message);
      quoteId = inserted.id;
    }

    const lineRows = data.lines.map((l, i) => ({
      quote_id: quoteId,
      user_id: userId,
      sort_order: i,
      line_type: l.line_type ?? "item",
      name: l.name,
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.unit_price,
      note: l.note ?? null,
    }));
    if (lineRows.length) {
      const { error } = await supabase.from("quote_lines").insert(lineRows);
      if (error) throw new Error(error.message);
    }
    return { id: quoteId };
  });

export const duplicateQuote = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (error || !quote) throw new Error("找不到報價單");
    const { data: lines } = await supabase.from("quote_lines").select("*").eq("quote_id", data.id).order("sort_order");
    const { id: _id, share_token: _t, created_at: _c, updated_at: _u, ...rest } = quote;
    const { data: inserted, error: insErr } = await supabase
      .from("quotes")
      .insert({ ...rest, user_id: userId, status: "draft", share_token: null, title: `${quote.title}（複本）` })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    if (lines?.length) {
      await supabase.from("quote_lines").insert(
        lines.map((l: any) => ({
          quote_id: inserted.id,
          user_id: userId,
          sort_order: l.sort_order,
          line_type: l.line_type ?? "item",
          name: l.name,
          unit: l.unit,
          quantity: l.quantity,
          unit_price: l.unit_price,
          note: l.note,
        })),
      );
    }
    return { id: inserted.id };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("quotes").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishShare = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: quote, error: readErr } = await supabase
      .from("quotes")
      .select("share_token, share_expires_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!quote) throw new Error("找不到報價");

    const token = quote.share_token ?? randomToken();
    const updates: Record<string, unknown> = { share_token: token, status: "sent" };
    if (!quote.share_expires_at) {
      updates.share_expires_at = shareExpiresAtFromNow();
    }

    const { error } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return {
      token,
      reused: Boolean(quote.share_token),
      share_expires_at: (quote.share_expires_at as string | null) ?? (updates.share_expires_at as string),
    };
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase
      .from("quotes")
      .update({ share_token: null, share_expires_at: null, status: "draft" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renewShare = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: quote, error: readErr } = await supabase
      .from("quotes")
      .select("share_token, share_expires_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!quote?.share_token) throw new Error("尚未建立分享連結");

    const share_expires_at = extendShareExpiry(quote.share_expires_at);
    const { error } = await supabase
      .from("quotes")
      .update({ share_expires_at })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { share_expires_at };
  });

export const seedDemoCatalog = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: existing, error: listErr } = await supabase
      .from("catalog_items")
      .select("name, sort_order")
      .eq("user_id", userId);
    if (listErr) throw new Error(listErr.message);

    const existingNames = new Set((existing ?? []).map((r: { name: string }) => r.name));
    const maxSort = (existing ?? []).reduce((m: number, r: { sort_order: number }) => Math.max(m, r.sort_order ?? 0), -1);
    const toInsert = DEMO_CATALOG_ITEMS.filter((it) => !existingNames.has(it.name)).map((it, i) => ({
      ...it,
      user_id: userId,
      sort_order: maxSort + 1 + i,
    }));

    if (!toInsert.length) {
      return { ok: true, added: 0, message: "示範項目已全部在項目庫中" };
    }

    const packages = toInsert.filter((it) => it.item_type === "package").length;
    const singles = toInsert.filter((it) => it.item_type === "single").length;
    const detail =
      packages && singles
        ? `（${packages} 組套餐、${singles} 項單品）`
        : packages
          ? `（${packages} 組套餐）`
          : "";

    const { error } = await supabase.from("catalog_items").insert(toInsert);
    if (error) throwCatalogDbError(error);
    return { ok: true, added: toInsert.length, message: `已載入 ${toInsert.length} 項示範項目${detail}` };
  });

const catalogImportRow = z.object({
  name: z.string().min(1).max(QUOTE_LIMITS.catalogName),
  unit: z.string(),
  unit_price: z.number().min(0),
  category: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
});

export const bulkImportCatalog = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ items: z.array(catalogImportRow).min(1).max(500) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: existing, error: listErr } = await supabase
      .from("catalog_items")
      .select("name, sort_order")
      .eq("user_id", userId);
    if (listErr) throw new Error(listErr.message);

    const existingNames = new Set((existing ?? []).map((r: { name: string }) => r.name));
    const maxSort = (existing ?? []).reduce((m: number, r: { sort_order: number }) => Math.max(m, r.sort_order ?? 0), -1);

    const toInsert: Array<{
      user_id: string;
      name: string;
      unit: string;
      unit_price: number;
      category: string | null;
      keywords: string[];
      sort_order: number;
    }> = [];
    let skipped = 0;

    data.items.forEach((it) => {
      if (existingNames.has(it.name)) {
        skipped++;
        return;
      }
      existingNames.add(it.name);
      toInsert.push({
        user_id: userId,
        name: it.name,
        unit: it.unit,
        unit_price: it.unit_price,
        category: it.category ?? null,
        keywords: it.keywords ?? [],
        sort_order: maxSort + 1 + toInsert.length,
      });
    });

    if (!toInsert.length) {
      return { ok: true, added: 0, skipped, message: skipped ? `共 ${skipped} 項已存在，未新增` : "沒有可匯入的項目" };
    }

    const { error } = await supabase.from("catalog_items").insert(toInsert);
    if (error) throw new Error(error.message);
    const msg =
      skipped > 0
        ? `已匯入 ${toInsert.length} 項，略過 ${skipped} 項重複名稱`
        : `已匯入 ${toInsert.length} 項`;
    return { ok: true, added: toInsert.length, skipped, message: msg };
  });
