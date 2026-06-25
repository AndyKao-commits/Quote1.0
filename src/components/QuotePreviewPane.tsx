import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PanPreviewViewport } from "@/components/PanPreviewViewport";

const PAGE_W = 794;
const MIN_SCALE = 0.2;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
const PAGE_SCROLL_PAD = 12;
const PAN_MARGIN = 28;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100;
}

function measurePreviewContent(contentEl: HTMLElement) {
  const pages = contentEl.querySelectorAll<HTMLElement>("[data-quote-page]");
  const pagesWrap = contentEl.querySelector<HTMLElement>(".quote-preview-pages");
  const pageCount = pages.length;

  let w = contentEl.offsetWidth || PAGE_W;
  let h = contentEl.scrollHeight || contentEl.offsetHeight || 1123;

  if (pagesWrap) {
    w = Math.max(w, pagesWrap.scrollWidth, pagesWrap.offsetWidth);
    h = Math.max(h, pagesWrap.scrollHeight, pagesWrap.offsetHeight);
  }

  if (pageCount > 0) {
    let stacked = 0;
    pages.forEach((page) => {
      stacked += page.offsetHeight;
    });
    stacked += Math.max(0, pageCount - 1) * 6;
    h = Math.max(h, stacked);
  }

  return { w, h, pageCount };
}

function measurePageFitScale(
  contentEl: HTMLElement,
  availW: number,
  availH: number,
  pageIndex = 0,
) {
  const pages = contentEl.querySelectorAll<HTMLElement>("[data-quote-page]");
  if (!pages.length || availW <= 0) {
    return clampScale(availW / PAGE_W);
  }
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const pw = page.offsetWidth || PAGE_W;
  const ph = page.offsetHeight || 1123;
  const pad = PAN_MARGIN * 2;
  const fitW = (availW - pad) / pw;
  const fitH = availH > 0 ? (availH - pad) / ph : fitW;
  return clampScale(Math.min(fitW, fitH));
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

/** 預覽區：桌面版 sticky + 拖曳/滑動瀏覽 + 縮放 + 頁碼跳轉 */
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
  const contentRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(1);
  const scrollLockRef = useRef(false);
  const lastCenterKeyRef = useRef("");
  const didMobileFitRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(false);
  const [contentH, setContentH] = useState(1123);
  const [contentW, setContentW] = useState(PAGE_W);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const scroller = scrollerRef.current;
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const update = () => {
      const pad = fullscreen ? 28 : 20;
      const vw = scroller?.clientWidth ?? 0;
      const vh = scroller?.clientHeight ?? 0;
      const avail = Math.max(0, vw - pad);
      const { w, h, pageCount: count } = measurePreviewContent(contentEl);
      setContentW(w);
      setContentH(h);
      setViewport({ w: vw, h: vh });
      setPageCount(count);
      if (avail > 0) {
        fitScaleRef.current = measurePageFitScale(contentEl, avail, Math.max(0, vh - pad), activePage);
      }
      if (fitWidth) {
        setScale(fitScaleRef.current);
      }
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update);
    });
    if (scroller) ro.observe(scroller);
    ro.observe(contentEl);
    const pagesWrap = contentEl.querySelector(".quote-preview-pages");
    if (pagesWrap) ro.observe(pagesWrap);
    contentEl.querySelectorAll("[data-quote-page]").forEach((page) => ro.observe(page));
    update();
    const t = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [children, fullscreen, fitWidth, activePage]);

  useEffect(() => {
    if (!fullscreen) return;
    setFitWidth(true);
    setScale(fitScaleRef.current);
    lastCenterKeyRef.current = "";
  }, [fullscreen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!fullscreen && mq.matches && !didMobileFitRef.current) {
      didMobileFitRef.current = true;
      setFitWidth(true);
      setScale(fitScaleRef.current);
    }
  }, [fullscreen]);

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

  const scaledW = contentW * scale;
  const scaledH = contentH * scale;
  const canvasW = Math.ceil(Math.max(scaledW + PAN_MARGIN * 2, viewport.w + 1));
  const canvasH = Math.ceil(Math.max(scaledH + PAN_MARGIN * 2, viewport.h + 1));

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !viewport.w || !viewport.h) return;

    const key = `${scale}|${canvasW}|${canvasH}|${viewport.w}|${viewport.h}`;
    if (lastCenterKeyRef.current === key) return;
    lastCenterKeyRef.current = key;

    requestAnimationFrame(() => {
      const docFitsW = scaledW + PAN_MARGIN * 2 <= viewport.w;
      const docFitsH = scaledH + PAN_MARGIN * 2 <= viewport.h;
      scroller.scrollLeft = docFitsW
        ? Math.max(0, (canvasW - viewport.w) / 2)
        : PAN_MARGIN;
      scroller.scrollTop = docFitsH
        ? Math.max(0, (canvasH - viewport.h) / 2)
        : PAN_MARGIN;
    });
  }, [scale, canvasW, canvasH, viewport.w, viewport.h]);

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
    const scroller = scrollerRef.current;
    const contentEl = contentRef.current;
    if (contentEl && scroller) {
      const pad = fullscreen ? 28 : 20;
      const avail = Math.max(0, scroller.clientWidth - pad);
      const availH = Math.max(0, scroller.clientHeight - pad);
      fitScaleRef.current = measurePageFitScale(contentEl, avail, availH, activePage);
    }
    setFitWidth(true);
    setScale(fitScaleRef.current);
    scrollToPage(activePage);
  }, [activePage, fullscreen, scrollToPage]);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setManualScale((s) => s + delta);
  }, [setManualScale]);

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
        className={`quote-preview-zoom-fit ${fitWidth ? "is-active" : ""}`}
        title="適應單頁"
      >
        適應
      </button>
    </div>
  );

  return (
    <PanPreviewViewport
      ref={scrollerRef}
      className={`${className} ${fullscreen ? "quote-editor-pan--fullscreen" : "quote-editor-pan"}`}
      hint={pageCount > 1 ? "拖曳或滑動瀏覽 · 點頁碼" : "拖曳或滑動瀏覽報價"}
      contentSize={{ width: canvasW, height: canvasH }}
      actions={zoomActions}
      pager={
        <QuotePagePager pageCount={pageCount} activePage={activePage} onSelect={scrollToPage} />
      }
    >
      <div className="quote-preview-canvas" style={{ padding: PAN_MARGIN }} onWheel={onWheel}>
        <div className="quote-preview-scaled" style={{ width: scaledW, height: scaledH }}>
          <div
            ref={contentRef}
            className="quote-preview-root quote-preview-pane-interactive"
            style={{
              width: contentW > PAGE_W ? contentW : PAGE_W,
              height: contentH,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </PanPreviewViewport>
  );
}
