import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PanPreviewViewport } from "@/components/PanPreviewViewport";

const PAGE_W = 794;
const MIN_SCALE = 0.45;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
/** 頂部 sticky header + 預覽工具列預留空間 */
const PREVIEW_SCROLL_OFFSET = 96;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100;
}

function QuotePagePager({
  pageCount,
  activePage,
  onSelect,
}: {
  pageCount: number;
  activePage: number;
  onSelect: (index: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="quote-preview-pager">
      <span className="quote-preview-pager-label">頁面</span>
      <div className="quote-preview-pager-list" role="tablist" aria-label="報價頁面">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            onClick={() => onSelect(i)}
            className={`quote-preview-pager-btn ${activePage === i ? "is-active" : ""}`}
            aria-label={`第 ${i + 1} 頁`}
            aria-selected={activePage === i}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 預覽區：原尺寸拖曳瀏覽 + 可放大縮小 */
export function QuotePreviewPane({
  children,
  className = "",
  fullscreen = false,
  pageScroll = false,
}: {
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
  pageScroll?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(1);
  const scrollLockRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(false);
  const [contentH, setContentH] = useState(1123);
  const [contentW, setContentW] = useState(PAGE_W);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const measureEl = measureRef.current;
    const contentEl = contentRef.current;
    if (!measureEl || !contentEl) return;

    const update = () => {
      const pad = fullscreen ? 32 : 24;
      const avail = measureEl.clientWidth - pad;
      const w = contentEl.offsetWidth || PAGE_W;
      const h = contentEl.offsetHeight || contentEl.scrollHeight;
      setContentW(w);
      setContentH(h);
      if (avail > 0) {
        fitScaleRef.current = clampScale(avail / w);
      }
      setPageCount(contentEl.querySelectorAll("[data-quote-page]").length);
      if (fitWidth) {
        setScale(fitScaleRef.current);
      }
    };

    const ro = new ResizeObserver(update);
    ro.observe(measureEl);
    ro.observe(contentEl);
    update();
    return () => ro.disconnect();
  }, [children, fullscreen, fitWidth]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const contentEl = contentRef.current;
    const measureEl = measureRef.current;
    if (!contentEl || pageCount <= 1) return;

    const pages = Array.from(contentEl.querySelectorAll<HTMLElement>("[data-quote-page]"));
    if (!pages.length) return;

    if (pageScroll) {
      const updateActive = () => {
        if (scrollLockRef.current) return;
        let best = 0;
        let bestScore = -Infinity;
        const anchor = PREVIEW_SCROLL_OFFSET + 32;
        pages.forEach((p, i) => {
          const rect = p.getBoundingClientRect();
          const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, anchor);
          if (visible > bestScore) {
            bestScore = visible;
            best = i;
          }
        });
        if (bestScore > 0) setActivePage(best);
      };

      const onScroll = () => requestAnimationFrame(updateActive);
      window.addEventListener("scroll", onScroll, { passive: true });
      measureEl?.addEventListener("scroll", onScroll, { passive: true });
      updateActive();
      return () => {
        window.removeEventListener("scroll", onScroll);
        measureEl?.removeEventListener("scroll", onScroll);
      };
    }

    if (!scroller) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const index = pages.indexOf(visible[0].target as HTMLElement);
        if (index >= 0) setActivePage(index);
      },
      { root: scroller, threshold: [0.35, 0.5, 0.65] },
    );

    pages.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [pageCount, children, scale, contentW, contentH, pageScroll]);

  const scrollToPage = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const measureEl = measureRef.current;
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const page = contentEl.querySelectorAll<HTMLElement>("[data-quote-page]")[index];
    if (!page) return;

    scrollLockRef.current = true;
    setActivePage(index);

    if (pageScroll) {
      const pageRect = page.getBoundingClientRect();
      const targetY = window.scrollY + pageRect.top - PREVIEW_SCROLL_OFFSET;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

      if (measureEl) {
        const mRect = measureEl.getBoundingClientRect();
        const left = measureEl.scrollLeft + (pageRect.left - mRect.left) - 12;
        measureEl.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
      }

      window.setTimeout(() => {
        scrollLockRef.current = false;
      }, 700);
      return;
    }

    if (!scroller) {
      scrollLockRef.current = false;
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    const offsetX = pageRect.left - scrollerRect.left + scroller.scrollLeft;
    const offsetY = pageRect.top - scrollerRect.top + scroller.scrollTop;

    scroller.scrollTo({
      left: offsetX - (scroller.clientWidth - pageRect.width) / 2,
      top: offsetY - 12,
      behavior: "smooth",
    });

    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 700);
  }, [pageScroll]);

  const setManualScale = useCallback((next: number | ((prev: number) => number)) => {
    setFitWidth(false);
    setScale((prev) => roundScale(clampScale(typeof next === "function" ? next(prev) : next)));
  }, []);

  const zoomIn = useCallback(() => {
    setManualScale((s) => s + SCALE_STEP);
  }, [setManualScale]);

  const zoomOut = useCallback(() => {
    setManualScale((s) => s - SCALE_STEP);
  }, [setManualScale]);

  const resetZoom = useCallback(() => {
    setFitWidth(false);
    setScale(1);
  }, []);

  const fitToWidth = useCallback(() => {
    setFitWidth(true);
    setScale(fitScaleRef.current);
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setManualScale((s) => s + delta);
  }, [setManualScale]);

  const scaledW = contentW * scale;
  const scaledH = contentH * scale;
  const scaleLabel = `${Math.round(scale * 100)}%`;

  const zoomActions = (
    <div className="quote-preview-zoom flex shrink-0 items-center gap-0.5">
      <button type="button" onClick={zoomOut} className="quote-preview-zoom-btn" aria-label="縮小">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={resetZoom} className="quote-preview-zoom-label" title="還原 100%">
        {scaleLabel}
      </button>
      <button type="button" onClick={zoomIn} className="quote-preview-zoom-btn" aria-label="放大">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={fitToWidth}
        className={`quote-preview-zoom-fit hidden sm:inline-flex ${fitWidth ? "is-active" : ""}`}
        title="適應欄寬"
      >
        適應
      </button>
    </div>
  );

  return (
    <PanPreviewViewport
      ref={scrollerRef}
      enablePan={!pageScroll}
      className={`${className} ${fullscreen ? "quote-editor-pan--fullscreen" : "quote-editor-pan"} ${pageScroll ? "quote-editor-pan--page-scroll" : ""}`}
      hint={pageScroll ? (pageCount > 1 ? "點上方頁碼跳轉檢視" : "隨頁面捲動瀏覽預覽") : pageCount > 1 ? "拖曳瀏覽 · 或點上方頁碼跳轉" : "拖曳或滑動瀏覽完整報價"}
      actions={zoomActions}
      pager={
        <QuotePagePager pageCount={pageCount} activePage={activePage} onSelect={scrollToPage} />
      }
    >
      <div
        ref={measureRef}
        className="quote-preview-measure w-full min-w-0"
        onWheel={onWheel}
      >
        <div
          className="quote-preview-scaled mx-auto"
          style={{ width: scaledW, height: scaledH }}
        >
          <div
            ref={contentRef}
            className="quote-preview-root quote-preview-pane-interactive inline-block origin-top-left"
            style={{
              width: contentW > PAGE_W ? contentW : PAGE_W,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </PanPreviewViewport>
  );
}
