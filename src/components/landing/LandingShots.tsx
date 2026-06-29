import type { ReactNode } from "react";

const BRAND = "報得過";

const SUMMARY_ROWS = [
  { name: "泥作工程", total: "680,000" },
  { name: "木作工程", total: "920,000" },
  { name: "水電工程", total: "540,000" },
  { name: "油漆工程", total: "380,000" },
  { name: "衛浴設備", total: "1,652,586" },
];

function ShotTableHead({ cols }: { cols: string[] }) {
  return (
    <div
      className="grid border-b border-[#222] bg-[#f5f5f5] font-bold text-[#111]"
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
    >
      {cols.map((h, idx) => (
        <div
          key={h}
          className={`border-r border-[#222] px-0.5 py-1 last:border-r-0 ${
            idx === 1 ? "text-left" : idx >= cols.length - 2 ? "text-right" : "text-center"
          }`}
        >
          {h}
        </div>
      ))}
    </div>
  );
}

function ShotDocShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: string;
}) {
  return (
    <div className="landing-shot-doc">
      <div className="shrink-0 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto h-7 w-7 object-contain" />
        <p className="mt-0.5 font-semibold tracking-wide text-[#222]">{BRAND}</p>
      </div>
      <div className="mt-2 shrink-0 space-y-0.5 text-[#444]">
        <p>
          <span className="text-[#666]">內容：</span>工程施工報價單
        </p>
        <p>
          <span className="text-[#666]">業主：</span>陳先生
        </p>
        <p>
          <span className="text-[#666]">案址：</span>新北市板橋區…
        </p>
      </div>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
      {footer && <p className="mt-1 shrink-0 text-center text-[#999]">{footer}</p>}
    </div>
  );
}

