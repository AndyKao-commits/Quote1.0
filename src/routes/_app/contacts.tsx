import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { listContacts, saveContact, deleteContact } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "聯絡人 — 報得過" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listContacts);
  const saveFn = useServerFn(saveContact);
  const delFn = useServerFn(deleteContact);
  const { data: contacts = [], isLoading } = useQuery({ queryKey: ["contacts"], queryFn: () => listFn({}) as Promise<any[]> });
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", tax_id: "" });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          name: form.name,
          company: form.company || null,
          phone: form.phone || null,
          email: form.email || null,
          tax_id: form.tax_id || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ name: "", company: "", phone: "", email: "", tax_id: "" });
    },
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1a1612]">聯絡人</h1>
      <p className="mt-1 text-sm text-[#6b5c4d]">常用客戶資料，建立報價時快速帶入</p>

      <div className="mt-6 rounded-2xl border border-[#e8dfd3] bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="姓名 *" className={inp} />
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="公司" className={inp} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="電話" className={inp} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inp} />
          <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} placeholder="統編（選填）" className={`${inp} sm:col-span-2`} />
        </div>
        <button type="button" disabled={!form.name || save.isPending} onClick={() => save.mutate()} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#C45A3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 新增
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-[#6b5c4d]">載入中…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {contacts.map((c: any) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-[#e8dfd3] bg-white px-4 py-3">
              <div>
                <p className="font-semibold">{c.name}{c.company && ` · ${c.company}`}</p>
                <p className="text-xs text-[#6b5c4d]">{[c.phone, c.email, c.tax_id && `統編 ${c.tax_id}`].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => delFn({ data: { id: c.id } }).then(() => qc.invalidateQueries({ queryKey: ["contacts"] }))} className="text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

const inp = "w-full rounded-xl border border-[#ece3d6] px-3 py-2 text-sm outline-none focus:border-[#C45A3C]";
