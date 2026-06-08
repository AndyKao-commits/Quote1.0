import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];

async function cropAndResize(file: File, size = 500): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  URL.revokeObjectURL(img.src);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9),
  );
}

export function AvatarUploader({
  name,
  path,
  onChange,
}: {
  name?: string | null;
  path?: string | null;
  onChange: (newPath: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(f: File) {
    setErr(null);
    if (!ALLOWED.includes(f.type)) {
      setErr("僅允許 .jpg / .jpeg / .png 格式");
      return;
    }
    if (f.size > MAX_SIZE) {
      setErr("圖片大小不可超過 2MB");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");
      const blob = await cropAndResize(f, 500);
      const newPath = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(newPath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw error;
      if (path) await supabase.storage.from("avatars").remove([path]).catch(() => {});
      onChange(newPath);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "上傳失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!path) return;
    if (!confirm("確定移除頭像？")) return;
    setBusy(true);
    try {
      await supabase.storage.from("avatars").remove([path]);
      onChange(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "移除失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} path={path} size={72} />
        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" /> 上傳頭像
          </button>
          {path && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> 移除
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">JPG / PNG，最大 2 MB，自動裁切為正方形</p>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
