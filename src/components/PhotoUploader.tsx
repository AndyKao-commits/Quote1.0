import { useRef, useState } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { addWatermarkBlob, nowStamp } from "@/lib/watermark";
import { useSavePhoto, type PhotoCategory, type Project } from "@/lib/db";

export function PhotoUploader({ project }: { project: Project }) {
  const [category, setCategory] = useState<PhotoCategory>("during");
  const [worker, setWorker] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const savePhoto = useSavePhoto();

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    try {
      const arr = Array.from(files);
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const takenAt = nowStamp();
        const blob = await addWatermarkBlob(file, {
          projectName: project.name,
          address: project.address,
          worker,
          takenAt,
        });
        await savePhoto.mutateAsync({
          project_id: project.id,
          category,
          blob,
          taken_at: takenAt,
          note: note || undefined,
        });
        setProgress({ done: i + 1, total: arr.length });
      }
    } catch (e) {
      console.error(e);
      alert("照片上傳失敗：" + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  const cats: { v: PhotoCategory; label: string }[] = [
    { v: "before", label: "施工前" },
    { v: "during", label: "施工中" },
    { v: "after", label: "完工後" },
  ];

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">上傳工地照片</h3>
        <span className="text-[11px] font-medium text-accent-foreground">✦ 自動加浮水印．雲端儲存</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c.v}
            type="button"
            onClick={() => setCategory(c.v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${category === c.v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={worker} onChange={(e) => setWorker(e.target.value)} placeholder="施工人員（可選，會印在照片上）" className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註（可選）" className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => camRef.current?.click()} disabled={busy} className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {busy ? "處理中…" : "拍照"}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-secondary disabled:opacity-60">
          <Upload className="h-4 w-4" /> 從相簿（多選）
        </button>
      </div>
      {progress && <p className="mt-2 text-center text-xs text-muted-foreground">已上傳 {progress.done} / {progress.total}</p>}

      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

export function PhotoLightbox({
  items, index, onClose, onChange,
}: {
  items: { url: string; taken_at: string; note?: string | null }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const p = items[index];
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur" onClick={onClose}>
      <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <img src={p.url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onChange((index - 1 + items.length) % items.length)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">← 上一張</button>
        <div className="text-center text-xs">
          <div className="font-semibold">{p.taken_at}</div>
          {p.note && <div className="opacity-70">{p.note}</div>}
          <div className="mt-0.5 opacity-50">{index + 1} / {items.length}</div>
        </div>
        <button onClick={() => onChange((index + 1) % items.length)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">下一張 →</button>
      </div>
    </div>
  );
}
