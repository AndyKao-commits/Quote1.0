import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, User, Clock, ClipboardList, Camera, Package, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { getSharedProject } from "@/lib/share.functions";
import { statusLabel } from "@/lib/db";

export const Route = createFileRoute("/share/project/$token")({
  head: () => ({
    meta: [
      { title: "案件進度分享 — 施工紀錄 PRO" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SharePage,
  notFoundComponent: () => (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h2 className="text-lg font-bold">分享連結無效</h2>
        <p className="mt-2 text-sm text-muted-foreground">請聯絡施工方確認最新連結。</p>
      </div>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">FIELD LOG · 業主檢視</div>
            <div className="text-sm font-bold">施工紀錄 PRO</div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">唯讀</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}

function SharePage() {
  const { token } = Route.useParams();
  const fetcher = useServerFn(getSharedProject);
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-project", token],
    queryFn: () => fetcher({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 載入中…
        </div>
      </Shell>
    );
  }
  if (error || !data) throw notFound();

  return <SharedView data={data} />;
}

function SharedView({ data }: { data: Awaited<ReturnType<typeof getSharedProject>> }) {
  const { project, logs, photos, materials, show_amounts, show_materials } = data;
  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const materialTotal = materials.reduce(
    (s, m) => s + Number(m.quantity) * Number(m.unit_price ?? 0),
    0,
  );

  const photosByDate = useMemo(() => groupByDate(photos, (p) => p.created_at), [photos]);

  return (
    <Shell>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {statusLabel(project.status)}
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{project.name}</h1>
        <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{project.customer_name}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />開工 {project.start_date}</span>
          <span className="inline-flex items-center gap-1.5 sm:col-span-2"><MapPin className="h-4 w-4" />{project.address}</span>
          {project.expected_end_date && (
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />預計 {project.expected_end_date}</span>
          )}
        </div>
        {project.scope && (
          <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm">{project.scope}</p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon={<ClipboardList className="h-4 w-4" />} label="日誌" value={logs.length} />
          <Stat icon={<Camera className="h-4 w-4" />} label="照片" value={photos.length} />
          <Stat icon={<Clock className="h-4 w-4" />} label="工時" value={`${totalHours}h`} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><ClipboardList className="h-4 w-4 text-primary" />施工日誌</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無日誌。</p>
        ) : (
          <ul className="space-y-3">
            {logs.map((l) => (
              <li key={l.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{l.date}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{l.hours}h</span>
                  {l.workers && <span className="text-muted-foreground">{l.workers}</span>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{l.content}</p>
                {l.note && <p className="mt-1 text-xs text-muted-foreground">備註：{l.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Camera className="h-4 w-4 text-primary" />現場照片</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無照片。</p>
        ) : (
          <div className="space-y-3">
            {photosByDate.map(([date, items]) => (
              <DateGroup key={date} date={date} count={items.length} defaultOpen>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {items.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                      <img src={p.url} alt={p.note ?? ""} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {p.category === "before" ? "前" : p.category === "during" ? "中" : "後"}
                      </span>
                    </a>
                  ))}
                </div>
              </DateGroup>
            ))}
          </div>
        )}
      </section>

      {show_materials && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Package className="h-4 w-4 text-primary" />材料明細</h2>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無材料。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 text-left">品項</th>
                    <th className="py-2 text-right">數量</th>
                    {show_amounts && <th className="py-2 text-right">金額</th>}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="py-2">
                        <div className="font-medium">{m.name}</div>
                        {m.brand && <div className="text-xs text-muted-foreground">{m.brand}</div>}
                      </td>
                      <td className="py-2 text-right tabular-nums">{m.quantity} {m.unit}</td>
                      {show_amounts && (
                        <td className="py-2 text-right tabular-nums">
                          NT$ {(Number(m.quantity) * Number(m.unit_price ?? 0)).toLocaleString()}
                        </td>
                      )}
                    </tr>
                  ))}
                  {show_amounts && (
                    <tr>
                      <td colSpan={2} className="py-2 text-right text-xs font-semibold">合計</td>
                      <td className="py-2 text-right font-bold tabular-nums">NT$ {materialTotal.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <footer className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
        本頁僅供業主檢視，由施工紀錄 PRO 產生。
      </footer>
    </Shell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-2">
      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function DateGroup({ date, count, defaultOpen, children }: { date: string; count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-secondary/20">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {date}
        </span>
        <span className="text-xs text-muted-foreground">{count} 張</span>
      </button>
      {open && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
}

function groupByDate<T>(items: T[], pick: (t: T) => string): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const d = pick(it).slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(it);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
