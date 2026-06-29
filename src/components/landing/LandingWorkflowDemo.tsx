import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Download, Eye, Save, Search, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

const DEMO_LINES = [
  { name: "泥作工程", total: 680_000 },
  { name: "木作工程", total: 920_000 },
] as const;

const CLIENT_NAME = "陳先生";
const STEPS = ["填寫明細", "預覽更新", "PDF / LINE"] as const;

type DemoPhase = 0 | 1 | 2 | 3;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatTotal(n: number) {
  return n.toLocaleString("zh-TW");
}

function MiniPreview({
  clientName,
  lines,
  flash,
}: {
  clientName: string;
  lines: readonly { name: string; total: number }[];
  flash: boolean;
}) {
  const total = lines.reduce((s, l) => s + l.total, 0);

  return (
    <div className={`landing-workflow-preview ${flash ? "is-flash" : ""}`}>
      <div className="landing-workflow-preview-paper">
        <p className="text-center text-[9px] font-semibold text-[#222]">報得過</p>
        <div className="mt-1 space-y-0.5 text-[7px] text-[#555]">
          <p>
            <span className="text-[#888]">業主：</span>
            {clientName || "—"}
          </p>
          <p>
            <span className="text-[#888]">內容：</span>工程施工報價單
          </p>
        </div>
        <div className="mt-1.5 overflow-hidden border border-[#222] text-[6.5px]">
          <div className="grid grid-cols-4 border-b border-[#222] bg-[#f5f5f5] font-bold">
            {["序號", "名稱", "單位", "總價"].map((h) => (
              <div key={h} className="border-r border-[#222] px-0.5 py-0.5 text-center last:border-r-0">
                {h}
              </div>
            ))}
          </div>
          {lines.length === 0 ? (
            <div className="px-1 py-3 text-center text-[#bbb]">等待明細…</div>
          ) : (
            lines.map((row, i) => (
              <div key={row.name} className="grid grid-cols-4 border-b border-[#222]">
                <div className="border-r border-[#222] px-0.5 py-0.5 text-center">{i + 1}</div>
                <div className="border-r border-[#222] px-0.5 py-0.5">{row.name}</div>
                <div className="border-r border-[#222] px-0.5 py-0.5 text-center">式</div>
                <div className="px-0.5 py-0.5 text-right font-medium">{formatTotal(row.total)}</div>
              </div>
            ))
          )}
          <div className="grid grid-cols-4">
            <div className="col-span-3 border-r border-[#222] px-1 py-0.5 text-right font-bold">合計</div>
            <div className="px-0.5 py-0.5 text-right font-bold">{lines.length ? formatTotal(total) : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingWorkflowDemo({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const lineBtnRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<DemoPhase>(0);
  const [clientName, setClientName] = useState("");
  const [lineCount, setLineCount] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [previewFlash, setPreviewFlash] = useState(false);
  const [activeBtn, setActiveBtn] = useState<"pdf" | "line" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const lines = DEMO_LINES.slice(0, lineCount);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const moveCursor = (target: HTMLElement | null, duration = 0.55) => {
    if (!rootRef.current || !cursorRef.current || !target || reducedMotion) return;
    const root = rootRef.current.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    gsap.to(cursorRef.current, {
      x: t.left - root.left + t.width * 0.75,
      y: t.top - root.top + t.height * 0.45,
      duration,
      ease: "power2.out",
    });
  };

  const pulsePreview = () => {
    if (reducedMotion) return;
    setPreviewFlash(true);
    if (previewRef.current) {
      gsap.fromTo(
        previewRef.current,
        { scale: 0.98 },
        { scale: 1, duration: 0.45, ease: "back.out(1.4)" },
      );
    }
    window.setTimeout(() => setPreviewFlash(false), 500);
  };

  const pulseBtn = (btn: HTMLButtonElement | null) => {
    if (!btn || reducedMotion) return;
    gsap.fromTo(btn, { scale: 1 }, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 });
  };

  useGSAP(
    () => {
      if (!visible || reducedMotion) return;

      let cancelled = false;

      const reset = () => {
        setPhase(0);
        setClientName("");
        setLineCount(0);
        setSearchActive(false);
        setActiveBtn(null);
        setToast(null);
        if (cursorRef.current) gsap.set(cursorRef.current, { x: 24, y: 24, opacity: 0 });
      };

      const run = async () => {
        reset();
        await sleep(400);
        if (cancelled) return;

        if (cursorRef.current) gsap.to(cursorRef.current, { opacity: 1, duration: 0.3 });

        // —— ① 填寫 ——
        setPhase(1);
        setSearchActive(true);
        moveCursor(searchRef.current);
        await sleep(700);
        if (cancelled) return;

        setLineCount(1);
        pulsePreview();
        await sleep(650);
        if (cancelled) return;

        setLineCount(2);
        pulsePreview();
        setSearchActive(false);
        await sleep(500);
        if (cancelled) return;

        moveCursor(clientRef.current);
        for (let i = 1; i <= CLIENT_NAME.length; i++) {
          setClientName(CLIENT_NAME.slice(0, i));
          await sleep(120);
          if (cancelled) return;
        }
        await sleep(500);
        if (cancelled) return;

        // —— ② 預覽 ——
        setPhase(2);
        moveCursor(previewRef.current, 0.65);
        pulsePreview();
        await sleep(1200);
        if (cancelled) return;

        // —— ③ 匯出 ——
        setPhase(3);
        setActiveBtn("pdf");
        moveCursor(pdfBtnRef.current);
        pulseBtn(pdfBtnRef.current);
        await sleep(750);
        if (cancelled) return;

        setActiveBtn("line");
        moveCursor(lineBtnRef.current);
        pulseBtn(lineBtnRef.current);
        setToast("已產生 LINE 預覽連結");
        await sleep(1400);
        if (cancelled) return;

        setToast(null);
        setActiveBtn(null);
        if (cursorRef.current) gsap.to(cursorRef.current, { opacity: 0, duration: 0.25 });
        await sleep(1800);
        if (!cancelled) run();
      };

      run();

      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef, dependencies: [visible, reducedMotion] },
  );

  if (reducedMotion) {
    return (
      <div className={`landing-workflow-demo landing-workflow-demo--static ${className}`} aria-hidden>
        <div className="landing-workflow-steps">
          {STEPS.map((label, i) => (
            <span key={label} className={`landing-workflow-step ${i === 2 ? "is-active" : ""}`}>
              <b>{i + 1}</b> {label}
            </span>
          ))}
        </div>
        <div className="landing-workflow-demo-body">
          <div className="landing-workflow-editor">
            <p className="bdg-section-title">客戶</p>
            <div className="bdg-input py-1.5 text-xs">{CLIENT_NAME}</div>
            <p className="bdg-section-title mt-3">明細</p>
            {DEMO_LINES.map((r) => (
              <div key={r.name} className="landing-workflow-line text-xs">
                <span>{r.name}</span>
                <span className="text-stone-400">{formatTotal(r.total)}</span>
              </div>
            ))}
          </div>
          <div className="landing-workflow-preview-col">
            <MiniPreview clientName={CLIENT_NAME} lines={DEMO_LINES} flash={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`landing-workflow-demo ${className}`} aria-hidden>
      <div className="landing-workflow-steps">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`landing-workflow-step ${phase === i + 1 ? "is-active" : phase > i + 1 ? "is-done" : ""}`}
          >
            <b>{i + 1}</b> {label}
          </span>
        ))}
      </div>

      <div className="landing-workflow-demo-chrome">
        <span className="text-xs text-stone-500">← 返回</span>
        <div className="flex-1" />
        <span className="landing-workflow-toolbar-btn">
          <Save className="h-3.5 w-3.5" /> 儲存
        </span>
        <span className="landing-workflow-toolbar-btn">
          <Eye className="h-3.5 w-3.5" /> 預覽
        </span>
        <button
          ref={pdfBtnRef}
          type="button"
          tabIndex={-1}
          className={`landing-workflow-toolbar-btn ${activeBtn === "pdf" ? "is-pressed" : ""}`}
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          ref={lineBtnRef}
          type="button"
          tabIndex={-1}
          className={`landing-workflow-toolbar-btn landing-workflow-toolbar-btn--line ${activeBtn === "line" ? "is-pressed" : ""}`}
        >
          <Share2 className="h-3.5 w-3.5" /> LINE
        </button>
      </div>

      <div className="landing-workflow-demo-body">
        <div className="landing-workflow-editor">
          <div className="bdg-card space-y-2 p-3">
            <p className="bdg-section-title">客戶</p>
            <div className="text-[10px] text-stone-500">客戶名稱</div>
            <div
              ref={clientRef}
              className={`bdg-input py-1.5 text-xs ${phase === 1 && clientName ? "is-focus" : ""}`}
            >
              {clientName || <span className="text-stone-300">輸入客戶名稱</span>}
            </div>
          </div>
          <div className="bdg-card p-3">
            <p className="bdg-section-title mb-2">明細</p>
            <div
              ref={searchRef}
              className={`landing-workflow-search bdg-input py-1.5 pl-8 text-xs ${searchActive ? "is-focus" : ""}`}
            >
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              {searchActive ? "木作工程" : "搜尋項目庫…"}
            </div>
            {lines.map((r) => (
              <div key={r.name} className="landing-workflow-line text-xs">
                <span>{r.name}</span>
                <span className="text-stone-400">式 · {formatTotal(r.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-workflow-preview-col">
          <p className="landing-workflow-preview-hint">即時預覽</p>
          <div ref={previewRef} className="landing-workflow-preview-wrap">
            <MiniPreview clientName={clientName} lines={lines} flash={previewFlash} />
          </div>
        </div>
      </div>

      {toast && <div className="landing-workflow-toast">{toast}</div>}

      <div ref={cursorRef} className="landing-workflow-cursor" />
    </div>
  );
}
