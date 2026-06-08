import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];

export function SupportPhotoButton({
  customerUserId,
  onUploaded,
}: {
  customerUserId: string;
  onUploaded: (path: string) => Promise<unknown> | unknown;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      alert("僅支援 JPG / PNG 圖片");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("照片大小不可超過 5MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `support/${customerUserId}/${id}.${ext}`;
      const { error } = await supabase.storage
        .from("photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        alert("上傳失敗：" + error.message);
        return;
      }
      await onUploaded(path);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="夾帶圖片（JPG / PNG，5MB 以下）"
        className="btn-touch inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-2.5 hover:bg-secondary/80 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </button>
    </>
  );
}
