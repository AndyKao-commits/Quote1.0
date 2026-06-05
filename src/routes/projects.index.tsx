import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listProjects } from "@/lib/storage";
import { useStoreVersion } from "@/hooks/use-storage";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "案件管理 — 水電施工紀錄 Pro" },
      { name: "description", content: "搜尋客戶、案件、地址、日期。" },
    ],
  }),
  component: ProjectsList,
});

function ProjectsList() {
  useStoreVersion();
  const [q, setQ] = useState("");
  const all = listProjects();
  const kw = q.trim().toLowerCase();
  const projects = kw
    ? all.filter((p) =>
        [p.name, p.customerName, p.address, p.startDate, p.expectedEndDate]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(kw)),
      )
    : all;

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">案件管理</h1>
          <p className="text-sm text-muted-foreground">{all.length} 件總計</p>
        </div>
        <Link
          to="/projects/new"
          className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> 新增案件
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋客戶 / 案件 / 地址 / 日期"
          className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {projects.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            {kw ? "沒有符合的案件" : "還沒有案件，點上方按鈕建立"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="card-surface group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={p.status} />
                <span className="text-xs text-muted-foreground">{p.startDate}</span>
              </div>
              <h3 className="mt-3 truncate text-base font-semibold">{p.name}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{p.customerName}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.address}</p>
              {p.expectedEndDate && (
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  預計完工：{p.expectedEndDate}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
