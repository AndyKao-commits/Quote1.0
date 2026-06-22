import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/BdgAppShell";
import { getProfile, saveQuote } from "@/lib/quotes.functions";
import { templateMeta, type QuoteTemplate } from "@/lib/quotes.types";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/quotes/new")({
  head: () => ({ meta: [{ title: "新建報價 — 報得過" }] }),
  component: NewQuotePage,
});

function NewQuotePage() {
  const nav = useNavigate();
  const profileFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveQuote);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) as Promise<any> });
  const [template, setTemplate] = useState<QuoteTemplate>("craft");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await saveFn({
        data: {
          title: "報價單",
          template,
          client_name: "",
          show_seller_tax_id: profile?.default_show_tax_id ?? false,
          show_buyer_tax_id: profile?.default_show_tax_id ?? false,
          seller_tax_id: profile?.seller_tax_id ?? null,
          tax_included: profile?.default_tax_included ?? false,
          show_tax_breakdown: profile?.default_show_tax_breakdown ?? false,
          tax_rate: 0.05,
          terms: profile?.default_terms ?? null,
          lines: [
            { sort_order: 0, line_type: "group", name: "泥作工程", unit: "—", quantity: 0, unit_price: 0 },
            { sort_order: 1, line_type: "item", name: "地坪整平", unit: "式", quantity: 1, unit_price: 0 },
          ],
        },
      });
      nav({ to: "/quotes/$id", params: { id: res.id } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1a1612]">選擇模板</h1>
      <p className="mt-1 text-sm text-[#6b5c4d]">之後可隨時切換</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(Object.keys(templateMeta) as QuoteTemplate[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            className={`rounded-2xl border p-5 text-left transition ${
              template === t ? "border-[#C45A3C] bg-white shadow-md ring-2 ring-[#C45A3C]/20" : "border-[#e8dfd3] bg-white/80 hover:border-[#C45A3C]/40"
            }`}
          >
            <p className="font-bold text-[#1a1612]">{templateMeta[t].label}</p>
            <p className="mt-1 text-xs text-[#6b5c4d]">{templateMeta[t].desc}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={start}
        className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#C45A3C] px-8 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        開始填寫
      </button>
    </AppShell>
  );
}
