import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAccessToken } from "@/lib/session";
import { getSupabaseAdmin, requireUserId } from "@/lib/supabase-admin.server";

export const attachQuoteAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

export const requireQuoteAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const token = request?.headers.get("authorization")?.replace("Bearer ", "");
    const userId = await requireUserId(token);
    const supabase = getSupabaseAdmin();
    return next({ context: { supabase, userId } });
  },
);
