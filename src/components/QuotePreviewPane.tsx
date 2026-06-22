import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PanPreviewViewport } from "@/components/PanPreviewViewport";

const PAGE_W = 794;
const MIN_SCALE = 0.45;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100;
}

/** 預覽區：原尺寸拖曳瀏覽 + 可放大縮小 */
export function QuotePreviewPane({
  children,
  className = "",
  fullscreen = false,
}: {
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(false);
  const [contentH, setContentH] = useState(1123);

  useEffect(() => {
    const measureEl = measureRef.current;
    const contentEl = contentRef.current;
    if (!measureEl || !contentEl) return;

    const update = () => {
      const pad = fullscreen ? 32 : 24;
      const avail = measureEl.clientWidth - pad;
      if (avail > 0) {
        fitScaleRef.current = clampScale(avail / PAGE_W);
      }
      setContentH(contentEl.offsetHeight || contentEl.scrollHeight);
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

  const scaledW = PAGE_W * scale;
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
      className={`${className} ${fullscreen ? "quote-editor-pan--fullscreen" : "quote-editor-pan"}`}
      hint="拖曳或滑動瀏覽完整報價"
      actions={zoomActions}
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
            className="quote-preview-root inline-block origin-top-left"
            style={{
              width: PAGE_W,
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
