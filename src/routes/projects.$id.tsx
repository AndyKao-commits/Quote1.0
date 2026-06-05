import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Phone, MapPin, Calendar, Trash2, ClipboardList, Camera, Info,
  Clock, User, Image as ImageIcon, Package, ScanLine,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { LogForm } from "@/components/LogForm";
import { PhotoUploader, PhotoLightbox } from "@/components/PhotoUploader";
import { QuoteScanner, ManualMaterialForm } from "@/components/QuoteScanner";
import {
  getProject, listLogs, listPhotos, listMaterials, deleteProject, deleteLog, deletePhoto, deleteMaterial,
  saveProject, statusLabel, type ProjectStatus, type PhotoCategory,
} from "@/lib/storage";
import { useStoreVersion } from "@/hooks/use-storage";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [{ title: `案件詳情 — 水電施工紀錄 Pro` }, { name: "description", content: `案件 ${params.id}` }],
  }),
  component: ProjectDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="card-surface p-10 text-center">
        <h2 className="text-lg font-bold">找不到此案件</h2>
        <p className="mt-1 text-sm text-muted-foreground">案件可能已被刪除。</p>
        <Link to="/projects" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">返回案件列表</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><div className="card-surface p-6 text-sm text-destructive">{error.message}</div></AppShell>
  ),
});

type Tab = "logs" | "photos" | "materials" | "info";

function ProjectDetail() {
  useStoreVersion();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const project = getProject(id);
  const [tab, setTab] = useState<Tab>("logs");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoCategory | "all">("all");

  if (!project) throw notFound();

  const logs = listLogs(project.id);
  const allPhotos = listPhotos(project.id);
  const photos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.category === photoFilter);
  const materials = listMaterials(project.id);
  const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
  const materialTotal = materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);

  const updateStatus = (s: ProjectStatus) => saveProject({ ...project, status: s });

  const remove = () => {
    if (confirm(`確定刪除「${project.name}」？所有日誌與照片都會一併刪除。`)) {
      deleteProject(project.id);
      navigate({ to: "/projects" });
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/projects" })}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <header className="card-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <StatusBadge status={project.status} />
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{project.name}</h1>
            <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{project.customerName}</span>
              {project.customerPhone && (
                <a href={`tel:${project.customerPhone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Phone className="h-4 w-4" />{project.customerPhone}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 sm:col-span-2"><MapPin className="h-4 w-4" />{project.address}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />開工 {project.startDate}</span>
              {project.expectedEndDate && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />預計 {project.expectedEndDate}</span>
              )}
            </div>
          </div>
          <button
            onClick={remove}
            className="btn-touch inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> 刪除
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs font-semibold text-muted-foreground">變更狀態：</span>
          {(["pending", "active", "review", "done"] as ProjectStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                project.status === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
          <Mini label="日誌" value={logs.length} icon={<ClipboardList className="h-4 w-4" />} />
          <Mini label="照片" value={allPhotos.length} icon={<ImageIcon className="h-4 w-4" />} />
          <Mini label="總工時" value={`${totalHours}h`} icon={<Clock className="h-4 w-4" />} />
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-border">
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")} icon={<ClipboardList className="h-4 w-4" />}>施工日誌</TabBtn>
        <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<Camera className="h-4 w-4" />}>照片</TabBtn>
        <TabBtn active={tab === "info"} onClick={() => setTab("info")} icon={<Info className="h-4 w-4" />}>資訊</TabBtn>
      </div>

      <div className="mt-5">
        {tab === "logs" && (
          <div className="space-y-4">
            <LogForm projectId={project.id} />
            {logs.length === 0 ? (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">
                還沒有施工日誌，記下今天做了什麼吧。
              </div>
            ) : (
              <ul className="space-y-3">
                {logs.map((l) => (
                  <li key={l.id} className="card-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{l.date}</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{l.hours}h</span>
                          {l.workers && <span className="inline-flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" />{l.workers}</span>}
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{l.content}</p>
                        {l.note && <p className="mt-2 text-xs text-muted-foreground">備註：{l.note}</p>}
                      </div>
                      <button
                        onClick={() => confirm("刪除這筆日誌？") && deleteLog(l.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "photos" && (
          <div className="space-y-4">
            <PhotoUploader project={project} />

            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { v: "all", label: `全部 ${allPhotos.length}` },
                { v: "before", label: "施工前" },
                { v: "during", label: "施工中" },
                { v: "after", label: "完工後" },
              ] as const).map((f) => (
                <button
                  key={f.v}
                  onClick={() => setPhotoFilter(f.v as PhotoCategory | "all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    photoFilter === f.v ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {photos.length === 0 ? (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">
                {allPhotos.length === 0 ? "還沒有照片，上傳或拍攝第一張吧！" : "這個分類還沒有照片。"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((p, i) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    <button onClick={() => setPhotoIndex(i)} className="block h-full w-full">
                      <img src={p.dataUrl} alt={p.note || ""} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    </button>
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {p.category === "before" ? "前" : p.category === "during" ? "中" : "後"}
                    </span>
                    <button
                      onClick={() => confirm("刪除這張照片？") && deletePhoto(p.id)}
                      className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoIndex !== null && (
              <PhotoLightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onChange={setPhotoIndex} />
            )}
          </div>
        )}

        {tab === "info" && (
          <div className="card-surface space-y-4 p-5 text-sm">
            <InfoRow label="案件名稱" value={project.name} />
            <InfoRow label="客戶姓名" value={project.customerName} />
            {project.customerPhone && <InfoRow label="客戶電話" value={project.customerPhone} />}
            <InfoRow label="工程地址" value={project.address} />
            <InfoRow label="開工日期" value={project.startDate} />
            {project.expectedEndDate && <InfoRow label="預計完工" value={project.expectedEndDate} />}
            {project.scope && <InfoRow label="工程內容" value={project.scope} multiline />}
            {project.note && <InfoRow label="備註" value={project.note} multiline />}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function Mini({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-xl font-bold">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className={multiline ? "whitespace-pre-line text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
