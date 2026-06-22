import { createClient } from "@supabase/supabase-js";
import type { QuoteDatabase } from "@/integrations/supabase/quote-types";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient<QuoteDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUserId(token: string | undefined) {
  if (!token) throw new Error("請先登入");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("登入已過期，請重新登入");
  return data.user.id;
}
