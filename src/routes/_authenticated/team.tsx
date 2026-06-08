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
  listTeamMembers, inviteMember, removeMember, changeMemberRole,
  type Team, type TeamMember,
} from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "團隊管理 — 現場紀錄" }] }),
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
                <div className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={(e) => roleMut.mutate({ uid: m.user_id, role: e.target.value as any })}
                    disabled={roleMut.isPending}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold outline-none"
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
              ) : (
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_META[m.role].cls}`}>
                  {ROLE_META[m.role].icon} {ROLE_META[m.role].label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        <strong>權限說明：</strong>主持人可邀請/管理成員與案件；編輯者可瀏覽與建立團隊案件；瀏覽者僅能瀏覽團隊案件。
      </div>
    </section>
  );
}
