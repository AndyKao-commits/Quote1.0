import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, History, Package, Settings, User } from "lucide-react";
import type { ReactNode } from "react";
import { getProfile } from "@/lib/quotes.functions";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => pathname.startsWith(p);
  const profileFn = useServerFn(getProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileFn({}) as Promise<{ logo_url?: string | null; company_name?: string | null; display_name?: string | null } | null>,
    staleTime: 60_000,
  });

  const brandLabel = profile?.company_name || profile?.display_name || "報得過";

  return (
    <div className="bdg-theme min-h-screen bg-[#F5F0E8]">
      <header className="sticky top-0 z-40 border-b border-[#e8dfd3] bg-[#F5F0E8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/quotes" className="flex min-w-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-[#1a1612]">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
            )}
            <span className="truncate">{brandLabel}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Nav to="/quotes" label="報價" icon={<FileText className="h-4 w-4" />} active={isActive("/quotes")} />
            <Nav to="/items" label="項目庫" icon={<Package className="h-4 w-4" />} active={isActive("/items")} />
            <Nav to="/contacts" label="聯絡人" icon={<User className="h-4 w-4" />} active={isActive("/contacts")} />
            <Nav to="/settings" label="設定" icon={<Settings className="h-4 w-4" />} active={isActive("/settings")} />
          </nav>
          <Link
            to="/quotes/new"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            style={{ backgroundColor: "var(--bdg-brand, #C45A3C)" }}
          >
            新建報價
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dfd3] bg-[#F5F0E8]/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg justify-around px-2">
          <Bottom to="/quotes" label="報價" icon={<History className="h-5 w-5" />} active={isActive("/quotes") && !pathname.includes("/new")} />
          <Bottom to="/quotes/new" label="新建" icon={<FileText className="h-5 w-5" />} active={pathname.includes("/new")} primary />
          <Bottom to="/items" label="項目" icon={<Package className="h-5 w-5" />} active={isActive("/items")} />
          <Bottom to="/settings" label="設定" icon={<Settings className="h-5 w-5" />} active={isActive("/settings") || isActive("/contacts")} />
        </div>
      </nav>
    </div>
  );
}

function Nav({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-white text-[#1a1612] shadow-sm" : "text-[#6b5c4d] hover:bg-white/60"
      }`}
    >
      {icon} {label}
    </Link>
  );
}

function Bottom({ to, label, icon, active, primary }: { to: string; label: string; icon: ReactNode; active: boolean; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
        primary || active ? "text-[#C45A3C]" : "text-[#6b5c4d]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
