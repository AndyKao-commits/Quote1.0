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

export interface InboxRoom {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  ai_enabled: boolean;
  tags: string[];
  pending: boolean;
}

export const adminListInboxRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await (supabaseAdmin as any)
      .from("support_messages")
      .select("user_id, question, ai_answer, admin_reply, status, tags, created_at, ai_enabled")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const byUser = new Map<string, any[]>();
    for (const r of rows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r);
      byUser.set(r.user_id, arr);
    }
    const userIds = Array.from(byUser.keys());
    if (userIds.length === 0) return [] as InboxRoom[];

    const { data: profiles } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    const profMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profMap.set(p.id, p));

    // emails via auth admin
    const emailMap = new Map<string, string>();
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      list.users.forEach((u: any) => emailMap.set(u.id, u.email ?? ""));
    } catch { /* noop */ }

    const rooms: InboxRoom[] = userIds.map((uid) => {
      const msgs = byUser.get(uid)!;
      const latest = msgs[0];
      const tagSet = new Set<string>();
      msgs.slice(0, 5).forEach((m) => (m.tags ?? []).forEach((t: string) => tagSet.add(t)));
      const unread = msgs.filter((m) => m.status === "escalated" && !m.admin_reply).length;
      const lastText =
        latest.admin_reply || latest.ai_answer || latest.question || "(系統訊息)";
      const prof = profMap.get(uid);
      return {
        user_id: uid,
        display_name: prof?.display_name ?? null,
        email: emailMap.get(uid) ?? "",
        avatar_url: prof?.avatar_url ?? null,
        last_message: lastText.length > 50 ? lastText.slice(0, 50) + "…" : lastText,
        last_message_at: latest.created_at,
        unread_count: unread,
        ai_enabled: latest.ai_enabled !== false,
        tags: Array.from(tagSet).slice(0, 5),
        pending: unread > 0,
      };
    });

    rooms.sort((a, b) => {
      if (a.pending !== b.pending) return a.pending ? -1 : 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
    return rooms;
  });

export const adminGetRoomMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("support_messages")
      .select("*")
      .eq("user_id", data.targetUserId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminPostReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; reply: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const reply = data.reply.trim();
    if (!reply) throw new Error("回覆內容不可為空");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Always insert a new row as latest, and refresh takeover timer.
    const now = new Date().toISOString();
    const { error: insErr } = await (supabaseAdmin as any).from("support_messages").insert({
      user_id: data.targetUserId,
      question: null,
      ai_answer: null,
      admin_reply: reply,
      status: "answered",
      replied_at: now,
      ai_enabled: false,
      takeover_at: now,
      tags: [],
    });
    if (insErr) throw new Error(insErr.message);

    // Mark any earlier escalations as answered so the unread badge clears.
    await (supabaseAdmin as any)
      .from("support_messages")
      .update({ status: "answered" })
      .eq("user_id", data.targetUserId)
      .eq("status", "escalated");

    return { ok: true };
  });

export const adminTakeoverRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; enable: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    if (!data.enable) {
      // Human takeover: disable AI for this user and stamp takeover_at
      await (supabaseAdmin as any)
        .from("support_messages")
        .update({ ai_enabled: false, takeover_at: now })
        .eq("user_id", data.targetUserId);

      await (supabaseAdmin as any).from("support_messages").insert({
        user_id: data.targetUserId,
        question: null,
        ai_answer: null,
        admin_reply: "__TRANSFER_NOTICE__",
        status: "answered",
        replied_at: now,
        ai_enabled: false,
        takeover_at: now,
        tags: ["#系統"],
      });
    } else {
      // Hand back to AI: clear takeover stamp and re-enable
      await (supabaseAdmin as any)
        .from("support_messages")
        .update({ ai_enabled: true, takeover_at: null })
        .eq("user_id", data.targetUserId);
    }
    return { ok: true };
  });

export const adminMarkRoomRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("support_messages")
      .update({ status: "answered" })
      .eq("user_id", data.targetUserId)
      .eq("status", "escalated");
    if (error) throw new Error(error.message);
    return { ok: true };
  });


