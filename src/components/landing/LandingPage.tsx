import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Eye,
  Download,
  Package,
  Percent,
  Save,
  Search,
  Share2,
} from "lucide-react";
import {
  LandingShotCard,
  ShotDeliverApp,
  ShotDetailPage,
  ShotEditorApp,
  ShotPreviewApp,
  ShotSignPage,
  ShotSummaryPage,
} from "@/components/landing/LandingShots";

const BRAND = "報得過";
const SPLASH_KEY = "bdg_landing_splash";

const PRODUCT_FEATURES = [
  {
    tag: "Preview",
    icon: Eye,
    title: "即時預覽同步",
    desc: "編輯區與 PDF 雙欄對照。明細、合計、付款分期隨輸入即時更新，並自動儲存。",
  },
  {
    tag: "Share",
    icon: Share2,
    title: "LINE 線上分享",
    desc: "產生預覽連結，客戶無需安裝即可瀏覽完整報價，支援一鍵轉發 LINE。",
  },
  {
    tag: "Catalog",
    icon: Package,
    title: "項目庫管理",
    desc: "常用工項與單價預先建檔，搜尋帶入明細。支援 CSV 批次匯入與欄位對應。",
  },
  {
    tag: "Pricing",
    icon: Percent,
    title: "批次價格調整",
    desc: "全報價統一升降百分比，總價、稅額與付款分期明細自動重算。",
  },
] as const;

const SUMMARY_ROWS = [
  { name: "泥作工程", total: "680,000" },
  { name: "木作工程", total: "920,000" },
  { name: "水電工程", total: "540,000" },
  { name: "油漆工程", total: "380,000" },
  { name: "衛浴設備", total: "1,652,586" },
];

function CtaButton({
  className = "",
  onEnter,
  disabled = false,
}: {
  className?: string;
  onEnter?: (rect: DOMRect) => void;
  disabled?: boolean;
}) {
  return (
    <Link
      to="/auth"
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        if (onEnter) {
          e.preventDefault();
          onEnter(e.currentTarget.getBoundingClientRect());
        }
      }}
      aria-disabled={disabled}
      className={`group inline-flex items-center gap-2 rounded-full bg-[#C45A3C] font-bold text-white shadow-lg transition hover:brightness-105 ${disabled ? "pointer-events-none opacity-80" : ""} ${className}`}
    >
      {disabled ? "載入中…" : "立即開始"}
      {!disabled && <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />}
    </Link>
  );
}

function LandingEnterOverlay({ rect }: { rect: DOMRect }) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.2;

  return (
    <div className="landing-enter-overlay" aria-hidden>
      <div
        className="landing-enter-burst"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          ["--enter-tx" as string]: `${window.innerWidth / 2 - cx}px`,
          ["--enter-ty" as string]: `${window.innerHeight / 2 - cy}px`,
          ["--enter-scale" as string]: String(scale),
        }}
      />
      <p className="landing-enter-status">進入報價世界…</p>
    </div>
  );
}

function LandingSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1500);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="landing-splash" aria-hidden>
      <div className="landing-splash-inner">
        <img src="/favicon.svg" alt="" className="landing-splash-logo" />
        <p className="landing-splash-brand">{BRAND}</p>
        <p className="landing-splash-tagline">專業報價，三分鐘搞定</p>
        <div className="landing-splash-bar">
          <div className="landing-splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function ScrollReveal({
  children,
  className = "",
  delay = 0,
  from = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right";
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`landing-scroll-item landing-scroll-item--${from} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function MockPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`landing-mock-panel ${className}`}>
      <div className="landing-mock-panel-chrome">
        <div className="flex gap-1.5">
          <span className="landing-mock-dot" />
          <span className="landing-mock-dot" />
          <span className="landing-mock-dot" />
        </div>
        <span className="landing-mock-panel-title">報價預覽</span>
      </div>
      <div className="landing-mock-panel-body">{children}</div>
    </div>
  );
}

function MockPdfSummary({ className = "", compact = false, showBadge = true }: { className?: string; compact?: boolean; showBadge?: boolean }) {
  const fs = compact ? "6px" : "7px";
  const headerFs = compact ? "7.5px" : "8px";

  return (
    <div
      className={`landing-mock-paper select-none font-['Noto_Sans_TC','Microsoft_JhengHei',sans-serif] text-black ${className}`}
      aria-hidden
      style={{ fontSize: fs }}
    >
      <div className={`text-center ${compact ? "px-3 pt-3" : "px-5 pt-5"}`}>
        <img src="/favicon.svg" alt="" className={`mx-auto object-contain ${compact ? "mb-0.5 h-6 w-6" : "mb-1 h-9 w-9"}`} />
        <p className={`font-semibold tracking-wide text-[#222] ${compact ? "text-[8px]" : "text-[11px]"}`}>{BRAND}</p>
      </div>
      <div className={`grid grid-cols-[1fr_auto] gap-x-3 text-[#444] ${compact ? "mt-2 gap-y-0.5 px-3" : "mt-3 gap-y-1 px-5"}`} style={{ fontSize: headerFs }}>
        <p><span className="text-[#444]">內容：</span>工程施工報價單</p>
        <p className="col-span-2"><span className="text-[#444]">業主：</span>陳先生</p>
        <p><span className="text-[#444]">案址：</span>新北市板橋區…</p>
        <p className="text-right whitespace-nowrap">2026.06.22</p>
      </div>
      <div className={`overflow-hidden border border-[#222] ${compact ? "mx-2.5 mt-2" : "mx-4 mt-3"}`}>
        <div className="grid grid-cols-7 border-b border-[#222] bg-[#f5f5f5] font-bold text-[#111]">
          {["序號", "名稱", "單位", "數量", "單價", "總價", "備註"].map((h, idx) => (
            <div key={h} className={`border-r border-[#222] px-1 py-1 last:border-r-0 ${idx === 1 ? "text-left" : idx >= 4 ? "text-right" : "text-center"}`}>{h}</div>
          ))}
        </div>
        {SUMMARY_ROWS.map((row, i) => (
          <div key={row.name} className="grid grid-cols-7 border-b border-[#222]">
            <div className="border-r border-[#222] px-1 py-1.5 text-center">{i + 1}</div>
            <div className="border-r border-[#222] px-1 py-1.5 text-left">{row.name}</div>
            <div className="border-r border-[#222] px-1 py-1.5 text-center">式</div>
            <div className="border-r border-[#222] px-1 py-1.5 text-center">1</div>
            <div className="border-r border-[#222] px-1 py-1.5 text-right">—</div>
            <div className="border-r border-[#222] px-1 py-1.5 text-right font-medium">{row.total}</div>
            <div className="px-1 py-1.5" />
          </div>
        ))}
        {["合計", "總價"].map((label) => (
          <div key={label} className="grid grid-cols-7 border-b border-[#222]">
            <div className="col-span-5 border-r border-[#222] px-2 py-1.5 text-right font-bold">{label}</div>
            <div className="col-span-2 px-2 py-1.5 text-right font-bold">4,172,586</div>
          </div>
        ))}
        <div className="px-2 py-1.5 text-center tracking-wide text-stone-700" style={{ fontSize: compact ? "5.5px" : "6.5px" }}>
          肆佰壹拾柒萬貳仟伍佰捌拾陸 元整
        </div>
      </div>
      <div className={`space-y-0.5 leading-relaxed text-stone-600 ${compact ? "mx-2.5 mt-1.5" : "mx-4 mt-2"}`} style={{ fontSize: compact ? "5.5px" : "6.5px" }}>
        <p>壹、初估報價單時間於三個月內有效。</p>
        <p>貳、付款明細金額皆以施工報價單為主…</p>
      </div>
      <div className={`space-y-0.5 border border-[#222] bg-[#f7f7f7] ${compact ? "mx-2.5 mt-1.5 px-1.5 py-1" : "mx-4 mt-2 px-2 py-1.5"}`} style={{ fontSize: compact ? "5.5px" : "6.5px" }}>
        <p className="font-bold">付款明細（未稅）</p>
        <p className="text-stone-600">第一期－簽約之訂金 5% $208,629（簽約五日內）</p>
      </div>
      <p className={`text-center text-stone-400 ${compact ? "mt-1.5 pb-2" : "mt-3 pb-4"}`} style={{ fontSize: compact ? "5.5px" : "7px" }}>第 1 / 4 頁</p>
      {showBadge && (
        <div className="absolute -right-3 -top-3 rounded-full bg-[#C45A3C] px-2.5 py-1 text-[10px] font-bold text-white shadow-md">PDF</div>
      )}
    </div>
  );
}

