import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Link2, Copy, Trash } from "lucide-react";
import {
  createInvite, listInvites, revokeInvite,
  LEVEL_META,
  type TeamInvitation,
} from "@/lib/teams.functions";

export function InviteLinksPanel({ teamId }: { teamId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listInvites);
  const createFn = useServerFn(createInvite);
  const revokeFn = useServerFn(revokeInvite);

  const [level, setLevel] = useState<number>(1);
  const [ttl, setTtl] = useState<number>(24);

  const q = useQuery({
    queryKey: ["team-invites", teamId],
    queryFn: () => listFn({ data: { teamId } }) as Promise<TeamInvitation[]>,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFn({ data: { teamId, role: "editor", level, ttlHours: ttl } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-invites", teamId] }),
    onError: (e: Error) => alert(e.message),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { inviteId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-invites", teamId] }),
    onError: (e: Error) => alert(e.message),
  });

  function inviteUrl(token: string) {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/invite?token=${token}`;
  }

  return (
    <div className="mb-4 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Link2 className="h-4 w-4 text-sky-600" /> 邀請連結
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold outline-none"
        >
          <option value="viewer">瀏覽者</option>
          <option value="editor">編輯者</option>
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold outline-none"
        >
          {[1, 2, 3, 4].map((lv) => (
            <option key={lv} value={lv}>
              {LEVEL_META[lv].label}
            </option>
          ))}
        </select>
        <select
          value={ttl}
          onChange={(e) => setTtl(Number(e.target.value))}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold outline-none"
        >
          <option value={1}>1 小時內有效</option>
          <option value={24}>24 小時內有效</option>
          <option value={168}>7 天內有效</option>
          <option value={0}>永久有效</option>
        </select>
        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="btn-touch inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60"
        >
          {createMut.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Link2 className="h-3 w-3" />
          )}
          產生邀請連結
        </button>
      </div>

      {q.isLoading ? (
        <div className="mt-3 grid place-items-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (q.data ?? []).length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {q.data!.map((inv) => {
            const url = inviteUrl(inv.token);
            const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
            const used = !!inv.used_at;
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
              >
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    used
                      ? "bg-muted text-muted-foreground"
                      : expired
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {used ? "已使用" : expired ? "已過期" : "有效"}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {inv.role === "editor" ? "編輯者" : "瀏覽者"} · L{inv.level}
                </span>
                <code className="flex-1 min-w-[180px] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {url}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      alert("已複製連結！");
                    } catch {
                      alert(url);
                    }
                  }}
                  className="grid h-7 w-7 place-items-center rounded-md hover:bg-secondary"
                  title="複製連結"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("確定撤銷此邀請連結？")) revokeMut.mutate(inv.id);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                  title="撤銷"
                >
                  <Trash className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 text-[11px] text-muted-foreground">
          尚未產生任何邀請連結。設定好權限與時效後，點上方按鈕產生連結並分享給對方。
        </div>
      )}
    </div>
  );
}
