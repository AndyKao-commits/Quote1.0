import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Sparkles, PackageOpen, CreditCard, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useMembership } from "@/lib/useMembership";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({ meta: [{ title: "商店 — 施工紀錄 PRO" }] }),
  component: ShopPage,
});

function ShopPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: membership, isLoading: ml } = useMembership();
  const allowed = isAdmin === true || membership?.active === true;
  if (!isLoading && !ml && !allowed) {
    return (
      <AppShell>
        <div className="card-surface mx-auto mt-10 max-w-md p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-bold">商店為付費會員專屬</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            升級為付費會員或輸入主帳號分享的序號，即可解鎖商店功能。
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            前往個人資料
          </Link>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-[var(--shadow-elevated)]">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">商店</h1>
          <p className="text-sm text-muted-foreground">水電五金、施工耗材即將上架</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-3 py-1 text-[11px] font-extrabold text-white shadow">
          <Sparkles className="h-3 w-3" /> COMING SOON
        </span>
      </header>

      <section className="card-surface relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,theme(colors.fuchsia.400),transparent_40%),radial-gradient(circle_at_80%_60%,theme(colors.sky.400),transparent_40%)]" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <PackageOpen className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold">商店系統建置中</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            我們正在準備全新的線上商店，提供水電師傅常用的工具、耗材與電子配件，
            支援團隊批量採購、發票管理與訂單追蹤。
          </p>

          <ul className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
            <li className="rounded-xl border border-border bg-card p-4 text-left">
              <PackageOpen className="h-5 w-5 text-fuchsia-500" />
              <div className="mt-2 text-sm font-bold">商品目錄</div>
              <div className="text-xs text-muted-foreground">分類瀏覽、搜尋、收藏</div>
            </li>
            <li className="rounded-xl border border-border bg-card p-4 text-left">
              <CreditCard className="h-5 w-5 text-violet-500" />
              <div className="mt-2 text-sm font-bold">線上結帳</div>
              <div className="text-xs text-muted-foreground">信用卡、行動支付</div>
            </li>
            <li className="rounded-xl border border-border bg-card p-4 text-left">
              <ShoppingBag className="h-5 w-5 text-sky-500" />
              <div className="mt-2 text-sm font-bold">團隊採購</div>
              <div className="text-xs text-muted-foreground">綁定團隊統一請款</div>
            </li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
