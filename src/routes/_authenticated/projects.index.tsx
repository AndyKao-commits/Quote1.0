import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, ClipboardList, Users, Activity, CheckCircle2, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { listMyTeams, type Team } from "@/lib/teams.functions";


export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "案件管理 — 施工紀錄 PRO" }] }),
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
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayPids = [] } = useQuery({
    queryKey: ["today-log-pids", today],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_logs").select("project_id").eq("date", today);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.project_id)));
    },
  });
  const activeCount = all.filter((p) => p.status === "active" || p.status === "review").length;
  const doneCount = all.filter((p) => p.status === "done").length;
  const todayCount = all.filter((p) => todayPids.includes(p.id)).length;
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
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">案件</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理所有工地紀錄</p>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-2">
        <StatChip label="進行中" value={activeCount} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatChip label="今日" value={todayCount} icon={<CalendarCheck className="h-3.5 w-3.5" />} />
        <StatChip label="完工" value={doneCount} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <StatChip label="總數" value={all.length} icon={<ClipboardList className="h-3.5 w-3.5" />} />
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

      {teams.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[{ id: "all", name: "全部" }, { id: "personal", name: "個人案件" }, ...teams].map((t) => (
            <button
              key={t.id}
              onClick={() => setTeamFilter(t.id)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition ${
                teamFilter === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.id !== "all" && t.id !== "personal" && <Users className="h-3 w-3" />}
              {t.name}
            </button>
          ))}
        </div>
      )}

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
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {p.team_id && teamMap.has(p.team_id) && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    <Users className="h-2.5 w-2.5" /> {teamMap.get(p.team_id)}
                  </span>
                )}
                {p.expected_end_date && (
                  <span className="text-[11px] font-medium text-muted-foreground">預計完工：{p.expected_end_date}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function StatChip({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center gap-0.5 px-2 py-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

