import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Share2, Copy, RefreshCw, ExternalLink, Check } from "lucide-react";
import { getShareSettings, updateShareSettings, type ShareSettings } from "@/lib/share.functions";

export function ShareLinkPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getShareSettings);
  const updFn = useServerFn(updateShareSettings);
  const { data, isLoading } = useQuery({
    queryKey: ["share-settings", projectId],
    queryFn: () => getFn({ data: { projectId } }) as Promise<ShareSettings>,
  });

  type UpdArgs = {
    projectId: string;
    enabled?: boolean;
    showAmounts?: boolean;
    showMaterials?: boolean;
    regenerate?: boolean;
  };
  const mut = useMutation({
    mutationFn: (args: UpdArgs) => updFn({ data: args }) as Promise<ShareSettings>,
    onSuccess: (s) => qc.setQueryData(["share-settings", projectId], s),
  });

  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = data?.share_token ? `${origin}/share/project/${data.share_token}` : "";

  if (isLoading) {
    return (
      <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-3">
        <div className="text-xs font-semibold text-muted-foreground">業主分享</div>
        <div className="text-sm text-muted-foreground">載入中…</div>
      </div>
    );
  }

  async function copy() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* noop */ }
  }

  return (
    <div className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-3">
      <div className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Share2 className="h-3.5 w-3.5" /> 業主分享
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <span className="text-sm">
            <span className="font-semibold">啟用免登入分享連結</span>
            <span className="block text-xs text-muted-foreground">業主可直接以連結檢視進度與照片（唯讀）</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-muted transition checked:bg-primary"
            checked={!!data?.is_share_enabled}
            disabled={mut.isPending}
            onChange={(e) => mut.mutate({ projectId, enabled: e.target.checked })}
          />
        </label>

        {data?.is_share_enabled && (
          <>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-2 py-1.5">
              <input readOnly value={shareUrl} className="min-w-0 flex-1 bg-transparent px-1 text-xs outline-none" />
              <button onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-secondary">
                {copied ? <><Check className="h-3 w-3" /> 已複製</> : <><Copy className="h-3 w-3" /> 複製</>}
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-secondary">
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={!!data.share_show_materials}
                  disabled={mut.isPending}
                  onChange={(e) => mut.mutate({ projectId, showMaterials: e.target.checked })}
                /> 顯示材料明細
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={!!data.share_show_amounts}
                  disabled={mut.isPending || !data.share_show_materials}
                  onChange={(e) => mut.mutate({ projectId, showAmounts: e.target.checked })}
                /> 顯示金額
              </label>
              <button
                onClick={() => mut.mutate({ projectId, regenerate: true })}
                disabled={mut.isPending}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
              >
                {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                重新產生連結
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
