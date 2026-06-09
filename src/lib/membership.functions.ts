import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("無管理員權限");
}

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: expiryData } = await supabase.rpc("current_membership_expiry", { _user: userId });
    const expires_at: string | null = expiryData ?? null;
    const active = !!expires_at && new Date(expires_at) > new Date();

    const { data: owned = [] } = await supabase
      .from("subscriptions")
      .select("id, plan_seats, starts_at, expires_at, created_at, note")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });

    const ownedIds = (owned ?? []).map((s: any) => s.id);
    let codes: any[] = [];
    if (ownedIds.length) {
      const { data } = await supabase
        .from("subscription_codes")
        .select("id, subscription_id, code, redeemed_by, redeemed_at")
        .in("subscription_id", ownedIds);
      codes = data ?? [];
    }

    const { data: redeemed = [] } = await supabase
      .from("subscription_codes")
      .select("id, code, redeemed_at, subscription:subscriptions(id, expires_at, owner_user_id)")
      .eq("redeemed_by", userId);

    return { active, expires_at, owned, codes, redeemed };
  });

export const redeemMembershipCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const code = data.code.trim().toUpperCase();
    if (!code) throw new Error("請輸入序號");
    const { data: res, error } = await supabase.rpc("redeem_subscription_code", { _code: code });
    if (error) throw new Error(error.message);
    return res;
  });

export const adminGrantMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; planSeats: 3 | 6 | 9 | 12; days?: number; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const days = data.days && data.days > 0 ? data.days : 30;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires = new Date(Date.now() + days * 86400000).toISOString();
    const { data: sub, error } = await (supabaseAdmin as any)
      .from("subscriptions")
      .insert({
        owner_user_id: data.targetUserId,
        plan_seats: data.planSeats,
        expires_at: expires,
        created_by_admin: true,
        note: data.note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Generate codes
    const rows = [];
    for (let i = 0; i < data.planSeats; i++) {
      const { data: codeData, error: cerr } = await (supabaseAdmin as any).rpc("gen_subscription_code");
      if (cerr) throw new Error(cerr.message);
      rows.push({ subscription_id: sub.id, code: codeData });
    }
    const { error: ierr } = await (supabaseAdmin as any).from("subscription_codes").insert(rows);
    if (ierr) throw new Error(ierr.message);

    return { id: sub.id };
  });

export const adminListMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs = [] } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("id, owner_user_id, plan_seats, starts_at, expires_at, created_at, note, created_by_admin")
      .order("created_at", { ascending: false })
      .limit(200);
    return subs ?? [];
  });

export const adminRevokeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("subscriptions").delete().eq("id", data.subscriptionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
