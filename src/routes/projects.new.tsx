import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { saveProject, uid, type ProjectStatus } from "@/lib/storage";

export const Route = createFileRoute("/projects/new")({
  head: () => ({ meta: [{ title: "新增案件 — 水電施工紀錄 Pro" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: "",
    customerName: "",
    customerPhone: "",
    address: "",
    startDate: today,
    expectedEndDate: "",
    scope: "",
    note: "",
    status: "pending" as ProjectStatus,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.customerName.trim() || !form.address.trim()) return;
    const id = uid();
    saveProject({ id, createdAt: Date.now(), ...form });
    navigate({ to: "/projects/$id", params: { id } });
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/projects" })}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回案件列表
      </button>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增案件</h1>
      <p className="mt-1 text-sm text-muted-foreground">填寫案件基本資料，之後可加入施工日誌與照片。</p>

      <form onSubmit={submit} className="card-surface mt-6 grid gap-4 p-5 md:grid-cols-2">
        <Field label="案件名稱 *" className="md:col-span-2">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="例：林公館新增插座工程" />
        </Field>
        <Field label="客戶姓名 *">
          <input required value={form.customerName} onChange={(e) => set("customerName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="客戶電話">
          <input value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} className={inputCls} placeholder="09xx-xxx-xxx" />
        </Field>
        <Field label="工程地址 *" className="md:col-span-2">
          <input required value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </Field>
        <Field label="開工日期">
          <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="預計完工日期">
          <input type="date" value={form.expectedEndDate} onChange={(e) => set("expectedEndDate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="目前狀態">
          <select value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)} className={inputCls}>
            <option value="pending">待施工</option>
            <option value="active">施工中</option>
            <option value="review">驗收中</option>
            <option value="done">已完工</option>
          </select>
        </Field>
        <Field label="工程內容" className="md:col-span-2">
          <textarea rows={3} value={form.scope} onChange={(e) => set("scope", e.target.value)} className={inputCls} placeholder="客廳新增四組插座、更換配電箱、安裝軌道燈..." />
        </Field>
        <Field label="備註" className="md:col-span-2">
          <textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} className={inputCls} />
        </Field>

        <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/projects" })}
            className="btn-touch rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            className="btn-touch rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110"
          >
            建立案件
          </button>
        </div>
      </form>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
