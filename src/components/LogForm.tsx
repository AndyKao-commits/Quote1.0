import { useState } from "react";
import { Plus } from "lucide-react";
import { useSaveLog } from "@/lib/db";

export function LogForm({ projectId }: { projectId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: today, content: "", hours: 8, workers: "", note: "" });
  const save = useSaveLog();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    await save.mutateAsync({
      project_id: projectId,
      date: form.date,
      content: form.content,
      hours: Number(form.hours) || 0,
      workers: form.workers || undefined,
      note: form.note || undefined,
    });
    setForm({ date: today, content: "", hours: 8, workers: "", note: "" });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110"
      >
        <Plus className="h-4 w-4" /> 新增施工日誌
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface grid gap-3 p-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">日期</span>
        <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={cls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">工時（小時）</span>
        <input type="number" min={0} step={0.5} value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} className={cls} />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">施工內容 *</span>
        <textarea required rows={3} value={form.content} onChange={(e) => set("content", e.target.value)} className={cls}
          placeholder="客廳新增四組插座&#10;更換配電箱&#10;安裝軌道燈" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">施工人員</span>
        <input value={form.workers} onChange={(e) => set("workers", e.target.value)} className={cls} placeholder="KAO" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">備註</span>
        <input value={form.note} onChange={(e) => set("note", e.target.value)} className={cls} />
      </label>
      <div className="flex justify-end gap-2 md:col-span-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-touch rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary">取消</button>
        <button type="submit" disabled={save.isPending} className="btn-touch rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60">
          {save.isPending ? "儲存中…" : "儲存日誌"}
        </button>
      </div>
    </form>
  );
}

const cls = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
