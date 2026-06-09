import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shield, Trash2, UserPlus, Loader2, Crown, UserMinus, AlertTriangle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { adminListUsers, adminDeleteUser, adminSetRole, adminCreateUser } from "@/lib/admin.functions";
import { adminGrantMembership, adminListMemberships, adminRevokeSubscription } from "@/lib/membership.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "管理員面板 — 施工紀錄 PRO" }] }),
  component: AdminPage,
});

function AdminPage() {
  const nav = useNavigate();
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  useEffect(() => {
    if (!checking && isAdmin === false) nav({ to: "/profile" });
  }, [checking, isAdmin, nav]);

  const listFn = useServerFn(adminListUsers);
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const setRoleFn = useServerFn(adminSetRole);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn({}),
    enabled: isAdmin === true,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["is-admin"] });
  };

  const createMut = useMutation({
    mutationFn: (input: { email: string; password: string; displayName?: string; makeAdmin?: boolean }) =>
      createFn({ data: input }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (targetUserId: string) => deleteFn({ data: { targetUserId } }),
    onSuccess: invalidate,
  });
  const roleMut = useMutation({
    mutationFn: (v: { targetUserId: string; role: "admin" | "user"; grant: boolean }) => setRoleFn({ data: v }),
    onSuccess: invalidate,
  });

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);

  // Membership grant
  const grantFn = useServerFn(adminGrantMembership);
  const listMembershipsFn = useServerFn(adminListMemberships);
  const revokeFn = useServerFn(adminRevokeSubscription);
  const { data: memberships = [], refetch: refetchMems } = useQuery({
    queryKey: ["admin-memberships"],
    queryFn: () => listMembershipsFn({}),
    enabled: isAdmin === true,
  });
  const grantMut = useMutation({
    mutationFn: (v: { targetUserId: string; planSeats: 3 | 6 | 9 | 12; days: number }) => grantFn({ data: v }),
    onSuccess: () => { refetchMems(); qc.invalidateQueries({ queryKey: ["my-membership"] }); },
  });
  const revokeMut = useMutation({
    mutationFn: (subscriptionId: string) => revokeFn({ data: { subscriptionId } }),
    onSuccess: () => { refetchMems(); qc.invalidateQueries({ queryKey: ["my-membership"] }); },
  });
  const [grantUser, setGrantUser] = useState<string>("");
  const [grantSeats, setGrantSeats] = useState<3 | 6 | 9 | 12>(3);
  const [grantDays, setGrantDays] = useState(30);

  if (checking) {
    return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;
  }
  if (!isAdmin) return null;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">管理員面板</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">控管會員帳號、權限與資料存取。客服收件夾已移至頂部導覽列。</p>


      <section className="card-surface mt-6 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4" /> 新增會員</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email || pwd.length < 6) {
              alert("請輸入 Email 與至少 6 碼密碼");
              return;
            }
            createMut.mutate(
              { email, password: pwd, displayName: name || undefined, makeAdmin },
              {
                onSuccess: () => {
                  setEmail(""); setPwd(""); setName(""); setMakeAdmin(false);
                },
                onError: (err: any) => alert(err.message ?? "建立失敗"),
              },
            );
          }}
        >
          <input className={inp} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inp} placeholder="密碼（至少 6 碼）" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          <input className={inp} placeholder="顯示名稱（可選）" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} />
            設為管理員
          </label>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="btn-touch col-span-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            建立會員
          </button>
        </form>
      </section>

      <section className="card-surface mt-4 p-5">
        <h2 className="text-sm font-bold">會員列表（{users.length}）</h2>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">載入中…</div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {users.map((u: any) => {
              const isAdminUser = u.roles.includes("admin");
              const isSelf = u.id === me;
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{u.display_name || u.email}</span>
                      {isAdminUser && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <Crown className="h-3 w-3" /> ADMIN
                        </span>
                      )}
                      {isSelf && <span className="text-[10px] text-muted-foreground">（你）</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-[11px] text-muted-foreground">
                      註冊：{new Date(u.created_at).toLocaleDateString("zh-TW")}
                      {u.last_sign_in_at && ` · 上次登入：${new Date(u.last_sign_in_at).toLocaleDateString("zh-TW")}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isSelf && (
                      <button
                        onClick={() =>
                          roleMut.mutate(
                            { targetUserId: u.id, role: "admin", grant: !isAdminUser },
                            { onError: (e: any) => alert(e.message) },
                          )
                        }
                        disabled={roleMut.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-60"
                      >
                        {isAdminUser ? <><UserMinus className="h-3.5 w-3.5" /> 取消管理</> : <><Crown className="h-3.5 w-3.5" /> 設為管理</>}
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => {
                          if (confirm(`確定刪除會員「${u.email}」？此操作會同時刪除其所有案件、照片與資料，無法復原。`)) {
                            deleteMut.mutate(u.id, { onError: (e: any) => alert(e.message) });
                          }
                        }}
                        disabled={deleteMut.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-card px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 刪除
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

const inp = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
