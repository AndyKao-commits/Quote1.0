import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Plus, Wrench, User } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useProfile } from "@/lib/db";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const brand = profile?.brand_name?.trim() || "現場紀錄";
  const isActive = (p: string) =>
    p === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(p);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-bold tracking-tight">{brand}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Field Log</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" label="儀表板" icon={<LayoutDashboard className="h-4 w-4" />} active={isActive("/dashboard")} />
            <NavLink to="/projects" label="案件" icon={<FolderKanban className="h-4 w-4" />} active={isActive("/projects")} />
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
          <BottomLink to="/profile" label="個人" icon={<User className="h-5 w-5" />} active={isActive("/profile")} />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon} {label}
    </Link>
  );
}

function BottomLink({ to, label, icon, active, primary }: { to: string; label: string; icon: ReactNode; active: boolean; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
        primary ? "text-primary" : active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${primary ? "bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]" : active ? "bg-secondary" : ""}`}>
        {icon}
      </span>
      {label}
    </Link>
  );
}
