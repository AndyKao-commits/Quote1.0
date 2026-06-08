import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ClipboardList, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/lib/db";
import { listMyTeams, type Team } from "@/lib/teams.functions";


export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "案件管理 — 現場紀錄" }] }),
  component: ProjectsList,
});

function ProjectsList() {
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const { data: all = [], isLoading } = useProjects();
  const teamsFn = useServerFn(listMyTeams);
  const { data: teams = [] } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => teamsFn({}) as Promise<Team[]>,
  });
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const kw = q.trim().toLowerCase();
  let projects = kw
    ? all.filter((p) =>
        [p.name, p.customer_name, p.address, p.start_date, p.expected_end_date]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(kw)),
      )
    : all;
  if (teamFilter === "personal") projects = projects.filter((p) => !p.team_id);
  else if (teamFilter !== "all") projects = projects.filter((p) => p.team_id === teamFilter);


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

      {isLoading ? (
        <div className="card-surface p-10 text-center text-sm text-muted-foreground">載入中…</div>
      ) : projects.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">{kw ? "沒有符合的案件" : "還沒有案件，點上方按鈕建立"}</p>
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
                <span className="text-xs text-muted-foreground">{p.start_date}</span>
              </div>
              <h3 className="mt-3 truncate text-base font-semibold">{p.name}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{p.customer_name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.address}</p>
              {p.expected_end_date && (
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">預計完工：{p.expected_end_date}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
