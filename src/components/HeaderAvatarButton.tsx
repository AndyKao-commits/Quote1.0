import { useRef, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/db";
import { Avatar } from "./Avatar";

const MAX_SIZE = 2 * 1024 * 1024;
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

export function HeaderAvatarButton() {
  const { data: profile } = useProfile();
  const updateMut = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File) {
    if (!ALLOWED.includes(f.type)) {
      alert("僅允許 .jpg / .jpeg / .png 格式");
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("圖片大小不可超過 2MB");
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
      if (profile?.avatar_url) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]).catch(() => {});
      }
      await updateMut.mutateAsync({ avatar_url: newPath });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "上傳失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="點擊更換頭像（JPG/PNG，2MB 以下）"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg shadow-[var(--shadow-elevated)] transition hover:brightness-110 disabled:opacity-60"
      >
        {profile?.avatar_url || profile?.display_name ? (
          <Avatar
            name={profile?.display_name ?? "我"}
            path={profile?.avatar_url}
            size={36}
            className="!rounded-lg"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/50">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </span>
        )}
      </button>
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
    </>
  );
}