export function ShotSummaryPage() {
  return (
    <ShotDocShell footer="第 1 / 4 頁">
      <div className="flex h-full flex-col overflow-hidden border border-[#222]">
        <ShotTableHead cols={["序號", "名稱", "單位", "數量", "單價", "總價", "備註"]} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {SUMMARY_ROWS.map((row, i) => (
            <div key={row.name} className="grid grid-cols-7 border-b border-[#222]">
              <div className="border-r border-[#222] px-0.5 py-1 text-center">{i + 1}</div>
              <div className="border-r border-[#222] px-0.5 py-1">{row.name}</div>
              <div className="border-r border-[#222] px-0.5 py-1 text-center">式</div>
              <div className="border-r border-[#222] px-0.5 py-1 text-center">1</div>
              <div className="border-r border-[#222] px-0.5 py-1 text-right">—</div>
              <div className="border-r border-[#222] px-0.5 py-1 text-right font-medium">{row.total}</div>
              <div className="px-0.5 py-1" />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-[#222]">
          <div className="grid grid-cols-7 border-b border-[#222]">
            <div className="col-span-5 border-r border-[#222] px-1 py-1 text-right font-bold">合計</div>
            <div className="col-span-2 px-1 py-1 text-right font-bold">4,172,586</div>
          </div>
          <div className="px-1 py-1 text-center tracking-wide text-stone-700">
            肆佰壹拾柒萬貳仟伍佰捌拾陸 元整
          </div>
        </div>
      </div>
    </ShotDocShell>
  );
}

export function ShotDetailPage() {
  const groups = [
    { name: "泥作工程", lines: ["地坪整平", "防水施作", "磁磚鋪設"] },
    { name: "木作工程", lines: ["天花板", "櫃體", "門片"] },
  ];
  return (
    <ShotDocShell footer="第 2 / 4 頁">
      <div className="flex h-full flex-col overflow-hidden border border-[#222]">
        <ShotTableHead cols={["項次", "項目", "單位", "數量", "單價", "複價"]} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="border-b border-[#222] bg-[#faf8f5] px-1 py-1 font-bold">{g.name}</div>
              {g.lines.map((line, i) => (
                <div key={line} className="grid grid-cols-6 border-b border-[#222]">
                  <div className="border-r border-[#222] px-0.5 py-1 text-center">{i + 1}</div>
                  <div className="col-span-2 border-r border-[#222] px-0.5 py-1">{line}</div>
                  <div className="border-r border-[#222] px-0.5 py-1 text-center">式</div>
                  <div className="border-r border-[#222] px-0.5 py-1 text-center">1</div>
                  <div className="px-0.5 py-1 text-right">—</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </ShotDocShell>
  );
}

export function ShotSignPage() {
  return (
    <ShotDocShell footer="第 4 / 4 頁">
      <div className="flex h-full flex-col gap-2">
        <div className="shrink-0 space-y-1 text-stone-600">
          <p>壹、初估報價單時間於三個月內有效。</p>
          <p>貳、除本報價列出之工程外，工程由甲方自行發包…</p>
        </div>
        <div className="shrink-0 border border-[#222] bg-[#f7f7f7] px-2 py-1.5">
          <p className="font-bold">付款明細（未稅）</p>
          <p className="mt-0.5 text-stone-600">第一期 訂金 5% $208,629</p>
          <p className="text-stone-600">第二期 進場款 30% $1,251,776</p>
        </div>
        <div className="mt-auto space-y-2">
          {["業主代表：（甲方）", "設計業務：王小明　0912-345-678（乙方）"].map((label) => (
            <div
              key={label}
              className="flex min-h-[2.25rem] items-end justify-between border border-[#222] px-2 py-1.5"
            >
              <span>{label}</span>
              <span className="text-stone-400">簽章</span>
            </div>
          ))}
        </div>
      </div>
    </ShotDocShell>
  );
}

export function ShotEditorApp() {
  return (
    <div className="landing-shot-app">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--bdg-line)] bg-white px-2 py-1.5">
        <span className="text-[9px] text-stone-500">← 返回</span>
        <div className="flex-1" />
        <span className="rounded border border-[var(--bdg-line)] bg-white px-1.5 py-0.5 text-[8px] font-semibold">儲存</span>
        <span className="rounded bg-[var(--bdg-brand)] px-1.5 py-0.5 text-[8px] font-semibold text-white">PDF</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-2">
        <div className="rounded-lg border border-[var(--bdg-line)] bg-white p-2">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-stone-500">客戶</p>
          <p className="mt-1 rounded border border-[var(--bdg-line)] px-2 py-1 text-[9px]">陳先生</p>
          <p className="mt-1 rounded border border-[var(--bdg-line)] px-2 py-1 text-[9px] text-stone-400">新北市板橋區…</p>
        </div>
        <div className="rounded-lg border border-[var(--bdg-line)] bg-white p-2">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-stone-500">明細</p>
          {SUMMARY_ROWS.map((r) => (
            <div
              key={r.name}
              className="mt-1 flex items-center justify-between rounded border border-[var(--bdg-line)] px-2 py-1 text-[8px]"
            >
              <span className="truncate pr-1">{r.name}</span>
              <span className="shrink-0 text-stone-500">{r.total}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-[var(--bdg-brand)] bg-[#fff7f3] px-2 py-1.5 text-center text-[8px] font-semibold text-[var(--bdg-brand)]">
          全部價格調整 +10%
        </div>
      </div>
    </div>
  );
}

export function ShotPreviewApp() {
  return (
    <div className="landing-shot-app landing-shot-app--preview">
      <div className="flex shrink-0 items-center justify-center border-b border-[var(--bdg-line)] bg-white py-1 text-[8px] text-stone-500">
        拖曳或滑動瀏覽完整報價
      </div>
      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden bg-stone-200/80 p-1.5">
        <div className="h-full min-h-0 w-full overflow-hidden rounded shadow-md ring-1 ring-black/10">
          <ShotSummaryPage />
        </div>
      </div>
    </div>
  );
}

export function ShotDeliverApp() {
  return (
    <div className="landing-shot-app">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-[var(--bdg-line)] bg-white px-2 py-1.5">
        {["儲存", "預覽", "PDF"].map((label) => (
          <span
            key={label}
            className="rounded border border-[var(--bdg-line)] bg-white px-1.5 py-0.5 text-[8px] font-semibold"
          >
            {label}
          </span>
        ))}
        <span className="rounded bg-[#06C755] px-1.5 py-0.5 text-[8px] font-semibold text-white">LINE</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-stone-200/70 p-1.5">
        <div className="h-full overflow-hidden rounded shadow-md ring-1 ring-black/10">
          <ShotSummaryPage />
        </div>
      </div>
    </div>
  );
}

export function LandingShotCard({
  title,
  subtitle,
  variant = "doc",
  children,
}: {
  title: string;
  subtitle: string;
  variant?: "doc" | "app";
  children: ReactNode;
}) {
  return (
    <article className="landing-shot">
      <div className={`landing-shot-frame landing-shot-frame--${variant}`}>
        <div className="landing-shot-fill">{children}</div>
      </div>
      <div className="landing-shot-cap">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
    </article>
  );
}
