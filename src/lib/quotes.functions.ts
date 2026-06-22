import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireQuoteAuth } from "@/lib/quote-auth-middleware";
import { calcQuoteTotals, type QuoteLine, type QuoteTemplate } from "@/lib/quotes.types";

const lineSchema = z.object({
  id: z.string().optional(),
  sort_order: z.number(),
  line_type: z.enum(["group", "item"]).optional().default("item"),
  name: z.string().min(1),
  unit: z.string(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  note: z.string().nullable().optional(),
});

const quoteInput = z.object({
  id: z.string().optional(),
  contact_id: z.string().nullable().optional(),
  title: z.string(),
  template: z.enum(["craft", "studio", "formal"]),
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
  cover_image_url: z.string().nullable().optional(),
  lines: z.array(lineSchema),
});

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
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
      default_template: z.enum(["craft", "studio", "formal"]).optional(),
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

export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveContact = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      company: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      tax_id: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const row = { ...data, user_id: userId };
    delete (row as { id?: string }).id;
    if (data.id) {
      const { error } = await supabase.from("contacts").update(row).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabase.from("contacts").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { error } = await supabase.from("contacts").delete().eq("id", data.id).eq("user_id", userId);
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

export const saveCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .inputValidator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      unit: z.string(),
      unit_price: z.number(),
      category: z.string().nullable().optional(),
      keywords: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const row = {
      user_id: userId,
      name: data.name,
      unit: data.unit,
      unit_price: data.unit_price,
      category: data.category ?? null,
      keywords: data.keywords ?? [],
    };
    if (data.id) {
      const { error } = await supabase.from("catalog_items").update(row).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabase.from("catalog_items").insert(row).select("id").single();
    if (error) throw new Error(error.message);
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
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin.server");
    const supabase = getSupabaseAdmin();
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("連結已失效");
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", quote.user_id).maybeSingle();
    const { data: lines } = await supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quote.id)
      .order("sort_order");
    return { quote, profile, lines: lines ?? [] };
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
    const quoteRow = {
      user_id: userId,
      contact_id: data.contact_id ?? null,
      title: data.title,
      template: data.template as QuoteTemplate,
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

    let quoteId = data.id;
    if (quoteId) {
      const { error } = await supabase.from("quotes").update(quoteRow).eq("id", quoteId).eq("user_id", userId);
      if (error) throw new Error(error.message);
      await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    } else {
      const { data: inserted, error } = await supabase.from("quotes").insert(quoteRow).select("id").single();
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
    const token = randomToken();
    const { error } = await supabase
      .from("quotes")
      .update({ share_token: token, status: "sent" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { token };
  });

export const seedDemoCatalog = createServerFn({ method: "POST" })
  .middleware([requireQuoteAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { count } = await supabase.from("catalog_items").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) > 0) return { ok: true, skipped: true };
    const items = [
      { name: "泥作工程", unit: "式", unit_price: 45000, category: "泥作", keywords: ["泥作", "粉刷"] },
      { name: "防水工程", unit: "式", unit_price: 28000, category: "防水", keywords: ["防水", "浴室"] },
      { name: "木作櫃體", unit: "尺", unit_price: 3500, category: "木作", keywords: ["木作", "櫃子"] },
      { name: "設計監工", unit: "式", unit_price: 60000, category: "設計", keywords: ["設計", "監工"] },
      { name: "清潔收工", unit: "式", unit_price: 8000, category: "其他", keywords: ["清潔", "收工"] },
    ];
    await supabase.from("catalog_items").insert(items.map((it, i) => ({ ...it, user_id: userId, sort_order: i })));
    return { ok: true };
  });
