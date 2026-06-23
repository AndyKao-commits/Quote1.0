import { useState } from "react";
import { GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react";
import { QUOTE_LIMITS, clampText } from "@/lib/quotes.types";
import type { QuoteLine } from "@/lib/quotes.types";

function newLine(type: QuoteLine["line_type"], sort: number): QuoteLine {
  return {
    sort_order: sort,
    line_type: type,
    name: type === "group" ? "工種項目" : "",
    unit: type === "group" ? "—" : "式",
    quantity: type === "group" ? 0 : 1,
    unit_price: 0,
    note: null,
  };
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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState<Record<number, boolean>>({});

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

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...lines];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function toggleNote(i: number) {
    setNoteOpen((s) => ({ ...s, [i]: !s[i] }));
  }

  return (
    <div className="space-y-2">
      {lines.map((l, i) => {
        const isGroup = l.line_type === "group";
        const showNote = noteOpen[i] || Boolean(l.note?.trim());
        return (
          <div
            key={`${i}-${l.id ?? "new"}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIdx !== null) setDropIdx(i);
            }}
            onDragLeave={() => {
              if (dropIdx === i) setDropIdx(null);
            }}
            onDrop={() => {
              if (dragIdx !== null) move(dragIdx, i);
              setDragIdx(null);
              setDropIdx(null);
            }}
            className={`bdg-card p-3 transition ${
              dragIdx === i
                ? "scale-[0.99] opacity-90 ring-2 ring-[var(--bdg-brand)] shadow-md"
                : dropIdx === i && dragIdx !== null && dragIdx !== i
                  ? "ring-2 ring-[var(--bdg-brand)]/40 bg-[#fff7f3]/60"
                  : ""
            } ${isGroup ? "border-l-4 border-l-[var(--bdg-brand)]" : "ml-2 sm:ml-4"}`}
          >
            <div className="flex min-w-0 items-start gap-2">
              <div
                draggable
                onDragStart={() => {
                  setDragIdx(i);
                  setDropIdx(null);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDropIdx(null);
                }}
                className="quote-line-drag mt-0.5 shrink-0"
                aria-label="拖曳排序"
                role="button"
                tabIndex={0}
              >
                <GripVertical className="h-4 w-4" />
              </div>
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
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <input
                      value={l.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="單位"
                      className="bdg-input py-2"
                    />
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                      placeholder="數量"
                      className="bdg-input py-2"
                    />
                    <input
                      type="number"
                      value={l.unit_price}
                      onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
                      placeholder="單價"
                      className="bdg-input py-2"
                    />
                    <div className="bdg-meta hidden text-right leading-10 sm:block">
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
        項目名稱最多 {QUOTE_LIMITS.lineName} 字、備註最多 {QUOTE_LIMITS.lineNote} 字。拖曳左側可調整順序。
      </p>
    </div>
  );
}
