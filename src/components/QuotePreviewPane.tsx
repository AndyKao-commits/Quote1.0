import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PanPreviewViewport } from "@/components/PanPreviewViewport";

const PAGE_W = 794;
const MIN_SCALE = 0.45;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
const PAGE_SCROLL_PAD = 12;

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

/** 預覽區：桌面版 sticky（貼 header 下緣跟著頁面捲）+ 拖曳瀏覽 + 縮放 + 頁碼跳轉 */
export function QuotePreviewPane({
  children,
  className = "",
  fullscreen = false,
}: {
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
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
    if (!scroller || !contentEl || pageCount <= 1) return;

    const pages = Array.from(contentEl.querySelectorAll<HTMLElement>("[data-quote-page]"));
    if (!pages.length) return;

    const updateActive = () => {
      if (scrollLockRef.current) return;
      const sRect = scroller.getBoundingClientRect();
      const anchorX = sRect.left + PAGE_SCROLL_PAD;
      const anchorY = sRect.top + PAGE_SCROLL_PAD;

      let best = 0;
      let bestScore = -Infinity;
      pages.forEach((p, i) => {
        const r = p.getBoundingClientRect();
        const overlapW = Math.min(r.right, sRect.right) - Math.max(r.left, sRect.left);
        const overlapH = Math.min(r.bottom, sRect.bottom) - Math.max(r.top, sRect.top);
        if (overlapW <= 0 || overlapH <= 0) return;
        const area = overlapW * overlapH;
        const dist = Math.hypot(r.left - anchorX, r.top - anchorY);
        const score = area - dist * 0.15;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      });

      if (bestScore > -Infinity) setActivePage(best);
    };

    const onScroll = () => requestAnimationFrame(updateActive);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    updateActive();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [pageCount, children, scale, contentW, contentH]);

  const scrollToPage = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const contentEl = contentRef.current;
    if (!scroller || !contentEl) return;

    const page = contentEl.querySelectorAll<HTMLElement>("[data-quote-page]")[index];
    if (!page) return;

    scrollLockRef.current = true;
    setActivePage(index);

    const pageRect = page.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    scroller.scrollTo({
      left: scroller.scrollLeft + (pageRect.left - scrollerRect.left) - PAGE_SCROLL_PAD,
      top: scroller.scrollTop + (pageRect.top - scrollerRect.top) - PAGE_SCROLL_PAD,
      behavior: "smooth",
    });

    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 500);
  }, []);

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
      className={`${className} ${fullscreen ? "quote-editor-pan--fullscreen" : "quote-editor-pan"}`}
      hint={pageCount > 1 ? "拖曳瀏覽 · 或點上方頁碼跳轉" : "拖曳或滑動瀏覽完整報價"}
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
