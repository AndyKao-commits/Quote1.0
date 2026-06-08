import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  my_role: "owner" | "editor" | "viewer";
  member_count: number;
}

export interface TeamMember {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  level: number; // 1-4 permission tier (1=瀏覽業主, 2=工人, 3=工地主任, 4=副管理員)
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export const LEVEL_META: Record<number, { label: string; desc: string }> = {
  1: { label: "L1 業主／瀏覽", desc: "唯讀，可瀏覽團隊案件" },
  2: { label: "L2 工人", desc: "瀏覽 + 新增施工日誌" },
  3: { label: "L3 工地主任", desc: "可新增與編輯團隊案件" },
  4: { label: "L4 副管理員", desc: "近主持人權限" },
};


async function isTeamOwner(supabase: any, teamId: string, userId: string) {
  const { data } = await supabase.from("teams").select("owner_id").eq("id", teamId).maybeSingle();
  return data?.owner_id === userId;
}

export const listMyTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    // teams I belong to (own or member)
    const { data: owned } = await supabase.from("teams").select("*").eq("owner_id", userId);
    const { data: membered } = await supabase
      .from("team_members")
      .select("role, team_id, teams!inner(id, name, owner_id, created_at)")
      .eq("user_id", userId);

    const map = new Map<string, Team>();
    (owned ?? []).forEach((t: any) =>
      map.set(t.id, {
        id: t.id,
        name: t.name,
        owner_id: t.owner_id,
        created_at: t.created_at,
        my_role: "owner",
        member_count: 0,
      }),
    );
    (membered ?? []).forEach((m: any) => {
      const t = m.teams;
      if (!t) return;
      if (!map.has(t.id)) {
        map.set(t.id, {
          id: t.id,
          name: t.name,
          owner_id: t.owner_id,
          created_at: t.created_at,
          my_role: m.role,
          member_count: 0,
        });
      }
    });

    const ids = Array.from(map.keys());
    if (ids.length === 0) return [] as Team[];
    const { data: counts } = await supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", ids);
    const cmap = new Map<string, number>();
    (counts ?? []).forEach((r: any) => cmap.set(r.team_id, (cmap.get(r.team_id) ?? 0) + 1));
    map.forEach((t) => {
      t.member_count = (cmap.get(t.id) ?? 0) + 1; // include owner
    });
    return Array.from(map.values()).sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: t, error } = await supabase
      .from("teams")
      .insert({ name: data.name, owner_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return t;
  });

export const renameTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ teamId: z.string().uuid(), name: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase.from("teams").update({ name: data.name }).eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ teamId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase.from("teams").delete().eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ teamId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: team } = await supabase
      .from("teams")
      .select("owner_id, created_at")
      .eq("id", data.teamId)
      .maybeSingle();
    if (!team) throw new Error("找不到團隊或無權限");

    const { data: rows } = await supabase
      .from("team_members")
      .select("user_id, role, level, created_at")
      .eq("team_id", data.teamId);

    const ids = new Set<string>([team.owner_id, ...(rows ?? []).map((r: any) => r.user_id)]);

    const { data: profiles } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(ids));
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const emailMap = new Map<string, string>();
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      list.users.forEach((u: any) => emailMap.set(u.id, u.email ?? ""));
    } catch {
      /* noop */
    }

    const ownerProfile: any = pmap.get(team.owner_id);
    const out: TeamMember[] = [
      {
        user_id: team.owner_id,
        role: "owner",
        level: 4,
        display_name: ownerProfile?.display_name ?? null,
        avatar_url: ownerProfile?.avatar_url ?? null,
        email: emailMap.get(team.owner_id) ?? "",
        created_at: team.created_at,
      },
      ...(rows ?? [])
        .filter((r: any) => r.user_id !== team.owner_id)
        .map((r: any) => {
          const p: any = pmap.get(r.user_id);
          return {
            user_id: r.user_id,
            role: r.role,
            level: typeof r.level === "number" ? r.level : 2,
            display_name: p?.display_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            email: emailMap.get(r.user_id) ?? "",
            created_at: r.created_at,
          } as TeamMember;
        }),
    ];
    return out;
  });


export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        email: z.string().trim().email().max(200),
        role: z.enum(["editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!(await isTeamOwner(supabase, data.teamId, userId))) {
      throw new Error("只有團隊主持人可以邀請成員");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // find user by email
    let targetId: string | null = null;
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = list.users.find(
        (u: any) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
      );
      if (found) targetId = found.id;
    } catch (e) {
      throw new Error("無法查詢使用者");
    }
    if (!targetId) throw new Error("找不到此 Email 的註冊使用者，請對方先註冊");
    if (targetId === userId) throw new Error("您已經是團隊主持人");

    const { error } = await (supabaseAdmin as any)
      .from("team_members")
      .insert({ team_id: data.teamId, user_id: targetId, role: data.role });
    if (error) {
      if (error.code === "23505") throw new Error("此使用者已在團隊中");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ teamId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!(await isTeamOwner(supabase, data.teamId, userId))) {
      throw new Error("只有團隊主持人可以移除成員");
    }
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", data.teamId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!(await isTeamOwner(supabase, data.teamId, userId))) {
      throw new Error("只有團隊主持人可以變更角色");
    }
    const { error } = await supabase
      .from("team_members")
      .update({ role: data.role })
      .eq("team_id", data.teamId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeMemberLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
        level: z.number().int().min(1).max(4),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!(await isTeamOwner(supabase, data.teamId, userId))) {
      throw new Error("只有團隊主持人可以變更權限等級");
    }
    const { error } = await supabase
      .from("team_members")
      .update({ level: data.level })
      .eq("team_id", data.teamId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
