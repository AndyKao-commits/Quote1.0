import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { PRICE_ADJUST_LIMITS } from "@/lib/quotes.types";

const MIN = PRICE_ADJUST_LIMITS.min;
const MAX = PRICE_ADJUST_LIMITS.max;
const ZERO_POS = ((0 - MIN) / (MAX - MIN)) * 100;

function formatPct(pct: number) {
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}

export function QuotePriceAdjustBar({
  value,
  onChange,
  onReset,
  disabled,
}: {
  value: number;
  onChange: (pct: number) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 rounded border border-[var(--bdg-line)] bg-[var(--bdg-surface-soft)]/80 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="bdg-label mb-0">全部價格調整</span>
        <div className="flex items-center gap-2">
          <span
            className={`min-w-[3.5rem] text-right text-sm font-semibold tabular-nums ${
              value > 0 ? "text-[var(--bdg-brand)]" : value < 0 ? "text-rose-600" : "text-stone-500"
            }`}
          >
            {formatPct(value)}
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={disabled || value === 0}
            className="bdg-btn bdg-btn-secondary flex items-center gap-1 px-2 py-1 text-xs disabled:opacity-40"
            title="復原至調整前價格"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            復原
          </button>
        </div>
      </div>
      <div className="relative">
        <div
          className="pointer-events-none absolute top-[calc(50%-2px)] z-10 h-3 w-px -translate-x-1/2 bg-stone-300"
          style={{ left: `${ZERO_POS}%` }}
          aria-hidden
        />
        <Slider
          min={MIN}
          max={MAX}
          step={1}
          value={[value]}
          disabled={disabled}
          onValueChange={([pct]) => onChange(pct)}
          className="quote-price-adjust-slider py-2"
        />
        <div className="relative mt-1 h-4 text-[11px] leading-none text-stone-400">
          <span className="absolute left-0">{MIN}%</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${ZERO_POS}%` }}>
            0%
          </span>
          <span className="absolute right-0">+{MAX}%</span>
        </div>
      </div>
      <p className="bdg-meta mt-2">拖曳即時調整所有項目單價；按「復原」或拖回 0% 可還原</p>
    </div>
  );
}
