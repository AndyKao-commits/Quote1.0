import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, Shield, Eye, HardHat, Wrench, Crown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { listTeamMembers, updateMemberLevel, type TeamMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "團隊管理 — 現場紀錄" }] }),
  component: TeamPage,
});

const LEVELS: Record<number, { label: string; desc: string; color: string; icon: React.ReactNode }> = {
  1: {
    label: "業主",
    desc: "僅能瀏覽案件與報告",
    color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  2: {
    label: "工人",
    desc: "可建立案件、上傳照片與日誌",
    color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  3: {
    label: "工地主任",
    desc: "可管理案件並協助回覆客服",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: <HardHat className="h-3.5 w-3.5" />,
  },
  4: {
    label: "管理員",
    desc: "最高權限，可管理會員與所有資料",
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    icon: <Crown className="h-3.5 w-3.5" />,
  },
};

function TeamPage() {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const listFn = useServerFn(listTeamMembers);
  const updFn = useServerFn(updateMemberLevel);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn({}),
  });

  const updMut = useMutation({
    mutationFn: (p: { targetUserId: string; level: number }) => updFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
    onError: (e: Error) => alert(e.message),
  });

  const grouped = [4, 3, 2, 1].map((lvl) => ({
    lvl,
    items: members.filter((m) => (m.is_admin ? 4 : m.permission_level) === lvl),
  }));

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">團隊管理</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <Shield className="h-3 w-3" /> 測試版
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        檢視所有成員與其權限等級。{isAdmin ? "管理員可調整成員的權限級別。" : "僅管理員可以調整權限。"}
      </p>

      {/* Permission legend */}
      <section className="card-surface mt-4 p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">權限等級說明</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((lvl) => {
            const L = LEVELS[lvl];
            return (
              <div key={lvl} className={`rounded-lg border px-3 py-2.5 ${L.color}`}>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {L.icon} L{lvl} · {L.label}
                </div>
                <div className="mt-0.5 text-[11px] opacity-80">{L.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Members grouped by level */}
      <section className="mt-5">
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ lvl, items }) => (
              <div key={lvl}>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${LEVELS[lvl].color}`}>
                    {LEVELS[lvl].icon} L{lvl} {LEVELS[lvl].label}
                  </span>
                  <span className="text-muted-foreground">（{items.length}）</span>
                </div>
                {items.length === 0 ? (
                  <div className="card-surface px-4 py-3 text-xs text-muted-foreground">尚無此等級成員</div>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((m) => (
                      <MemberCard
                        key={m.user_id}
                        m={m}
                        canEdit={!!isAdmin && !m.is_admin}
                        onChange={(level) => updMut.mutate({ targetUserId: m.user_id, level })}
                        pending={updMut.isPending && updMut.variables?.targetUserId === m.user_id}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MemberCard({
  m, canEdit, onChange, pending,
}: {
  m: TeamMember;
  canEdit: boolean;
  onChange: (level: number) => void;
  pending: boolean;
}) {
  const currentLvl = m.is_admin ? 4 : m.permission_level;
  return (
    <li className="card-surface flex items-center gap-3 p-3">
      <Avatar name={m.display_name ?? m.email ?? "?"} path={m.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">
          {m.display_name || m.email || m.user_id.slice(0, 8)}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{m.email || "—"}</div>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-1.5">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <select
            value={currentLvl}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={pending}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {[1, 2, 3].map((l) => (
              <option key={l} value={l}>L{l} · {LEVELS[l].label}</option>
            ))}
          </select>
        </div>
      ) : (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${LEVELS[currentLvl].color}`}>
          {LEVELS[currentLvl].icon} L{currentLvl}
        </span>
      )}
    </li>
  );
}
