import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AppShell } from "@/components/BdgAppShell";
import { getProfile, updateProfile } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "設定 — 報得過" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const profileFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) as Promise<any> });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (!form) {
    return (
      <AppShell>
        <Loader2 className="h-5 w-5 animate-spin text-[#6b5c4d]" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1a1612]">品牌設定</h1>
      <p className="mt-1 text-sm text-[#6b5c4d]">Logo、預設條款與稅務習慣</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#e8dfd3] bg-white p-5">
        <Field
          label="顯示名稱"
          hint="顯示在報價單簽名區「設計業務」欄"
          value={form.display_name ?? ""}
          onChange={(v) => setForm({ ...form, display_name: v })}
        />
        <Field
          label="公司／工作室名稱"
          hint="顯示在報價單最上方（Logo 下方）"
          value={form.company_name ?? ""}
          onChange={(v) => setForm({ ...form, company_name: v })}
        />
        <Field label="電話" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Logo 圖片 URL" value={form.logo_url ?? ""} onChange={(v) => setForm({ ...form, logo_url: v })} />
        {form.logo_url?.trim() && (
          <div className="flex items-center gap-3 rounded-xl border border-[#ece3d6] bg-[#FDFBF7] p-3">
            <img src={form.logo_url} alt="" className="h-12 w-12 rounded-lg object-contain" />
            <p className="text-xs text-[#6b5c4d]">預覽：會顯示在頂部導覽列與報價單 PDF</p>
          </div>
        )}
        <Field label="品牌色（hex）" value={form.brand_color ?? "#C45A3C"} onChange={(v) => setForm({ ...form, brand_color: v })} />
        <Field label="賣方統編（選填）" value={form.seller_tax_id ?? ""} onChange={(v) => setForm({ ...form, seller_tax_id: v })} />
        <Field label="預設條款" value={form.default_terms ?? ""} onChange={(v) => setForm({ ...form, default_terms: v })} multiline />

        <Toggle checked={form.default_show_tax_id} onChange={(v) => setForm({ ...form, default_show_tax_id: v })} label="新報價預設顯示統編" />
        <Toggle checked={form.default_tax_included} onChange={(v) => setForm({ ...form, default_tax_included: v })} label="新報價預設含稅" />
        <Toggle checked={form.default_show_tax_breakdown} onChange={(v) => setForm({ ...form, default_show_tax_breakdown: v })} label="新報價預設顯示稅額明細" />

        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="inline-flex items-center gap-1 rounded-full bg-[#C45A3C] px-5 py-2.5 text-sm font-bold text-white">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 儲存設定
        </button>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-[#6b5c4d]">{label}</span>
      {hint && <span className="mb-1 block text-[11px] text-[#9a8f82]">{hint}</span>}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={inp} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inp} />
      )}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const inp = "w-full rounded-xl border border-[#ece3d6] px-3 py-2 text-sm outline-none focus:border-[#C45A3C]";
