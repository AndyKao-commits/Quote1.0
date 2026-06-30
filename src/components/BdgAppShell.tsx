import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, LogOut, Package, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { getProfile } from "@/lib/quotes.functions";
import { clearSession } from "@/lib/session";

export function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname }) ?? "";
  const isActive = (p: string) => pathname.startsWith(p);
  const profileFn = useServerFn(getProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileFn({}) as Promise<{ logo_url?: string | null; company_name?: string | null; display_name?: string | null } | null>,
    staleTime: 60_000,
  });

  const brandLabel = profile?.company_name || profile?.display_name || "報得過";

  return (
    <div className="bdg-theme min-h-screen">
      <header className="bdg-app-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/quotes" className="flex min-w-0 items-center gap-2.5">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
            ) : (
              <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0 rounded" />
            )}
            <span className="truncate text-lg font-semibold tracking-tight">{brandLabel}</span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            <Nav to="/quotes" label="報價" active={isActive("/quotes")} />
            <Nav to="/items" label="項目庫" active={isActive("/items")} />
            <Nav to="/settings" label="設定" active={isActive("/settings")} />
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearSession();
                nav({ to: "/auth" });
              }}
              className="bdg-btn bdg-btn-secondary px-2.5 sm:px-3"
              title="登出"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">登出</span>
            </button>
            <Link to="/quotes/new" className="bdg-btn bdg-btn-primary">
              新建報價
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-10">{children}</main>
      <nav className="bdg-app-bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-auto flex max-w-lg justify-around px-1">
          <Bottom to="/quotes" label="報價" icon={<FileText className="h-5 w-5" />} active={isActive("/quotes") && !pathname.includes("/new")} />
          <Bottom to="/quotes/new" label="新建" icon={<FileText className="h-5 w-5" />} active={pathname.includes("/new")} primary />
          <Bottom to="/items" label="項目" icon={<Package className="h-5 w-5" />} active={isActive("/items")} />
          <Bottom to="/settings" label="設定" icon={<Settings className="h-5 w-5" />} active={isActive("/settings")} />
        </div>
      </nav>
    </div>
  );
}

function Nav({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--bdg-surface-soft)] text-[var(--bdg-ink)] shadow-sm ring-1 ring-[var(--bdg-line)]"
          : "text-[var(--bdg-muted)] hover:text-[var(--bdg-ink)]"
      }`}
    >
      {label}
    </Link>
  );
}

function Bottom({ to, label, icon, active, primary }: { to: string; label: string; icon: ReactNode; active: boolean; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
        primary || active ? "text-[var(--bdg-brand)]" : "text-[var(--bdg-muted)]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
