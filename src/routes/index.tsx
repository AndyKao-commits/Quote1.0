import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Camera, ClipboardList, FileDown, ArrowRight, Cloud } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "現場紀錄 — 工程案件、施工日誌、照片浮水印" },
      { name: "description", content: "專為工地師傅打造的施工紀錄系統：雲端同步案件、施工日誌、照片自動加浮水印、PDF 報告。" },
      { property: "og:title", content: "現場紀錄" },
      { property: "og:description", content: "工地隨拍即記，雲端同步不遺失。" },
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
          <span className="font-display text-lg font-bold tracking-tight">現場紀錄</span>
        </Link>
        <Link to="/auth" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary">
          登入 / 註冊
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-12 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">FIELD LOG · 雲端同步</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            工地的每一刻<br />
            <span className="text-primary">都值得被留下</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            管理案件、寫施工日誌、拍照自動加上案件浮水印、產生 PDF 報告，
            <br className="hidden md:block" />
            登入後資料自動上雲，換手機也不會不見。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="btn-touch inline-flex items-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:brightness-110"
            >
              進入系統 <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Feat icon={<ClipboardList className="h-5 w-5" />} title="案件管理" desc="客戶、地址、開工日期、進度一目了然" />
          <Feat icon={<Camera className="h-5 w-5" />} title="照片浮水印" desc="自動烙印案件名、時間、地址、施工人員" />
          <Feat icon={<FileDown className="h-5 w-5" />} title="PDF 報告" desc="一鍵匯出完整施工報告，可分享/列印" />
          <Feat icon={<Cloud className="h-5 w-5" />} title="雲端同步" desc="多裝置同步，資料永遠不遺失" />
        </section>
      </main>
    </div>
  );
}

function Feat({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2 inline-grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="font-bold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
