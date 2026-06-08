import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Phone, MapPin, Calendar, Trash2, ClipboardList, Camera, Info,
  Clock, User, Image as ImageIcon, Package, ScanLine, FileDown, Loader2, Pencil, Users, Check, X, Square, CheckSquare,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { LogForm } from "@/components/LogForm";
import { PhotoUploader, PhotoLightbox } from "@/components/PhotoUploader";
import { PhotoImage } from "@/components/PhotoImage";
import { QuoteScanner, ManualMaterialForm } from "@/components/QuoteScanner";
import {
  useProject, useLogs, usePhotos, useMaterials,
  useSaveProject, useDeleteProject, useDeleteLog, useDeletePhoto, useDeletePhotos, useDeleteMaterial,
  useUpdatePhotoNote, getPhotoUrl,
  statusLabel, type ProjectStatus, type PhotoCategory, type Photo, type Project,
} from "@/lib/db";
import { listMyTeams, type Team } from "@/lib/teams.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportProjectPdf } from "@/lib/pdfExport";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: `案件詳情 — 施工紀錄 PRO` }] }),
  component: ProjectDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="card-surface p-10 text-center">
        <h2 className="text-lg font-bold">找不到此案件</h2>
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
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: logs = [] } = useLogs(id);
  const { data: allPhotos = [] } = usePhotos(id);
  const { data: materials = [] } = useMaterials(id);
  const saveProject = useSaveProject();
  const removeProject = useDeleteProject();
  const removeLog = useDeleteLog(id);
  const removePhoto = useDeletePhoto(id);
  const updatePhotoNote = useUpdatePhotoNote(id);
  const removeMaterial = useDeleteMaterial(id);

  const [tab, setTab] = useState<Tab>("logs");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoCategory | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: "project" } | { kind: "log"; id: string } | { kind: "photo"; photo: Photo } | { kind: "material"; id: string }>(null);
  const [editNote, setEditNote] = useState<{ id: string; note: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  if (isLoading) return <AppShell><div className="p-10 text-center text-sm text-muted-foreground">載入中…</div></AppShell>;
  if (!project) throw notFound();

  const photos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.category === photoFilter);
  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const materialTotal = materials.reduce((s, m) => s + Number(m.quantity) * Number(m.unit_price), 0);

  const updateStatus = (s: ProjectStatus) => saveProject.mutate({ id: project.id, status: s, name: project.name, customer_name: project.customer_name, address: project.address, start_date: project.start_date });

  async function openLightbox(idx: number) {
    setPhotoIndex(idx);
  }

  async function doExport() {
    setExporting(true);
    try {
      await exportProjectPdf({ project: project!, logs, photos: allPhotos, materials });
    } catch (e) {
      alert("匯出失敗：" + (e instanceof Error ? e.message : ""));
    } finally { setExporting(false); }
  }

  return (
    <AppShell>
      <button onClick={() => navigate({ to: "/projects" })} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <header className="card-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <StatusBadge status={project.status} />
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{project.name}</h1>
            <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{project.customer_name}</span>
              {project.customer_phone && (
                <a href={`tel:${project.customer_phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Phone className="h-4 w-4" />{project.customer_phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 sm:col-span-2"><MapPin className="h-4 w-4" />{project.address}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />開工 {project.start_date}</span>
              {project.expected_end_date && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />預計 {project.expected_end_date}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={doExport} disabled={exporting} className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {exporting ? "產生中…" : "匯出 PDF"}
            </button>
            <button onClick={() => setConfirmDelete({ kind: "project" })} className="btn-touch inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> 刪除
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs font-semibold text-muted-foreground">變更狀態：</span>
          {(["pending", "active", "review", "done"] as ProjectStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                project.status === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >{statusLabel(s)}</button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center sm:grid-cols-4">
          <Mini label="日誌" value={logs.length} icon={<ClipboardList className="h-4 w-4" />} />
          <Mini label="照片" value={allPhotos.length} icon={<ImageIcon className="h-4 w-4" />} />
          <Mini label="材料" value={materials.length} icon={<Package className="h-4 w-4" />} />
          <Mini label="工時" value={`${totalHours}h`} icon={<Clock className="h-4 w-4" />} />
        </div>
      </header>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")} icon={<ClipboardList className="h-4 w-4" />}>施工日誌</TabBtn>
        <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<Camera className="h-4 w-4" />}>照片</TabBtn>
        <TabBtn active={tab === "materials"} onClick={() => setTab("materials")} icon={<Package className="h-4 w-4" />}>材料</TabBtn>
        <TabBtn active={tab === "info"} onClick={() => setTab("info")} icon={<Info className="h-4 w-4" />}>資訊</TabBtn>
      </div>

      <div className="mt-5">
        {tab === "logs" && (
          <div className="space-y-4">
            <LogForm projectId={project.id} />
            {logs.length === 0 ? (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">還沒有施工日誌，記下今天做了什麼吧。</div>
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
                      <button onClick={() => setConfirmDelete({ kind: "log", id: l.id })} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
                >{f.label}</button>
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
                    <button onClick={() => openLightbox(i)} className="block h-full w-full">
                      <PhotoImage path={p.storage_path} alt={p.note ?? ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </button>
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {p.category === "before" ? "前" : p.category === "during" ? "中" : "後"}
                    </span>
                    <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => setEditNote({ id: p.id, note: p.note ?? "" })} className="rounded-md bg-black/55 p-1 text-white">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete({ kind: "photo", photo: p })} className="rounded-md bg-black/55 p-1 text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photoIndex !== null && (
              <LightboxLoader photos={photos} index={photoIndex} setIndex={setPhotoIndex} />
            )}
          </div>
        )}

        {tab === "materials" && (
          <div className="space-y-4">
            <QuoteScanner projectId={project.id} onDone={() => setTab("materials")} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ManualMaterialForm projectId={project.id} />
              <div className="text-right text-xs text-muted-foreground">
                共 {materials.length} 項 · 合計
                <span className="ml-1 text-base font-bold text-foreground tabular-nums">NT$ {materialTotal.toLocaleString()}</span>
              </div>
            </div>

            {materials.length === 0 ? (
              <div className="card-surface flex flex-col items-center gap-2 p-8 text-center">
                <ScanLine className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">還沒有材料。拍張估價單，讓 AI 自動填入吧！</p>
              </div>
            ) : (
              <ul className="card-surface divide-y divide-border overflow-hidden">
                {materials.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{m.name}</span>
                        {m.source === "scan" && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">AI</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m.brand ? `${m.brand} · ` : ""}{m.quantity} {m.unit} × NT$ {Number(m.unit_price).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">NT$ {(Number(m.quantity) * Number(m.unit_price)).toLocaleString()}</div>
                      <button onClick={() => setConfirmDelete({ kind: "material", id: m.id })} className="mt-0.5 text-xs text-muted-foreground hover:text-destructive">刪除</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "info" && (
          <div className="card-surface space-y-4 p-5 text-sm">
            <InfoRow label="案件名稱" value={project.name} />
            <InfoRow label="客戶姓名" value={project.customer_name} />
            {project.customer_phone && <InfoRow label="客戶電話" value={project.customer_phone} />}
            <InfoRow label="工程地址" value={project.address} />
            <InfoRow label="開工日期" value={project.start_date} />
            {project.expected_end_date && <InfoRow label="預計完工" value={project.expected_end_date} />}
            {project.scope && <InfoRow label="工程內容" value={project.scope} multiline />}
            {project.note && <InfoRow label="備註" value={project.note} multiline />}
            <TeamAssignRow project={project} />
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "project" && "確定刪除此案件？"}
              {confirmDelete?.kind === "log" && "確定刪除這筆日誌？"}
              {confirmDelete?.kind === "photo" && "確定刪除此照片？"}
              {confirmDelete?.kind === "material" && "確定刪除這項材料？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "project" && `「${project.name}」的所有日誌、照片、材料都會被一併刪除，且無法復原。`}
              {confirmDelete?.kind !== "project" && "此操作無法復原。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.kind === "project") {
                  await removeProject.mutateAsync(project.id);
                  navigate({ to: "/projects" });
                } else if (confirmDelete.kind === "log") {
                  await removeLog.mutateAsync(confirmDelete.id);
                } else if (confirmDelete.kind === "photo") {
                  await removePhoto.mutateAsync(confirmDelete.photo);
                } else if (confirmDelete.kind === "material") {
                  await removeMaterial.mutateAsync(confirmDelete.id);
                }
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >確定刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editNote} onOpenChange={(o) => !o && setEditNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>修改照片備註</AlertDialogTitle>
          </AlertDialogHeader>
          <input
            value={editNote?.note ?? ""}
            onChange={(e) => setEditNote((s) => s ? { ...s, note: e.target.value } : s)}
            className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="照片備註"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (editNote) await updatePhotoNote.mutateAsync({ id: editNote.id, note: editNote.note });
                setEditNote(null);
              }}
            >儲存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function LightboxLoader({ photos, index, setIndex }: { photos: Photo[]; index: number; setIndex: (i: number | null) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Lazy load current + neighbours
  const need = [index, (index + 1) % photos.length, (index - 1 + photos.length) % photos.length]
    .map(i => photos[i]).filter(Boolean);
  need.forEach((p) => {
    if (!urls[p.id]) getPhotoUrl(p.storage_path).then((u) => setUrls((s) => ({ ...s, [p.id]: u })));
  });
  const items = photos.map((p) => ({ url: urls[p.id] || "", taken_at: p.taken_at, note: p.note }));
  return <PhotoLightbox items={items} index={index} onClose={() => setIndex(null)} onChange={setIndex} />;
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

function Mini({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
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

function TeamAssignRow({ project }: { project: Project }) {
  const teamsFn = useServerFn(listMyTeams);
  const saveProject = useSaveProject();
  const { data: teams = [] } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => teamsFn({}) as Promise<Team[]>,
  });
  const writable = teams.filter((t) => t.my_role !== "viewer");
  const currentTeam = teams.find((t) => t.id === project.team_id) ?? null;
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string>(project.team_id ?? "");

  async function save() {
    await saveProject.mutateAsync({
      id: project.id,
      name: project.name,
      customer_name: project.customer_name,
      address: project.address,
      start_date: project.start_date,
      team_id: selected || null,
    });
    setEditing(false);
  }

  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-3">
      <div className="text-xs font-semibold text-muted-foreground">所屬團隊</div>
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option value="">— 個人案件（不指派團隊）—</option>
              {writable.map((t) => (
                <option key={t.id} value={t.id}>{t.name}（{t.my_role === "owner" ? "主持人" : "編輯者"}）</option>
              ))}
            </select>
            <button
              type="button"
              onClick={save}
              disabled={saveProject.isPending}
              className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {saveProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setSelected(project.team_id ?? ""); }}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            {currentTeam ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Users className="h-3 w-3" /> {currentTeam.name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">個人案件（未指派團隊）</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
            >
              <Pencil className="h-3 w-3" /> 編輯
            </button>
          </>
        )}
      </div>
    </div>
  );
}
