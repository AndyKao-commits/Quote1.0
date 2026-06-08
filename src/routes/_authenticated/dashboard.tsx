import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, ClipboardList, Plus, ArrowRight, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "儀表板 — 現場紀錄" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: projects = [], isLoading } = useProjects();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayPids = [] } = useQuery({
    queryKey: ["today-log-pids", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs").select("project_id").eq("date", today);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.project_id)));
    },
  });

  const active = projects.filter((p) => p.status === "active" || p.status === "review");
  const done = projects.filter((p) => p.status === "done");
  const todayProjects = projects.filter((p) => todayPids.includes(p.id));
  const recent = projects.slice(0, 5);

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">今日工地總覽</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">所有案件、施工進度與現場照片，一個地方搞定。</p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="進行中" value={active.length} tone="primary" icon={<Activity className="h-5 w-5" />} />
        <Stat label="已完工" value={done.length} tone="done" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat label="今日施工" value={todayProjects.length} tone="accent" icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="案件總數" value={projects.length} tone="muted" icon={<ClipboardList className="h-5 w-5" />} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold">最近案件</h2>
            <p className="text-xs text-muted-foreground">最新建立的案件，點擊進入紀錄。</p>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            全部案件 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">載入中…</div>
        ) : recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="card-surface group flex items-start justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-muted-foreground">{p.start_date}</span>
                  </div>
                  <h3 className="mt-2 truncate font-semibold">{p.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.customer_name} · {p.address}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "primary" | "done" | "accent" | "muted" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    done: "bg-[color:var(--color-status-done)]/15 text-[color:var(--color-status-done)]",
    accent: "bg-accent/20 text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className="card-surface p-4">
      <div className={`mb-3 inline-grid h-9 w-9 place-items-center rounded-lg ${toneCls}`}>{icon}</div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <ClipboardList className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">還沒有任何案件</h3>
      <p className="max-w-sm text-sm text-muted-foreground">建立第一個案件，開始記錄施工日誌、上傳工地照片。</p>
      <Link to="/projects/new" className="btn-touch mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110">
        <Plus className="h-4 w-4" /> 建立新案件
      </Link>
    </div>
  );
}
