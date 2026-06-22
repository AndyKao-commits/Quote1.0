import { useState } from "react";
import { GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react";
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

export function QuoteLineList({
  lines,
  onChange,
}: {
  lines: QuoteLine[];
  onChange: (lines: QuoteLine[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState<Record<number, boolean>>({});

  function update(i: number, patch: Partial<QuoteLine>) {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
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
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx !== null) move(dragIdx, i);
              setDragIdx(null);
            }}
            className={`rounded-xl border bg-white p-2 transition ${
              dragIdx === i ? "border-[#C45A3C] opacity-60" : "border-[#e8dfd3]"
            } ${isGroup ? "border-l-4 border-l-[#C45A3C] bg-[#FDFBF7]" : "ml-3 border-l-2 border-l-[#ece3d6]"}`}
          >
            <div className="flex min-w-0 items-start gap-1">
              <div
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragEnd={() => setDragIdx(null)}
                className="mt-2 shrink-0 cursor-grab touch-none text-[#8a7b6a] active:cursor-grabbing"
                aria-label="拖曳排序"
                role="button"
                tabIndex={0}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {isGroup && (
                    <span className="shrink-0 rounded bg-[#C45A3C]/10 px-2 py-0.5 text-[10px] font-bold text-[#C45A3C]">
                      大項目
                    </span>
                  )}
                  {!isGroup && (
                    <span className="shrink-0 rounded bg-[#ece3d6] px-2 py-0.5 text-[10px] font-semibold text-[#6b5c4d]">
                      小項目
                    </span>
                  )}
                  <textarea
                    value={l.name}
                    rows={2}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder={isGroup ? "工種名稱，例如：泥作工程" : "項目說明"}
                    className="min-w-0 flex-1 resize-y rounded-lg border border-[#ece3d6] px-2 py-1.5 text-sm break-words outline-none focus:border-[#C45A3C]"
                  />
                </div>
                {!isGroup && (
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                    <input
                      value={l.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="單位"
                      className="min-w-0 rounded-lg border border-[#ece3d6] px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                      placeholder="數量"
                      className="min-w-0 rounded-lg border border-[#ece3d6] px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={l.unit_price}
                      onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
                      placeholder="單價"
                      className="min-w-0 rounded-lg border border-[#ece3d6] px-2 py-1.5 text-sm"
                    />
                    <div className="hidden text-right text-xs leading-8 text-[#6b5c4d] sm:block">
                      小計 {(l.quantity * l.unit_price).toLocaleString()}
                    </div>
                  </div>
                )}
                {showNote && (
                  <textarea
                    value={l.note ?? ""}
                    onChange={(e) => update(i, { note: e.target.value })}
                    placeholder="此項目備註（會顯示在 PDF）"
                    rows={2}
                    className="w-full resize-y rounded-lg border border-[#ece3d6] bg-[#FDFBF7] px-2 py-1.5 text-xs break-words outline-none focus:border-[#C45A3C]"
                  />
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleNote(i)}
                  className={`rounded-lg p-1.5 ${showNote ? "bg-[#C45A3C]/10 text-[#C45A3C]" : "text-[#8a7b6a] hover:bg-[#F5F0E8]"}`}
                  title="備註"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(i)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange([...lines, newLine("group", lines.length)])}
          className="inline-flex items-center gap-1 rounded-full border border-[#C45A3C] px-3 py-1.5 text-xs font-semibold text-[#C45A3C]"
        >
          <Plus className="h-3.5 w-3.5" /> 新增大項目（工種）
        </button>
        <button
          type="button"
          onClick={() => onChange([...lines, newLine("item", lines.length)])}
          className="inline-flex items-center gap-1 rounded-full bg-[#C45A3C] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" /> 新增小項目
        </button>
      </div>
      <p className="text-[11px] text-[#8a7b6a]">拖曳左側 ⋮⋮ 可調整順序。大項目為工種標題，小項目計入金額。</p>
    </div>
  );
}
