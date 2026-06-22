import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Package,
  Save,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";

const BRAND = "報得過";

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
  onEnter?: () => void;
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
          onEnter();
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
  const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.12;

  return (
    <div className="landing-enter-overlay" aria-hidden>
      <div
        className="landing-enter-paper"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          ["--enter-tx" as string]: `${window.innerWidth / 2 - cx}px`,
          ["--enter-ty" as string]: `${window.innerHeight / 2 - cy}px`,
          ["--enter-scale" as string]: String(scale),
        }}
      >
        <MockPdfSummary className="!static !h-full !w-full !max-w-none !rotate-0 !shadow-none" />
      </div>
      <p className="landing-enter-status">進入報價世界…</p>
    </div>
  );
}

function useReveal(threshold = 0.15) {
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
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`landing-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
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
        <p>貳、除本報價列出之工程外，工程由甲方自行發包…</p>
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

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="landing-feature-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#C45A3C]/10 text-[#C45A3C]">{icon}</div>
      <h3 className="font-semibold text-[#1a1612]">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#6b5c4d]">{desc}</p>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const heroPaperRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [entering, setEntering] = useState(false);
  const [enterRect, setEnterRect] = useState<DOMRect | null>(null);

  const startEnter = useCallback(() => {
    if (entering) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate({ to: "/auth" });
      return;
    }

    const paper = heroPaperRef.current?.querySelector(".landing-mock-paper");
    if (!paper) {
      navigate({ to: "/auth" });
      return;
    }

    const rect = paper.getBoundingClientRect();
    setEnterRect(rect);
    setEntering(true);
    document.documentElement.classList.add("landing-entering");

    window.setTimeout(() => {
      navigate({ to: "/auth" });
    }, 1500);
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
    <div className="bdg-theme landing-page min-h-screen bg-[#F5F0E8] text-[#1a1612]">
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

      <section className="landing-hero mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 md:grid-cols-2 md:gap-12 md:pb-24 md:pt-14">
        <RevealSection>
          <p className="text-xs font-semibold tracking-[0.28em] text-[#C45A3C]">FOR FIELD & STUDIO</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight md:text-5xl lg:text-[3.25rem]">
            三分鐘，<br />做出客戶願意簽的報價。
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#6b5c4d] md:text-lg">
            給師傅、統包、剛接案的設計師。填完項目，右邊就是給客戶看的專業報價單。
          </p>
          <CtaButton className="mt-8 px-7 py-3.5 text-base" onEnter={startEnter} disabled={entering} />
        </RevealSection>
        <RevealSection delay={120} className="flex justify-center md:justify-end">
          <div ref={heroPaperRef} className="landing-hero-visual">
            <MockPdfSummary />
          </div>
        </RevealSection>
      </section>

      <section className="border-t border-[#e8dfd3]/80 bg-white/50 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:gap-16">
          <RevealSection className="order-2 md:order-1">
            <div className="flex justify-center">
              <div className="landing-stack">
                <MockPdfSummary className="landing-stack-back" />
                <MockPdfSummary className="landing-stack-front" />
              </div>
            </div>
          </RevealSection>
          <RevealSection className="order-1 md:order-2" delay={80}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C45A3C]">Professional</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">工程施工報價單，<br />該有的都有。</h2>
            <ul className="mt-6 space-y-4 text-[#6b5c4d]">
              {["摘要頁：工種合計、營業稅、中文大寫金額", "明細頁：自動分頁，每頁完整表頭", "條款、付款明細、甲乙簽章區一次到位"].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed md:text-base">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C45A3C]" />
                  {item}
                </li>
              ))}
            </ul>
          </RevealSection>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <RevealSection className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C45A3C]">Live preview</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">左邊填、右邊就是成品</h2>
            <p className="mt-4 text-base text-[#6b5c4d] md:text-lg">不用猜排版。改一個數字，總價與付款明細跟著更新。</p>
          </RevealSection>
          <RevealSection delay={100} className="mt-10 md:mt-14">
            <MockEditorSplit className="mx-auto max-w-3xl" />
          </RevealSection>
        </div>
      </section>

      <section className="border-t border-[#e8dfd3]/80 bg-white/50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <RevealSection className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C45A3C]">Catalog</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">常用工項存起來，下次秒帶入</h2>
            <p className="mt-4 text-base text-[#6b5c4d]">項目庫搜尋帶入明細，也支援 CSV 匯入，大量項目不用重打。</p>
          </RevealSection>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <RevealSection delay={0}>
              <div className="landing-feature-card h-full">
                <Package className="mb-3 h-8 w-8 text-[#C45A3C]" />
                <h3 className="font-semibold">項目庫</h3>
                <p className="mt-2 text-sm text-[#6b5c4d]">泥作、木作、水電…常用單價一次建好，編輯時搜尋即帶入。</p>
              </div>
            </RevealSection>
            <RevealSection delay={80}>
              <div className="landing-feature-card h-full">
                <FileSpreadsheet className="mb-3 h-8 w-8 text-[#C45A3C]" />
                <h3 className="font-semibold">CSV 匯入</h3>
                <p className="mt-2 text-sm text-[#6b5c4d]">從 Excel 整理好的明細，上傳後自動對應欄位。</p>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <RevealSection className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C45A3C]">Deliver</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">做好就送，不用再排版</h2>
          </RevealSection>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <RevealSection delay={0}><FeatureCard icon={<Download className="h-5 w-5" />} title="PDF 匯出" desc="A4 滿版輸出，直接寄給客戶或列印簽章。" /></RevealSection>
            <RevealSection delay={60}><FeatureCard icon={<Share2 className="h-5 w-5" />} title="LINE 分享" desc="一鍵產生連結，附上總價與預覽頁。" /></RevealSection>
            <RevealSection delay={120}><FeatureCard icon={<Copy className="h-5 w-5" />} title="複製舊報價" desc="同客戶改價再送，歷史紀錄隨時調出。" /></RevealSection>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e8dfd3] bg-[#1a1612] py-16 text-white md:py-20">
        <RevealSection className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">下一張報價，從這裡開始</h2>
          <p className="mt-4 text-white/70">註冊後即可建立報價、匯出 PDF、分享給客戶。</p>
          <CtaButton className="mt-8 px-8 py-3.5 text-base hover:brightness-110" onEnter={startEnter} disabled={entering} />
        </RevealSection>
      </section>

      <footer className="border-t border-white/10 bg-[#1a1612] py-6 text-center text-xs text-white/40">{BRAND}</footer>

      {enterRect && entering ? <LandingEnterOverlay rect={enterRect} /> : null}
    </div>
  );
}
