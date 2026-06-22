import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/BdgAppShell";
import { createQuote } from "@/lib/quotes.functions";
import { templateMeta, type QuoteTemplate } from "@/lib/quotes.types";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/quotes/new")({
  head: () => ({ meta: [{ title: "新建報價 — 報得過" }] }),
  component: NewQuotePage,
});

function NewQuotePage() {
  const nav = useNavigate();
  const createFn = useServerFn(createQuote);
  const [template, setTemplate] = useState<QuoteTemplate>("craft");
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { template } }) as Promise<{ id: string }>,
    onSuccess: (res) => {
      if (!res?.id) throw new Error("建立失敗，未取得報價編號");
      nav({ to: "/quotes/$id", params: { id: res.id }, replace: true });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "建立失敗，請稍後再試";
      setErr(msg);
      toast.error(msg);
    },
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold tracking-tight">選擇模板</h1>
      <p className="mt-1 text-sm text-stone-500">之後可隨時切換</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(Object.keys(templateMeta) as QuoteTemplate[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTemplate(t);
              setErr(null);
            }}
            className={`bdg-card p-5 text-left transition ${
              template === t ? "ring-2 ring-[var(--bdg-brand)]" : "hover:border-stone-300"
            }`}
          >
            <p className="font-medium">{templateMeta[t].label}</p>
            <p className="mt-1 text-xs text-stone-500">{templateMeta[t].desc}</p>
          </button>
        ))}
      </div>

      {err && (
        <p className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}

      <div className="relative z-50 mt-8 pb-6">
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => {
            setErr(null);
            create.mutate();
          }}
          className="bdg-btn bdg-btn-primary px-8 py-3 text-base"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          開始填寫
        </button>
      </div>
    </AppShell>
  );
}
