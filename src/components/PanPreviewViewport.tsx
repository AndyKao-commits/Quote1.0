import type { ReactNode, PointerEvent as ReactPointerEvent, Ref } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";

export type PanContentSize = {
  width: number;
  height: number;
};

/** 可拖曳平移＋捲動的預覽視窗（滑鼠拖移、手指滑動皆透過 scroll 平移） */
export const PanPreviewViewport = forwardRef(function PanPreviewViewport(
  {
    children,
    className = "",
    hint = "拖曳或滑動瀏覽完整報價",
    actions,
    pager,
    contentSize,
  }: {
    children: ReactNode;
    className?: string;
    hint?: string;
    actions?: ReactNode;
    pager?: ReactNode;
    contentSize?: PanContentSize;
  },
  ref: Ref<HTMLDivElement>,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const setScrollerRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft -= dx;
    el.scrollTop -= dy;
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    panBy(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [panBy]);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      dragging.current = true;
      setIsDragging(true);
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      panBy(t.clientX - lastPos.current.x, t.clientY - lastPos.current.y);
      lastPos.current = { x: t.clientX, y: t.clientY };
    };

    const endTouch = () => {
      dragging.current = false;
      setIsDragging(false);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", endTouch);
    el.addEventListener("touchcancel", endTouch);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", endTouch);
      el.removeEventListener("touchcancel", endTouch);
    };
  }, [panBy]);

  return (
    <div className={`pan-viewport ${className}`}>
      {pager ? <div className="pan-pager">{pager}</div> : null}
      <div className={`pan-hint ${actions ? "pan-hint--with-actions" : ""}`}>
        <div className="pan-hint-center">
          <Move className="h-3.5 w-3.5 shrink-0" />
          <span>{hint}</span>
        </div>
        {actions ? <div className="pan-hint-actions">{actions}</div> : null}
      </div>
      <div
        ref={setScrollerRef}
        className={`pan-scroller ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="pan-content"
          style={
            contentSize
              ? { width: contentSize.width, height: contentSize.height }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
});
