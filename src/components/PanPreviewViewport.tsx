import type { ReactNode, PointerEvent as ReactPointerEvent, Ref } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";

export type PanContentSize = {
  width: number;
  height: number;
};

function useTouchPan() {
  const [touchPan, setTouchPan] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setTouchPan(mq.matches || navigator.maxTouchPoints > 0);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return touchPan;
}

/** 可拖曳平移＋捲動的預覽視窗（桌面拖移、手機原生滑動） */
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
  const touchPan = useTouchPan();

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
    if (touchPan || e.button !== 0) return;
    dragging.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [touchPan]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (touchPan || !dragging.current) return;
    panBy(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [panBy, touchPan]);

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
        className={`pan-scroller ${touchPan ? "pan-scroller--native" : ""} ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={touchPan ? undefined : onPointerDown}
        onPointerMove={touchPan ? undefined : onPointerMove}
        onPointerUp={touchPan ? undefined : endDrag}
        onPointerCancel={touchPan ? undefined : endDrag}
        onPointerLeave={touchPan ? undefined : endDrag}
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
