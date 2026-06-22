import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { Move } from "lucide-react";

/** 可拖曳平移＋捲動的預覽視窗（電腦拖移、手機滑動） */
export function PanPreviewViewport({
  children,
  className = "",
  hint = "拖曳或滑動瀏覽完整報價",
  actions,
}: {
  children: ReactNode;
  className?: string;
  hint?: string;
  actions?: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !scrollerRef.current) return;
    const el = scrollerRef.current;
    el.scrollLeft -= e.clientX - lastPos.current.x;
    el.scrollTop -= e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

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
      <div className={`pan-hint ${actions ? "pan-hint--with-actions" : ""}`}>
        <div className="pan-hint-center">
          <Move className="h-3.5 w-3.5 shrink-0" />
          <span>{hint}</span>
        </div>
        {actions ? <div className="pan-hint-actions">{actions}</div> : null}
      </div>
      <div
        ref={scrollerRef}
        className={`pan-scroller ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="pan-content">{children}</div>
      </div>
    </div>
  );
}
