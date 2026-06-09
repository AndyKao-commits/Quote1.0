import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench, Camera, ClipboardList, FileDown, ArrowRight, Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "施工紀錄 PRO — 案件管理、施工日誌、PDF 報告" },
      { name: "description", content: "現場施工紀錄、案件管理、施工日誌、照片浮水印與 PDF 報告，一站搞定。" },
      { property: "og:title", content: "施工紀錄 PRO" },
      { property: "og:description", content: "案件管理、施工日誌、照片浮水印、PDF 報告，雲端同步不遺失。" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">施工紀錄 PRO</span>
        </Link>
        <Link to="/auth" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary">
          登入 / 註冊
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-12 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">FIELD LOG · iOS 即將推出</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            工地紀錄<br />
            <span className="text-primary">一個 App 搞定</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            案件、日誌、照片、材料與 PDF 報告，專為現場師傅設計的簡潔工具。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="btn-touch inline-flex items-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:brightness-110"
            >
              開始使用 <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Feat icon={<ClipboardList className="h-5 w-5" />} title="案件與日誌" desc="開工資訊、施工進度、工時紀錄，一目了然" />
          <Feat icon={<Camera className="h-5 w-5" />} title="照片浮水印" desc="自動印上案件、時間、地址，舉證更輕鬆" />
          <Feat icon={<FileDown className="h-5 w-5" />} title="PDF 報告" desc="一鍵產出專業報告，交付客戶" />
          <Feat icon={<Users className="h-5 w-5" />} title="團隊協作" desc="多人管理案件，權限分級控管" />
        </section>
      </main>
    </div>
  );
}

function Feat({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-surface p-5">
      <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="text-base font-bold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
