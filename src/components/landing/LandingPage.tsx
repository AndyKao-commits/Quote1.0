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
  Share2,
} from "lucide-react";
import {
  LandingShotCard,
  ShotDetailPage,
  ShotSignPage,
  ShotSummaryPage,
} from "@/components/landing/LandingShots";
import { LandingWorkflowDemo } from "@/components/landing/LandingWorkflowDemo";
import { QuotePigeon } from "@/components/QuotePigeon";

const BRAND = "報得過";
const SPLASH_KEY = "bdg_landing_splash";

const PRODUCT_FEATURES = [
  {
    tag: "Preview",
    tone: "peach",
    icon: Eye,
    title: "即時預覽同步",
    desc: "編輯區與 PDF 雙欄對照。明細、合計、付款分期隨輸入即時更新，並自動儲存。",
  },
  {
    tag: "Share",
    tone: "blue",
    icon: Share2,
    title: "LINE 線上分享",
    desc: "產生預覽連結，客戶無需安裝即可瀏覽完整報價，支援一鍵轉發 LINE。",
  },
  {
    tag: "Catalog",
    tone: "cream",
    icon: Package,
    title: "項目庫管理",
    desc: "常用工項與單價預先建檔，搜尋帶入明細。支援 CSV 批次匯入與欄位對應。",
  },
  {
    tag: "Pricing",
    tone: "slate",
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
      <div className="landing-enter-status-wrap">
        <QuotePigeon animated size={64} label="進入報價世界" />
        <p className="landing-enter-status">進入報價世界…</p>
      </div>
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
        <QuotePigeon animated size={80} label="載入中" className="landing-splash-pigeon" />
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

function LandingSectionIntro({
  pill,
  title,
  lead,
}: {
  pill: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="landing-section-intro">
      <span className="landing-pill">{pill}</span>
      <h2 className="landing-section-title">{title}</h2>
      {lead ? <p className="landing-section-lead">{lead}</p> : null}
    </div>
  );
}

function FeatureCard({
  tag,
  tone,
  icon: Icon,
  title,
  desc,
}: {
  tag: string;
  tone: (typeof PRODUCT_FEATURES)[number]["tone"];
  icon: (typeof PRODUCT_FEATURES)[number]["icon"];
  title: string;
  desc: string;
}) {
  return (
    <div className={`landing-feature-card landing-feature-card--${tone} h-full`}>
      <div className="landing-feature-card-top">
        <p className="landing-feature-tag">{tag}</p>
        <div className="landing-feature-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{desc}</p>
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
    <div className="bdg-theme landing-page min-h-screen text-[var(--landing-ink)]">
      {showSplash ? <LandingSplash onDone={finishSplash} /> : null}

      <header className={`landing-header sticky top-0 z-50 transition-all duration-300 ${scrolled ? "is-scrolled" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
            {BRAND}
          </span>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-sm font-semibold text-[var(--bdg-muted)] hover:text-[var(--bdg-ink)] sm:inline">登入</Link>
            <CtaButton className="px-4 py-2 text-sm shadow-md" onEnter={startEnter} disabled={entering} />
          </div>
        </div>
      </header>

      <section className="landing-hero relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-6xl items-center gap-10 px-4 pb-20 pt-8 md:grid-cols-2 md:gap-12 md:pb-24 md:pt-14">
        <ScrollReveal from="left">
          <p className="landing-hero-eyebrow">給現場與工作室</p>
          <h1 className="landing-hero-title">
            三分鐘，做出客戶願意簽的<span className="landing-hero-accent">報價單</span>。
          </h1>
          <p className="landing-hero-sub">
            師傅、統包、設計師都適用。版型、分頁、大寫金額一次到位，送出前就能確認業主看到的是正式文件。
          </p>
          <CtaButton className="landing-hero-cta mt-8 px-7 py-3.5 text-base" onEnter={startEnter} disabled={entering} />
        </ScrollReveal>
        <ScrollReveal from="right" delay={120} className="flex justify-center md:justify-end">
          <div className="landing-hero-stage w-full max-w-md">
            <div className="landing-hero-stage-bg" aria-hidden />
            <MockPanel className="landing-hero-visual-panel relative z-[1]">
              <MockPdfSummary className="!static !max-w-none !rotate-0 !shadow-none mx-auto" />
            </MockPanel>
          </div>
        </ScrollReveal>
        <a href="#output" className="landing-hero-hint absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs font-semibold text-[var(--bdg-muted)] md:bottom-8">
          查看輸出格式
          <ChevronDown className="h-4 w-4" />
        </a>
      </section>

      <section id="output" className="landing-shots-section landing-shots-section--cool">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <LandingSectionIntro
              pill="輸出文件"
              title="標準工程施工報價單"
              lead="A4 滿版輸出。摘要、明細、條款、付款明細與簽章區，依工程報價慣例完整呈現。"
            />
          </ScrollReveal>
          <ScrollReveal delay={80} from="up">
            <div className="landing-output-bento">
              <LandingShotCard
                title="摘要頁"
                subtitle="工種合計、營業稅、中文大寫金額"
                frameTone="peach"
                className="landing-shot--featured"
              >
                <ShotSummaryPage />
              </LandingShotCard>
              <LandingShotCard title="明細頁" subtitle="工種分組、自動分頁、每頁完整表頭" frameTone="blue">
                <ShotDetailPage />
              </LandingShotCard>
              <LandingShotCard title="簽章頁" subtitle="工程條款、付款分期、甲乙簽章欄位" frameTone="sage">
                <ShotSignPage />
              </LandingShotCard>
            </div>
            <p className="landing-shots-hint md:hidden">左右滑動查看更多</p>
          </ScrollReveal>
        </div>
      </section>

      <section id="features" className="landing-shots-section landing-shots-section--light">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <LandingSectionIntro
              pill="核心功能"
              title="專業報價所需的能力"
              lead="編輯、預覽、匯出與資料管理，整合於同一套流程。"
            />
          </ScrollReveal>
          <div className="landing-feature-bento mt-10">
            {PRODUCT_FEATURES.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 60} from={i % 2 === 0 ? "left" : "right"}>
                <FeatureCard
                  tag={feature.tag}
                  tone={feature.tone}
                  icon={feature.icon}
                  title={feature.title}
                  desc={feature.desc}
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-shots-section landing-shots-section--warm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="landing-workflow-head">
            <ScrollReveal className="flex-1">
              <LandingSectionIntro
                pill="編輯流程"
                title="填寫、預覽、匯出"
                lead="明細編輯與 PDF 預覽同步進行，完成後可下載或分享。"
              />
            </ScrollReveal>
          </div>
          <ScrollReveal delay={80} from="up">
            <LandingWorkflowDemo className="mx-auto mt-8 max-w-4xl" />
          </ScrollReveal>
        </div>
      </section>

      <section className="landing-cta-band">
        <ScrollReveal className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="landing-cta-title">下一張報價，從這裡開始</h2>
          <p className="landing-cta-lead">註冊後即可建立報價、匯出 PDF、分享預覽連結。</p>
          <CtaButton className="mt-8 px-8 py-3.5 text-base hover:brightness-110" onEnter={startEnter} disabled={entering} />
        </ScrollReveal>
      </section>

      <footer className="landing-footer">{BRAND}</footer>

      {enterRect && entering ? <LandingEnterOverlay rect={enterRect} /> : null}
    </div>
  );
}
