import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/BdgAppShell";
import { createQuote, createSampleQuote } from "@/lib/quotes.functions";
import { SAMPLE_QUOTES, type SampleQuoteId } from "@/lib/landing-demo-quotes";
import { useState } from "react";
import { Bath, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiCreateQuote, apiCreateSampleQuote } from "@/lib/quote-api";

export const Route = createFileRoute("/_app/quotes/new")({
  head: () => ({ meta: [{ title: "新建報價 — 報得過" }] }),
  component: NewQuotePage,
});

const SAMPLE_ICONS: Record<string, typeof Bath> = {
  bathroom: Bath,
  "full-home": Home,
};

function NewQuotePage() {
  const nav = useNavigate();
  const createFn = useServerFn(createQuote);
  const sampleFn = useServerFn(createSampleQuote);
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => apiCreateQuote(() => createFn({ data: {} }) as Promise<{ id: string }>),
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

  const createSample = useMutation({
    mutationFn: (sampleId: SampleQuoteId) =>
      apiCreateSampleQuote(() => sampleFn({ data: { sampleId } }) as Promise<{ id: string }>, sampleId),
    onSuccess: (res) => {
      if (!res?.id) throw new Error("建立範例失敗");
      nav({ to: "/quotes/$id", params: { id: res.id }, replace: true });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "建立範例失敗";
      setErr(msg);
      toast.error(msg);
    },
  });

  const busy = create.isPending || createSample.isPending;

  return (
    <AppShell>
      <h1 className="text-xl font-semibold tracking-tight">新建報價</h1>
      <p className="mt-1 text-sm text-[var(--bdg-muted)]">建立空白報價，或先開啟範例學習操作流程</p>

      {err && (
        <p className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SAMPLE_QUOTES.map((s) => {
          const Icon = SAMPLE_ICONS[s.id] ?? Home;
          return (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => {
              setErr(null);
              createSample.mutate(s.id as SampleQuoteId);
            }}
            className="bdg-card bdg-card-interactive p-6 text-left disabled:opacity-60"
          >
            <div className="bdg-card-icon mb-3.5">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold text-[var(--bdg-ink)]">{s.tabLabel}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--bdg-muted)]">{s.hint}</p>
          </button>
          );
        })}
      </div>

      <div className="relative z-50 mt-8 pb-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setErr(null);
            create.mutate();
          }}
          className="bdg-btn bdg-btn-primary px-8 py-3 text-base"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          空白報價
        </button>
      </div>
    </AppShell>
  );
}
