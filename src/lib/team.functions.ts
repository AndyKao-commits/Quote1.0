import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("無管理員權限");
}

export interface TeamMember {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  permission_level: number; // 1..4
  is_admin: boolean;
  created_at: string | null;
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, display_name, avatar_url, permission_level, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: roles } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id, role");
    const adminSet = new Set<string>(
      (roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id),
    );

    const emailMap = new Map<string, string>();
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      list.users.forEach((u: any) => emailMap.set(u.id, u.email ?? ""));
    } catch { /* noop */ }

    const out: TeamMember[] = (profiles ?? []).map((p: any) => ({
      user_id: p.id,
      display_name: p.display_name ?? null,
      email: emailMap.get(p.id) ?? "",
      avatar_url: p.avatar_url ?? null,
      permission_level: typeof p.permission_level === "number" ? p.permission_level : 2,
      is_admin: adminSet.has(p.id),
      created_at: p.created_at ?? null,
    }));
    // suppress current user context unused
    void context;
    return out;
  });

export const updateMemberLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; level: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const lvl = Math.max(1, Math.min(4, Math.floor(data.level)));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ permission_level: lvl })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
