import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench, Camera, ClipboardList, FileDown, ArrowRight, Cloud,
  ShieldCheck, Zap, Users, Smartphone, Bot, CheckCircle2,
} from "lucide-react";
import { Marquee } from "@/components/Marquee";

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
          <span className="font-display text-lg font-bold tracking-tight">施工紀錄 PRO PRO</span>
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
            所有案件、施工進度與現場照片，一個地方搞定。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="btn-touch inline-flex items-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:brightness-110"
            >
              進入系統 <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <Marquee />
        </section>

        {/* Highlighted advantages */}
        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">為什麼選我們</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">六大優勢，現場師傅都說讚</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Advantage
              icon={<Camera className="h-5 w-5" />}
              title="照片自動浮水印"
              desc="拍照即烙印案件名、時間、地址、人員，舉證更輕鬆。"
              accent="from-primary/15 to-primary/5"
            />
            <Advantage
              icon={<Bot className="h-5 w-5" />}
              title="AI 估價單辨識"
              desc="一張估價單拍下，材料品項、數量、單價自動填入。"
              accent="from-amber-500/15 to-amber-500/5"
            />
            <Advantage
              icon={<FileDown className="h-5 w-5" />}
              title="一鍵 PDF 報告"
              desc="客戶要對帳？專業排版 PDF 馬上產出，可分享列印。"
              accent="from-emerald-500/15 to-emerald-500/5"
            />
            <Advantage
              icon={<Users className="h-5 w-5" />}
              title="團隊共同管理"
              desc="多人協作、四級權限，主持人完全掌控案件存取。"
              accent="from-sky-500/15 to-sky-500/5"
            />
            <Advantage
              icon={<Cloud className="h-5 w-5" />}
              title="雲端即時同步"
              desc="多裝置自動同步，換手機資料永不遺失。"
              accent="from-violet-500/15 to-violet-500/5"
            />
            <Advantage
              icon={<Smartphone className="h-5 w-5" />}
              title="手機優先設計"
              desc="專為工地現場打造，一手操作、大按鈕、防誤觸。"
              accent="from-rose-500/15 to-rose-500/5"
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Feat icon={<ClipboardList className="h-5 w-5" />} title="案件管理" desc="客戶、地址、開工日期、進度一目了然" />
          <Feat icon={<ShieldCheck className="h-5 w-5" />} title="權限控管" desc="團隊四級權限，敏感資料只給對的人" />
          <Feat icon={<Zap className="h-5 w-5" />} title="現場即記" desc="日誌、照片、材料隨時記，下班就交件" />
          <Feat icon={<CheckCircle2 className="h-5 w-5" />} title="驗收交付" desc="完整紀錄＋PDF，把每個案件交得漂亮" />
        </section>
      </main>
    </div>
  );
}

function Advantage({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  return (
    <div className={`card-surface relative overflow-hidden bg-gradient-to-br ${accent} p-5`}>
      <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-card text-primary shadow-sm">
        {icon}
      </div>
      <div className="text-base font-bold">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
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
