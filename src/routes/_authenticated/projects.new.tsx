import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSaveProject, type ProjectStatus } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "新增案件 — 現場紀錄" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const save = useSaveProject();
  const today = new Date().toISOString().slice(0, 10);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    name: "", customer_name: "", customer_phone: "", address: "",
    start_date: today, expected_end_date: "", scope: "", note: "",
    status: "pending" as ProjectStatus,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function locate() {
    if (!navigator.geolocation) { alert("此裝置不支援定位"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=zh-TW`,
          );
          const j = await res.json();
          const addr = j.display_name || `${lat},${lon}`;
          set("address", addr);
        } catch {
          alert("無法取得地址，請手動輸入");
        } finally { setLocating(false); }
      },
      (e) => { setLocating(false); alert("無法取得 GPS：" + e.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.customer_name.trim() || !form.address.trim()) return;
    const payload = {
      ...form,
      expected_end_date: form.expected_end_date || null,
      customer_phone: form.customer_phone || null,
      scope: form.scope || null,
      note: form.note || null,
    };
    const p = await save.mutateAsync(payload);
    navigate({ to: "/projects/$id", params: { id: p.id } });
  }

  return (
    <AppShell>
      <button onClick={() => navigate({ to: "/projects" })} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回案件列表
      </button>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增案件</h1>
      <p className="mt-1 text-sm text-muted-foreground">填寫案件基本資料，之後可加入施工日誌與照片。</p>

      <form onSubmit={submit} className="card-surface mt-6 grid gap-4 p-5 md:grid-cols-2">
        <Field label="案件名稱 *" className="md:col-span-2">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="例：林公館新增插座工程" />
        </Field>
        <Field label="客戶姓名 *">
          <input required value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="客戶電話">
          <input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} className={inputCls} placeholder="09xx-xxx-xxx" />
        </Field>
        <Field label="工程地址 *" className="md:col-span-2">
          <div className="flex gap-2">
            <input required value={form.address} onChange={(e) => set("address", e.target.value)} className={`${inputCls} flex-1`} placeholder="或點右側 📍 自動定位" />
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="btn-touch inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              定位
            </button>
          </div>
        </Field>
        <Field label="開工日期">
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={inputCls} />
        </Field>
        <Field label="預計完工日期">
          <input type="date" value={form.expected_end_date} onChange={(e) => set("expected_end_date", e.target.value)} className={inputCls} />
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
          <button type="button" onClick={() => navigate({ to: "/projects" })} className="btn-touch rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary">取消</button>
          <button type="submit" disabled={save.isPending} className="btn-touch rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60">
            {save.isPending ? "建立中…" : "建立案件"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
