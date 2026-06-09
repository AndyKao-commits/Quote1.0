import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ShareSettings {
  is_share_enabled: boolean;
  share_token: string | null;
  share_show_amounts: boolean;
  share_show_materials: boolean;
}

async function assertOwner(supabase: any, projectId: string, userId: string) {
  const { data, error } = await supabase
    .from("projects").select("user_id").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.user_id !== userId) throw new Error("無權限");
}

export const getShareSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertOwner(supabase, data.projectId, userId);
    const { data: row, error } = await supabase
      .from("projects")
      .select("is_share_enabled, share_token, share_show_amounts, share_show_materials")
      .eq("id", data.projectId)
      .single();
    if (error) throw new Error(error.message);
    return row as ShareSettings;
  });

function genToken() {
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = Math.random().toString(36).slice(2, 10);
  return (a + b).slice(0, 40);
}

export const updateShareSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      enabled: z.boolean().optional(),
      showAmounts: z.boolean().optional(),
      showMaterials: z.boolean().optional(),
      regenerate: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertOwner(supabase, data.projectId, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cur } = await (supabaseAdmin as any)
      .from("projects")
      .select("share_token, is_share_enabled")
      .eq("id", data.projectId)
      .single();

    const patch: Record<string, unknown> = {};
    if (data.enabled !== undefined) {
      patch.is_share_enabled = data.enabled;
      if (data.enabled && !cur?.share_token) patch.share_token = genToken();
    }
    if (data.regenerate) patch.share_token = genToken();
    if (data.showAmounts !== undefined) patch.share_show_amounts = data.showAmounts;
    if (data.showMaterials !== undefined) patch.share_show_materials = data.showMaterials;

    const { data: row, error } = await (supabaseAdmin as any)
      .from("projects")
      .update(patch)
      .eq("id", data.projectId)
      .select("is_share_enabled, share_token, share_show_amounts, share_show_materials")
      .single();
    if (error) throw new Error(error.message);
    return row as ShareSettings;
  });

// ----- Public guest view -----
export interface SharedPhoto {
  id: string;
  category: "before" | "during" | "after";
  taken_at: string;
  created_at: string;
  note: string | null;
  url: string;
}
export interface SharedLog {
  id: string;
  date: string;
  content: string;
  hours: number;
  workers: string | null;
  note: string | null;
}
export interface SharedMaterial {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  quantity: number;
  unit_price: number | null;
}
export interface SharedProjectView {
  project: {
    id: string;
    name: string;
    customer_name: string;
    address: string;
    start_date: string;
    expected_end_date: string | null;
    scope: string | null;
    status: "pending" | "active" | "review" | "done";
  };
  show_amounts: boolean;
  show_materials: boolean;
  logs: SharedLog[];
  photos: SharedPhoto[];
  materials: SharedMaterial[];
}

export const getSharedProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(16).max(80) }).parse(d))
  .handler(async ({ data }): Promise<SharedProjectView> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: project, error } = await (supabaseAdmin as any)
      .from("projects")
      .select("id, name, customer_name, address, start_date, expected_end_date, scope, status, is_share_enabled, share_show_amounts, share_show_materials")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project || !project.is_share_enabled) throw new Error("分享連結無效或已關閉");

    const [{ data: logs }, { data: photos }, { data: materials }] = await Promise.all([
      (supabaseAdmin as any).from("work_logs")
        .select("id, date, content, hours, workers, note")
        .eq("project_id", project.id)
        .order("date", { ascending: false }),
      (supabaseAdmin as any).from("photos")
        .select("id, category, taken_at, created_at, note, storage_path")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      project.share_show_materials
        ? (supabaseAdmin as any).from("materials")
            .select("id, name, brand, unit, quantity, unit_price")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const photoList: SharedPhoto[] = [];
    for (const p of (photos ?? []) as any[]) {
      const { data: signed } = await (supabaseAdmin as any).storage
        .from("photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 6);
      if (signed?.signedUrl) {
        photoList.push({
          id: p.id,
          category: p.category,
          taken_at: p.taken_at,
          created_at: p.created_at,
          note: p.note,
          url: signed.signedUrl,
        });
      }
    }

    const materialList: SharedMaterial[] = ((materials ?? []) as any[]).map((m) => ({
      id: m.id,
      name: m.name,
      brand: m.brand,
      unit: m.unit,
      quantity: m.quantity,
      unit_price: project.share_show_amounts ? Number(m.unit_price) : null,
    }));

    return {
      project: {
        id: project.id,
        name: project.name,
        customer_name: project.customer_name,
        address: project.address,
        start_date: project.start_date,
        expected_end_date: project.expected_end_date,
        scope: project.scope,
        status: project.status,
      },
      show_amounts: project.share_show_amounts,
      show_materials: project.share_show_materials,
      logs: (logs ?? []) as SharedLog[],
      photos: photoList,
      materials: materialList,
    };
  });
