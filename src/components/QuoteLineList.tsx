import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react";
import { QUOTE_LIMITS, clampText } from "@/lib/quotes.types";
import type { QuoteLine } from "@/lib/quotes.types";

function newLine(type: QuoteLine["line_type"], sort: number): QuoteLine {
  return {
    sort_order: sort,
    line_type: type,
    name: type === "group" ? "工種項目" : "",
    unit: type === "group" ? "—" : "",
    quantity: type === "group" ? 0 : 0,
    unit_price: 0,
    note: null,
  };
}

function reindex(lines: QuoteLine[]) {
  return lines.map((l, i) => ({ ...l, sort_order: i }));
}

function insertGroupAfterSection(lines: QuoteLine[], groupIndex: number) {
  let insertAt = groupIndex + 1;
  while (insertAt < lines.length && lines[insertAt].line_type !== "group") {
    insertAt++;
  }
  const next = [...lines];
  next.splice(insertAt, 0, newLine("group", insertAt));
  return reindex(next);
}

function insertItemAfter(lines: QuoteLine[], index: number) {
  const next = [...lines];
  next.splice(index + 1, 0, newLine("item", index + 1));
  return reindex(next);
}

function getGroupBlockEnd(lines: QuoteLine[], groupIndex: number) {
  let end = groupIndex + 1;
  while (end < lines.length && lines[end].line_type !== "group") end++;
  return end;
}

function getDragBlock(lines: QuoteLine[], from: number) {
  if (lines[from]?.line_type === "group") {
    return { start: from, end: getGroupBlockEnd(lines, from) };
  }
  return { start: from, end: from + 1 };
}

function insertIndexAtY(refs: (HTMLDivElement | null)[], clientY: number, count: number) {
  for (let i = 0; i < count; i++) {
    const el = refs[i];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (clientY < r.top + r.height / 2) return i;
  }
  return count - 1;
}

const AUTO_SCROLL_EDGE = 100;
const AUTO_SCROLL_MAX = 16;

