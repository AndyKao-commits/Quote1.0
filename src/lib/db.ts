// 雲端資料層：Supabase + React Query
import { supabase } from "@/integrations/supabase/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

export type ProjectStatus = "pending" | "active" | "review" | "done";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  customer_name: string;
  customer_phone?: string | null;
  address: string;
  start_date: string;
  expected_end_date?: string | null;
  scope?: string | null;
  note?: string | null;
  status: ProjectStatus;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLog {
  id: string;
  user_id: string;
  project_id: string;
  date: string;
  content: string;
  hours: number;
  workers?: string | null;
  note?: string | null;
  created_at: string;
}

export type PhotoCategory = "before" | "during" | "after";

export interface Photo {
  id: string;
  user_id: string;
  project_id: string;
  category: PhotoCategory;
  storage_path: string;
  taken_at: string;
  note?: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  brand?: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  note?: string | null;
  source: "manual" | "scan";
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  brand_name: string | null;
  avatar_url: string | null;
  watermark_enabled: boolean;
  updated_at: string;
}

export const statusLabel = (s: ProjectStatus) =>
  ({ pending: "待施工", active: "施工中", review: "驗收中", done: "已完工" }[s]);

// ---------- Queries ----------
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });
}

export function useLogs(projectId: string) {
  return useQuery({
    queryKey: ["logs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkLog[];
    },
  });
}

export function usePhotos(projectId: string) {
  return useQuery({
    queryKey: ["photos", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
  });
}

export function useMaterials(projectId: string) {
  return useQuery({
    queryKey: ["materials", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

// ---------- Mutations ----------
export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Project> & { name: string; customer_name: string; address: string; start_date: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      if (p.id) {
        const { data, error } = await supabase
          .from("projects").update(p).eq("id", p.id).select().single();
        if (error) throw error;
        return data as Project;
      }
      const { data, error } = await supabase
        .from("projects").insert({ ...p, user_id: user.id, status: p.status ?? "pending" }).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete storage photos for this project first (best-effort)
      const { data: photos } = await supabase.from("photos").select("storage_path").eq("project_id", id);
      if (photos?.length) {
        await supabase.storage.from("photos").remove(photos.map(p => p.storage_path));
      }
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: { project_id: string; date: string; content: string; hours: number; workers?: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const { data, error } = await supabase.from("work_logs").insert({ ...l, user_id: user.id }).select().single();
      if (error) throw error;
      return data as WorkLog;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["logs", data.project_id] }),
  });
}

export function useDeleteLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs", projectId] }),
  });
}

export function useSavePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { project_id: string; category: PhotoCategory; blob: Blob; taken_at: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const path = `${user.id}/${args.project_id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, args.blob, {
        contentType: "image/jpeg", upsert: false,
      });
      if (upErr) throw upErr;
      const { data, error } = await supabase.from("photos").insert({
        user_id: user.id, project_id: args.project_id, category: args.category,
        storage_path: path, taken_at: args.taken_at, note: args.note ?? null,
      }).select().single();
      if (error) throw error;
      return data as Photo;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["photos", data.project_id] }),
  });
}

export function useDeletePhoto(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: Photo) => {
      await supabase.storage.from("photos").remove([photo.storage_path]);
      const { error } = await supabase.from("photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", projectId] }),
  });
}

export function useUpdatePhotoNote(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; note: string }) => {
      const { error } = await supabase.from("photos").update({ note: args.note }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", projectId] }),
  });
}

export function useSaveMaterials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<Omit<Material, "id" | "user_id" | "created_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const rows = items.map((m) => ({ ...m, user_id: user.id }));
      const { error } = await supabase.from("materials").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const pid = vars[0]?.project_id;
      if (pid) qc.invalidateQueries({ queryKey: ["materials", pid] });
    },
  });
}

export function useDeleteMaterial(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", projectId] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Pick<Profile, "display_name" | "brand_name" | "watermark_enabled" | "avatar_url">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const { error } = await (supabase as any).from("profiles").update(p).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// Admin: count of escalated (unanswered) support messages — for navbar red dot
export function useSupportUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ["support-unread-count"],
    enabled,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// Get signed URL for a photo
export async function getPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function usePhotoUrl(path: string | undefined | null) {
  return useQuery({
    queryKey: ["photo-url", path],
    queryFn: () => getPhotoUrl(path!),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
}

export function invalidateAll(qc: QueryClient) {
  qc.invalidateQueries();
}
