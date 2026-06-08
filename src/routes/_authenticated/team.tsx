import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Users, Loader2, Plus, UserPlus, Trash2, Crown, Pencil, Eye, Edit3, Check, X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyTeams, createTeam, renameTeam, deleteTeam,
  listTeamMembers, inviteMember, removeMember, changeMemberRole, changeMemberLevel,
  createInvite, listInvites, revokeInvite,
  LEVEL_META,
  type Team, type TeamMember, type TeamInvitation,
} from "@/lib/teams.functions";
import { Link2, Copy, Trash } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "團隊管理 — 施工紀錄 PRO" }] }),
  component: TeamPage,
});

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  owner: {
    label: "主持人",
    icon: <Crown className="h-3 w-3" />,
    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  editor: {
    label: "編輯者",
    icon: <Edit3 className="h-3 w-3" />,
    cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  viewer: {
    label: "瀏覽者",
    icon: <Eye className="h-3 w-3" />,
    cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
};

function TeamPage() {
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then((r) => setMe(r.data.user?.id ?? null));
  }, []);

  const listFn = useServerFn(listMyTeams);
  const createFn = useServerFn(createTeam);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => listFn({}) as Promise<Team[]>,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeId && teams.length > 0) setActiveId(teams[0].id);
  }, [teams, activeId]);

  const [newName, setNewName] = useState("");
  const createMut = useMutation({
    mutationFn: () => createFn({ data: { name: newName.trim() } }),
    onSuccess: (t: any) => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["my-teams"] });
      setActiveId(t.id);
    },
    onError: (e: Error) => alert(e.message),
  });

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">團隊管理</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        建立團隊、邀請註冊會員，共同管理案件。主持人可指派編輯或瀏覽權限。
      </p>

      {/* Create team */}
      <form
        className="card-surface mb-4 flex flex-wrap items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim() || createMut.isPending) return;
          createMut.mutate();
        }}
      >
        <Plus className="h-4 w-4 text-primary" />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="輸入團隊名稱（例：水電一班 / 屋頂工程組）"
          maxLength={60}
          className="flex-1 min-w-[180px] rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createMut.isPending}
          className="btn-touch rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "建立團隊"}
        </button>
      </form>

      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card-surface px-6 py-12 text-center text-sm text-muted-foreground">
          您還沒有加入任何團隊。建立一個新團隊，或請朋友邀請您。
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`group inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  activeId === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                {t.name}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeId === t.id ? "bg-primary-foreground/20" : "bg-muted"
                  }`}
                >
                  {t.member_count}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] ${ROLE_META[t.my_role].cls}`}
                >
                  {ROLE_META[t.my_role].icon} {ROLE_META[t.my_role].label}
                </span>
              </button>
            ))}
          </div>

          {/* Active team panel */}
          {activeId && me && (
            <TeamPanel
              team={teams.find((x) => x.id === activeId)!}
              me={me}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

function TeamPanel({ team, me }: { team: Team; me: string }) {
  const qc = useQueryClient();
  const isOwner = team.my_role === "owner";

  const listMembersFn = useServerFn(listTeamMembers);
  const inviteFn = useServerFn(inviteMember);
  const removeFn = useServerFn(removeMember);
  const changeRoleFn = useServerFn(changeMemberRole);
  const renameFn = useServerFn(renameTeam);
  const deleteFn = useServerFn(deleteTeam);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", team.id],
    queryFn: () => listMembersFn({ data: { teamId: team.id } }) as Promise<TeamMember[]>,
  });

  const invKey = ["team-members", team.id];
  const inviteMut = useMutation({
    mutationFn: (p: { email: string; role: "editor" | "viewer" }) =>
      inviteFn({ data: { teamId: team.id, email: p.email, role: p.role } }),
    onSuccess: () => {
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: invKey });
      qc.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (e: Error) => alert(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (uid: string) => removeFn({ data: { teamId: team.id, userId: uid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKey });
      qc.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (e: Error) => alert(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (p: { uid: string; role: "editor" | "viewer" }) =>
      changeRoleFn({ data: { teamId: team.id, userId: p.uid, role: p.role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKey }),
    onError: (e: Error) => alert(e.message),
  });
  const levelFn = useServerFn(changeMemberLevel);
  const levelMut = useMutation({
    mutationFn: (p: { uid: string; level: number }) =>
      levelFn({ data: { teamId: team.id, userId: p.uid, level: p.level } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKey }),
    onError: (e: Error) => alert(e.message),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(team.name);
  useEffect(() => setNameDraft(team.name), [team.name, team.id]);
  const renameMut = useMutation({
    mutationFn: () => renameFn({ data: { teamId: team.id, name: nameDraft.trim() } }),
    onSuccess: () => {
      setEditingName(false);
      qc.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (e: Error) => alert(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { teamId: team.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  return (
    <section className="card-surface p-4 md:p-5">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => renameMut.mutate()}
              disabled={!nameDraft.trim() || renameMut.isPending}
              className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground hover:brightness-110"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setEditingName(false); setNameDraft(team.name); }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold md:text-xl">{team.name}</h2>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                title="重新命名"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        <span className="text-xs text-muted-foreground">{team.member_count} 位成員</span>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定刪除團隊「${team.name}」？團隊內案件不會被刪除，但會解除指派。`)) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" /> 解散
          </button>
        )}
      </header>

      {/* Invite */}
      {isOwner && (
        <form
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!inviteEmail.trim() || inviteMut.isPending) return;
            inviteMut.mutate({ email: inviteEmail.trim(), role: inviteRole });
          }}
        >
          <UserPlus className="h-4 w-4 text-primary" />
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="邀請已註冊會員的 Email"
            className="flex-1 min-w-[200px] rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            className="rounded-lg border border-input bg-background px-2 py-2 text-xs font-semibold outline-none"
          >
            <option value="editor">編輯者（可建立案件）</option>
            <option value="viewer">瀏覽者（僅瀏覽）</option>
          </select>
          <button
            type="submit"
            disabled={!inviteEmail.trim() || inviteMut.isPending}
            className="btn-touch rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
          >
            {inviteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "邀請"}
          </button>
        </form>
      )}

      {/* Invite links */}
      {isOwner && <InviteLinksPanel teamId={team.id} />}



      {/* Members */}
      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar name={m.display_name ?? m.email ?? "?"} path={m.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {m.display_name || m.email || m.user_id.slice(0, 8)}
                  {m.user_id === me && (
                    <span className="ml-1 text-[10px] text-muted-foreground">（我）</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{m.email || "—"}</div>
              </div>
              {isOwner && m.role !== "owner" ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <select
                      value={m.role}
                      onChange={(e) => roleMut.mutate({ uid: m.user_id, role: e.target.value as any })}
                      disabled={roleMut.isPending}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold outline-none"
                      title="角色（影響案件權限）"
                    >
                      <option value="editor">編輯者</option>
                      <option value="viewer">瀏覽者</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`將「${m.display_name || m.email}」從團隊移除？`)) {
                          removeMut.mutate(m.user_id);
                        }
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      title="移除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <select
                    value={m.level}
                    onChange={(e) => levelMut.mutate({ uid: m.user_id, level: Number(e.target.value) })}
                    disabled={levelMut.isPending}
                    className="rounded-lg border border-input bg-background px-2 py-0.5 text-[11px] font-semibold outline-none"
                    title="權限等級"
                  >
                    {[1, 2, 3, 4].map((lv) => (
                      <option key={lv} value={lv}>{LEVEL_META[lv].label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_META[m.role].cls}`}>
                    {ROLE_META[m.role].icon} {ROLE_META[m.role].label}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {LEVEL_META[m.level]?.label ?? `L${m.level}`}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        <strong>權限等級說明：</strong>
        <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((lv) => (
            <li key={lv}>
              <span className="font-bold text-foreground">{LEVEL_META[lv].label}</span>：{LEVEL_META[lv].desc}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InviteLinksPanel({ teamId }: { teamId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listInvites);
  const createFn = useServerFn(createInvite);
  const revokeFn = useServerFn(revokeInvite);

  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [level, setLevel] = useState<number>(1);
  const [ttl, setTtl] = useState<number>(24);

  const q = useQuery({
    queryKey: ["team-invites", teamId],
    queryFn: () => listFn({ data: { teamId } }) as Promise<TeamInvitation[]>,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFn({ data: { teamId, role, level, ttlHours: ttl } }),
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