function autoScrollDelta(clientY: number) {
  const vh = window.innerHeight;
  if (clientY < AUTO_SCROLL_EDGE) {
    const t = (AUTO_SCROLL_EDGE - clientY) / AUTO_SCROLL_EDGE;
    return -Math.max(2, t * AUTO_SCROLL_MAX);
  }
  if (clientY > vh - AUTO_SCROLL_EDGE) {
    const t = (clientY - (vh - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE;
    return Math.max(2, t * AUTO_SCROLL_MAX);
  }
  return 0;
}

function scrollWindowBy(delta: number) {
  if (!delta) return;
  const root = document.documentElement;
  const max = Math.max(0, root.scrollHeight - window.innerHeight);
  const next = Math.min(max, Math.max(0, root.scrollTop + delta));
  window.scrollTo({ top: next, behavior: "auto" });
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = Array.from(value).length;
  return (
    <p className={`bdg-char-count ${len >= max ? "is-over" : ""}`}>
      {len}/{max}
    </p>
  );
}

export function QuoteLineList({
  lines,
  onChange,
}: {
  lines: QuoteLine[];
  onChange: (lines: QuoteLine[]) => void;
}) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);
  const dropIdxRef = useRef<number | null>(null);
  const linesRef = useRef(lines);
  const pointerYRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState<Record<number, boolean>>({});

  linesRef.current = lines;

  const setDrop = useCallback((idx: number | null) => {
    dropIdxRef.current = idx;
    setDropIdx(idx);
  }, []);

  function update(i: number, patch: Partial<QuoteLine>) {
    const next = [...lines];
    const merged = { ...next[i], ...patch };
    if (patch.name !== undefined) {
      merged.name = clampText(patch.name, QUOTE_LIMITS.lineName);
    }
    if (patch.note !== undefined && patch.note !== null) {
      merged.note = patch.note ? clampText(patch.note, QUOTE_LIMITS.lineNote) : null;
    }
    next[i] = merged;
    onChange(next);
  }

  function remove(i: number) {
    onChange(lines.filter((_, j) => j !== i));
  }

  function toggleNote(i: number) {
    setNoteOpen((s) => ({ ...s, [i]: !s[i] }));
  }

  const endDrag = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    const from = dragFromRef.current;
    const to = dropIdxRef.current;
    const current = linesRef.current;
    if (from !== null && to !== null && from !== to) {
      const { start, end } = getDragBlock(current, from);
      const blockLen = end - start;
      let insertAt = to;
      if (from < insertAt) insertAt -= blockLen;
      if (insertAt >= 0 && insertAt <= current.length - blockLen && insertAt !== start) {
        const next = [...current];
        const block = next.splice(start, blockLen);
        next.splice(insertAt, 0, ...block);
        onChange(reindex(next));
      }
    }
    dragFromRef.current = null;
    dropIdxRef.current = null;
    setDragIdx(null);
    setDropIdx(null);
  }, [onChange]);

  const onDragMove = useCallback(
    (clientY: number) => {
      if (dragFromRef.current === null) return;
      pointerYRef.current = clientY;
      setDrop(insertIndexAtY(rowRefs.current, clientY, linesRef.current.length));
    },
    [setDrop],
  );

  const autoScrollTick = useCallback(() => {
    if (dragFromRef.current === null) {
      scrollRafRef.current = null;
      return;
    }
    const y = pointerYRef.current;
    scrollWindowBy(autoScrollDelta(y));
    setDrop(insertIndexAtY(rowRefs.current, y, linesRef.current.length));
    scrollRafRef.current = requestAnimationFrame(autoScrollTick);
  }, [setDrop]);

  const startAutoScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(autoScrollTick);
  }, [autoScrollTick]);

  useEffect(() => {
    if (dragIdx === null) return;

    startAutoScroll();

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      onDragMove(e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      onDragMove(e.touches[0].clientY);
    };
    const onUp = () => endDrag();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [dragIdx, endDrag, onDragMove, startAutoScroll]);

  const onHandlePointerDown = (i: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    dragFromRef.current = i;
    setDragIdx(i);
    setDrop(i);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <div className={`space-y-2 ${dragIdx !== null ? "quote-line-list--dragging" : ""}`}>
      {lines.map((l, i) => {
        const isGroup = l.line_type === "group";
        const showNote = noteOpen[i] || Boolean(l.note?.trim());
        const isDragging = dragIdx === i;
        const isDropTarget = dropIdx === i && dragIdx !== null && dragIdx !== i;

        return (
          <div key={`${i}-${l.id ?? "new"}`} className="relative">
            {isDropTarget && <div className="quote-line-drop-bar" aria-hidden />}
            <div
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={`bdg-card quote-line-card relative p-3 pb-10 transition-all duration-150 ${
                isDragging
                  ? "quote-line-card--dragging"
                  : isDropTarget
                    ? "quote-line-card--drop-target"
                    : ""
              } ${isGroup ? "border-l-4 border-l-[var(--bdg-brand)]" : "ml-2 sm:ml-4"}`}
            >
              <div className="flex min-w-0 items-start gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => onHandlePointerDown(i, e)}
                  className={`quote-line-drag mt-0.5 shrink-0 ${isDragging ? "is-active" : ""}`}
                  aria-label="拖曳排序"
                >
                  <GripVertical className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="bdg-label mb-0">{isGroup ? "工種" : "項目"}</span>
                      <CharCount value={l.name} max={QUOTE_LIMITS.lineName} />
                    </div>
                    <textarea
                      value={l.name}
                      rows={isGroup ? 1 : 2}
                      maxLength={QUOTE_LIMITS.lineName}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder={isGroup ? "例如：泥作工程" : "項目說明"}
                      className="bdg-input min-h-[2.75rem] resize-y break-words"
                    />
                  </div>
                  {!isGroup && (
                    <div className="quote-line-fields">
                      <input
                        value={l.unit}
                        onChange={(e) => update(i, { unit: e.target.value })}
                        placeholder="單位"
                        className="bdg-input quote-line-field-unit py-2"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={l.quantity === 0 ? "" : l.quantity}
                        onChange={(e) =>
                          update(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })
                        }
                        placeholder="數量"
                        className="bdg-input quote-line-field-qty py-2"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={l.unit_price === 0 ? "" : l.unit_price}
                        onChange={(e) =>
                          update(i, { unit_price: e.target.value === "" ? 0 : Number(e.target.value) })
                        }
                        placeholder="金額"
                        className="bdg-input quote-line-field-price py-2"
                      />
                      <div className="quote-line-subtotal bdg-meta">
                        小計 {(l.quantity * l.unit_price).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {showNote && (
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="bdg-label mb-0">備註（PDF 顯示）</span>
                        <CharCount value={l.note ?? ""} max={QUOTE_LIMITS.lineNote} />
                      </div>
                      <textarea
                        value={l.note ?? ""}
                        maxLength={QUOTE_LIMITS.lineNote}
                        onChange={(e) => update(i, { note: e.target.value })}
                        placeholder="選填"
                        rows={2}
                        className="bdg-input resize-y bg-stone-50/80 break-words"
                      />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleNote(i)}
                    className={`rounded p-1.5 ${showNote ? "bg-stone-100 text-[var(--bdg-brand)]" : "text-stone-400 hover:bg-stone-50"}`}
                    title="備註"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange(isGroup ? insertGroupAfterSection(lines, i) : insertItemAfter(lines, i))
                }
                className="quote-line-add-corner"
                title={isGroup ? "在此工種區塊後新增工種" : "在下方新增項目"}
                aria-label={isGroup ? "新增工種" : "新增項目"}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 border-t border-[var(--bdg-line)] pt-3">
        <button
          type="button"
          onClick={() => onChange([...lines, newLine("group", lines.length)])}
          className="bdg-btn bdg-btn-secondary"
        >
          <Plus className="h-3.5 w-3.5" /> 工種
        </button>
        <button
          type="button"
          onClick={() => onChange([...lines, newLine("item", lines.length)])}
          className="bdg-btn bdg-btn-primary"
        >
          <Plus className="h-3.5 w-3.5" /> 項目
        </button>
      </div>
      <p className="bdg-meta leading-relaxed">
        項目名稱最多 {QUOTE_LIMITS.lineName} 字、備註最多 {QUOTE_LIMITS.lineNote} 字。按住左側 ≡ 拖曳排序，靠近螢幕上下緣會自動捲動；卡片右下角 ＋ 可快速新增。
      </p>
    </div>
  );
}
