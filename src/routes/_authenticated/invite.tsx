import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { Loader2, Users, Check, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { previewInvite, acceptInvite, LEVEL_META } from "@/lib/teams.functions";

const Search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/_authenticated/invite")({
  head: () => ({ meta: [{ title: "團隊邀請 — 施工紀錄 PRO" }] }),
  validateSearch: (s) => Search.parse(s),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useSearch();
  const nav = useNavigate();
  const previewFn = useServerFn(previewInvite);
  const acceptFn = useServerFn(acceptInvite);

  const q = useQuery({
    queryKey: ["invite-preview", token],
    enabled: !!token,
    retry: false,
    queryFn: () => previewFn({ data: { token: token! } }),
  });

  const mut = useMutation({
    mutationFn: () => acceptFn({ data: { token: token! } }),
    onSuccess: (r: any) => {
      alert(`您已成功加入「${r.team_name}」！`);
      nav({ to: "/team" });
    },
    onError: (e: Error) => alert(e.message),
  });

  useEffect(() => {
    if (!token) nav({ to: "/team" });
  }, [token, nav]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <div className="card-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">團隊邀請</h1>
          </div>
          {q.isLoading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : q.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mb-1 inline h-4 w-4" /> {(q.error as Error).message}
            </div>
          ) : q.data ? (
            <>
              <p className="text-sm text-muted-foreground">您被邀請加入以下團隊：</p>
              <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-lg font-bold">{q.data.team_name}</div>
                <div className="mt-2 grid gap-1 text-xs">
                  <div>
                    角色：<span className="font-bold">{q.data.role === "editor" ? "編輯者" : "瀏覽者"}</span>
                  </div>
                  <div>
                    權限等級：<span className="font-bold">{LEVEL_META[q.data.level]?.label ?? `L${q.data.level}`}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="btn-touch mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
              >
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                接受並加入團隊
              </button>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
