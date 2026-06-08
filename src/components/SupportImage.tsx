import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Loader2, X } from "lucide-react";

const cache = new Map<string, { url: string; ts: number }>();

export function SupportImage({ path, alt }: { path: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(() => {
    const c = cache.get(path);
    if (c && Date.now() - c.ts < 45 * 60 * 1000) return c.url;
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (url) return;
    (async () => {
      const { data, error } = await supabase.storage
        .from("photos")
        .createSignedUrl(path, 60 * 60);
      if (cancelled) return;
      if (error || !data) {
        setError("圖片載入失敗");
        return;
      }
      cache.set(path, { url: data.signedUrl, ts: Date.now() });
      setUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, url]);

  if (error) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <ImageIcon className="h-3.5 w-3.5" /> {error}
      </div>
    );
  }
  if (!url) {
    return (
      <div className="grid h-40 w-40 place-items-center rounded-lg border border-border bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="block overflow-hidden rounded-lg border border-border bg-background"
      >
        <img
          src={url}
          alt={alt ?? "客服圖片"}
          className="max-h-56 max-w-[240px] object-cover transition hover:opacity-90"
          loading="lazy"
        />
      </button>
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={url}
            alt={alt ?? "客服圖片"}
            className="max-h-[95vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