function MockEditorSplit({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-mock-editor-v2 select-none ${className}`} aria-hidden>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bdg-line)] bg-white px-3 py-2">
        <span className="text-xs text-stone-500">← 返回</span>
        <div className="flex-1" />
        {["儲存", "預覽", "PDF"].map((label) => (
          <span key={label} className="bdg-btn bdg-btn-secondary pointer-events-none text-xs py-1">
            {label === "儲存" && <Save className="h-3.5 w-3.5" />}
            {label === "預覽" && <Eye className="h-3.5 w-3.5" />}
            {label === "PDF" && <Download className="h-3.5 w-3.5" />}
            {label}
          </span>
        ))}
        <span className="bdg-btn pointer-events-none bg-[#06C755] text-xs text-white py-1">LINE</span>
      </div>
      <div className="grid min-h-[340px] lg:min-h-[400px] lg:grid-cols-2">
        <div className="space-y-3 border-b border-[var(--bdg-line)] p-3 lg:border-b-0 lg:border-r">
          <div className="bdg-card space-y-2 p-3">
            <p className="bdg-section-title">客戶</p>
            <div className="space-y-1.5">
              <div className="text-[10px] text-stone-500">報價標題</div>
              <div className="bdg-input py-1.5 text-xs">工程施工報價單</div>
              <div className="text-[10px] text-stone-500">客戶名稱</div>
              <div className="bdg-input py-1.5 text-xs">陳先生</div>
            </div>
          </div>
          <div className="bdg-card p-3">
            <p className="bdg-section-title mb-2">明細</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <div className="bdg-input py-1.5 pl-9 text-xs text-stone-400">搜尋項目庫…</div>
            </div>
            {SUMMARY_ROWS.slice(0, 3).map((r) => (
              <div key={r.name} className="mb-1.5 flex justify-between rounded border border-[var(--bdg-line)] px-2 py-1.5 text-xs">
                <span>{r.name}</span>
                <span className="text-stone-400">式 · 1</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-[240px] flex-col bg-stone-200/70">
          <div className="pan-hint border-b-0 bg-white/90 py-1 text-[10px]">拖曳或滑動瀏覽完整報價</div>
          <div className="flex flex-1 items-start justify-center overflow-hidden p-3">
            <MockPdfSummary compact showBadge={false} className="!static !max-w-full !rotate-0 !shadow-md w-full max-w-[280px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  tag,
  icon: Icon,
  title,
  desc,
}: {
  tag: string;
  icon: (typeof PRODUCT_FEATURES)[number]["icon"];
  title: string;
  desc: string;
}) {
  return (
    <div className="landing-feature-card h-full">
      <p className="landing-feature-tag">{tag}</p>
      <div className="bdg-card-icon mb-3.5 mt-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-[#1a1612]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6b5c4d]">{desc}</p>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [entering, setEntering] = useState(false);
  const [enterRect, setEnterRect] = useState<DOMRect | null>(null);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  const finishSplash = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }, []);

  const startEnter = useCallback((rect: DOMRect) => {
    if (entering) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate({ to: "/auth" });
      return;
    }

    setEnterRect(rect);
    setEntering(true);
    document.documentElement.classList.add("landing-entering");

    window.setTimeout(() => {
      navigate({ to: "/auth" });
    }, 820);
  }, [entering, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => {
    document.documentElement.classList.remove("landing-entering");
  }, []);

  return (
    <div className="bdg-theme landing-page min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#F5F0E8] to-[#C45A3C]/10 text-[#1a1612]">
      {showSplash ? <LandingSplash onDone={finishSplash} /> : null}

      <header className={`landing-header sticky top-0 z-50 transition-all duration-300 ${scrolled ? "is-scrolled border-b border-[#e8dfd3] bg-[#F5F0E8]/92 backdrop-blur-md shadow-sm" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
            {BRAND}
          </span>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-sm font-semibold text-[#6b5c4d] hover:text-[#1a1612] sm:inline">登入</Link>
            <CtaButton className="px-4 py-2 text-sm shadow-md" onEnter={startEnter} disabled={entering} />
          </div>
        </div>
      </header>

      <section className="landing-hero relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-6xl items-center gap-10 px-4 pb-20 pt-8 md:grid-cols-2 md:gap-12 md:pb-24 md:pt-14">
        <ScrollReveal from="left">
          <p className="landing-hero-eyebrow text-xs font-semibold tracking-[0.28em] text-[#C45A3C]">給現場與工作室</p>
          <h1 className="landing-hero-title mt-4 text-4xl font-bold leading-[1.12] tracking-tight md:text-5xl lg:text-[3.25rem]">
            三分鐘，<br />做出客戶願意簽的報價。
          </h1>
          <p className="landing-hero-sub mt-5 max-w-md text-base leading-relaxed text-[#6b5c4d] md:text-lg">
            師傅、統包、設計師都適用。你專心談案子，版型、分頁、大寫金額我們幫你顧好——送出前就能確定業主看到的是正式文件。
          </p>
          <CtaButton className="landing-hero-cta mt-8 px-7 py-3.5 text-base" onEnter={startEnter} disabled={entering} />
        </ScrollReveal>
        <ScrollReveal from="right" delay={120} className="flex justify-center md:justify-end">
          <div className="landing-hero-visual w-full max-w-sm">
            <MockPanel className="landing-hero-visual-panel">
              <MockPdfSummary className="!static !max-w-none !rotate-0 !shadow-none mx-auto" />
            </MockPanel>
          </div>
        </ScrollReveal>
        <a href="#output" className="landing-hero-hint absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs font-semibold text-[#6b5c4d] md:bottom-8">
          查看輸出格式
          <ChevronDown className="h-4 w-4" />
        </a>
      </section>

      <section id="output" className="landing-shots-section border-t border-[#e8dfd3]/80 bg-white/60">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="landing-shots-eyebrow">輸出文件</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">標準工程施工報價單</h2>
            <p className="landing-shots-lead">
              A4 滿版輸出。摘要、明細、條款、付款明細與簽章區，依工程報價慣例完整呈現。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={80} from="up">
            <div className="landing-shots">
              <LandingShotCard title="摘要頁" subtitle="工種合計、營業稅、中文大寫金額">
                <ShotSummaryPage />
              </LandingShotCard>
              <LandingShotCard title="明細頁" subtitle="工種分組、自動分頁、每頁完整表頭">
                <ShotDetailPage />
              </LandingShotCard>
              <LandingShotCard title="簽章頁" subtitle="工程條款、付款分期、甲乙簽章欄位">
                <ShotSignPage />
              </LandingShotCard>
            </div>
            <p className="landing-shots-hint md:hidden">左右滑動查看更多</p>
          </ScrollReveal>
        </div>
      </section>

      <section id="features" className="border-t border-[#e8dfd3]/80 bg-[#F5F0E8]/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="landing-shots-eyebrow">核心功能</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">專業報價所需的能力</h2>
            <p className="landing-shots-lead">
              編輯、預覽、匯出與資料管理，整合於同一套流程。
            </p>
          </ScrollReveal>
          <div className="landing-reason-grid mt-10">
            {PRODUCT_FEATURES.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 60} from={i % 2 === 0 ? "left" : "right"}>
                <FeatureCard tag={feature.tag} icon={feature.icon} title={feature.title} desc={feature.desc} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-shots-section">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="landing-shots-eyebrow">編輯流程</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">填寫、預覽、匯出</h2>
            <p className="landing-shots-lead">
              明細編輯與 PDF 預覽同步進行，完成後可下載或分享。
            </p>
          </ScrollReveal>
          <ScrollReveal delay={80} from="up">
            <div className="landing-shots">
              <LandingShotCard title="明細編輯" subtitle="客戶資料、工種項目、項目庫搜尋帶入" variant="app">
                <ShotEditorApp />
              </LandingShotCard>
              <LandingShotCard title="即時預覽" subtitle="PDF 版型同步顯示，支援拖曳瀏覽" variant="app">
                <ShotPreviewApp />
              </LandingShotCard>
              <LandingShotCard title="PDF 與 LINE" subtitle="A4 下載列印，或產生線上預覽連結" variant="app">
                <ShotDeliverApp />
              </LandingShotCard>
            </div>
            <p className="landing-shots-hint md:hidden">左右滑動查看更多</p>
          </ScrollReveal>
          <ScrollReveal delay={120} from="up" className="mt-8 hidden lg:block">
            <MockEditorSplit className="mx-auto max-w-4xl" />
          </ScrollReveal>
        </div>
      </section>

      <section className="border-t border-[#e8dfd3] bg-[#1a1612] py-16 text-white md:py-20">
        <ScrollReveal className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">下一張報價，從這裡開始</h2>
          <p className="mt-4 text-white/70">註冊後即可建立報價、匯出 PDF、分享預覽連結。</p>
          <CtaButton className="mt-8 px-8 py-3.5 text-base hover:brightness-110" onEnter={startEnter} disabled={entering} />
        </ScrollReveal>
      </section>

      <footer className="border-t border-white/10 bg-[#1a1612] py-6 text-center text-xs text-white/40">{BRAND}</footer>

      {enterRect && entering ? <LandingEnterOverlay rect={enterRect} /> : null}
    </div>
  );
}
