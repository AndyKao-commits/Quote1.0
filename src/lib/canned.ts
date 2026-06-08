import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function useCannedResponses(enabled = true) {
  return useQuery({
    queryKey: ["canned-responses"],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("canned_responses")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CannedResponse[];
    },
  });
}

export function useSaveCanned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { title: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const { error } = await (supabase as any)
        .from("canned_responses")
        .insert({ title: v.title, content: v.content, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canned-responses"] }),
  });
}

export function useDeleteCanned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("canned_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canned-responses"] }),
  });
}
