import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Plus, User, MessageCircle, Shield, Inbox, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useProfile, useSupportUnreadCount } from "@/lib/db";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { HeaderAvatarButton } from "./HeaderAvatarButton";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { data: unread = 0 } = useSupportUnreadCount(isAdmin === true);
  const brand = profile?.brand_name?.trim() || "現場紀錄";
  const isActive = (p: string) =>
    p === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(p);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <HeaderAvatarButton />
            <Link to="/dashboard" className="leading-tight">
              <span className="block font-display text-base font-bold tracking-tight">{brand}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Field Log</span>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" label="儀表板" icon={<LayoutDashboard className="h-4 w-4" />} active={isActive("/dashboard")} />
            <NavLink to="/projects" label="案件" icon={<FolderKanban className="h-4 w-4" />} active={isActive("/projects")} />
            <NavLink to="/team" label="團隊管理" icon={<Users className="h-4 w-4" />} active={isActive("/team")} />
            <NavLink to="/support" label="AI 客服" icon={<MessageCircle className="h-4 w-4" />} active={isActive("/support")} />
            {isAdmin && (
              <>
                <NavLink to="/admin" label="管理員" icon={<Shield className="h-4 w-4" />} active={isActive("/admin") && !isActive("/admin/inbox")} />
                <NavLink
                  to="/admin/inbox"
                  label="客服收件夾"
                  icon={<Inbox className="h-4 w-4" />}
                  active={isActive("/admin/inbox")}
                  badge={unread > 0 ? unread : undefined}
                />
              </>
            )}
            <NavLink to="/profile" label="個人" icon={<User className="h-4 w-4" />} active={isActive("/profile")} />
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/projects/new"
              className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> 新增案件
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl">
          <BottomLink to="/dashboard" label="儀表板" icon={<LayoutDashboard className="h-5 w-5" />} active={pathname === "/dashboard"} />
          <BottomLink to="/projects" label="案件" icon={<FolderKanban className="h-5 w-5" />} active={isActive("/projects") && !pathname.startsWith("/projects/new")} />
          <BottomLink to="/projects/new" label="新增" icon={<Plus className="h-5 w-5" />} active={pathname === "/projects/new"} primary />
          <BottomLink
            to="/support"
            label="客服"
            icon={<MessageCircle className="h-5 w-5" />}
            active={isActive("/support")}
          />
          <BottomLink
            to="/team"
            label="團隊"
            icon={<Users className="h-5 w-5" />}
            active={isActive("/team")}
          />
          {isAdmin && (
            <BottomLink
              to="/admin/inbox"
              label="收件夾"
              icon={<Inbox className="h-5 w-5" />}
              active={isActive("/admin/inbox")}
              badge={unread > 0 ? unread : undefined}
            />
          )}
          <BottomLink
            to="/profile"
            label="個人"
            icon={<User className="h-5 w-5" />}
            active={isActive("/profile") || (!isAdmin && isActive("/admin"))}
          />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ to, label, icon, active, badge }: { to: string; label: string; icon: ReactNode; active: boolean; badge?: number }) {
  return (
    <Link
      to={to}
      className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon} {label}
      {badge ? (
        <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function BottomLink({ to, label, icon, active, primary, badge }: { to: string; label: string; icon: ReactNode; active: boolean; primary?: boolean; badge?: number }) {
  return (
    <Link
      to={to}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
        primary ? "text-primary" : active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className={`relative grid h-9 w-9 place-items-center rounded-lg ${primary ? "bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]" : active ? "bg-secondary" : ""}`}>
        {icon}
        {badge ? (
          <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
