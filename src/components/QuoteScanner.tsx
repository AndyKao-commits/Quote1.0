import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ScanLine, Upload, Loader2, X, Check, Plus, Trash2 } from "lucide-react";
import { scanQuote, type ScannedItem } from "@/lib/scanQuote.functions";
import { saveMaterial, saveMaterials, uid, type Material } from "@/lib/storage";

type Draft = ScannedItem & { _id: string };

export function QuoteScanner({ projectId, onDone }: { projectId: string; onDone?: () => void }) {
  const scan = useServerFn(scanQuote);
  const [preview, setPreview] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    if (!files?.[0]) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(files[0]);
      setPreview(dataUrl);
      const { items } = await scan({ data: { imageDataUrl: dataUrl } });
      if (!items.length) {
        setError("沒辨識到材料項目，請改用更清楚或角度更正的照片再試一次。");
        setDrafts([]);
      } else {
        setDrafts(items.map((i) => ({ ...i, _id: uid() })));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "辨識失敗，請再試一次";
      setError(msg);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  function reset() {
    setPreview(null);
    setDrafts(null);
    setError(null);
  }

  function saveAll() {
    if (!drafts?.length) return;
    const now = Date.now();
    const items: Material[] = drafts
      .filter((d) => d.name.trim())
      .map((d, i) => ({
        id: uid(),
        projectId,
        name: d.name.trim(),
        brand: d.brand?.trim() || undefined,
        unit: d.unit?.trim() || "個",
        quantity: Number(d.quantity) || 0,
        unitPrice: Number(d.unitPrice) || 0,
        note: d.note?.trim() || undefined,
        source: "scan",
        createdAt: now + i,
      }));
    saveMaterials(items);
    reset();
    onDone?.();
  }

  if (drafts) {
    const total = drafts.reduce((s, d) => s + (Number(d.quantity) || 0) * (Number(d.unitPrice) || 0), 0);
    return (
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">AI 辨識結果（{drafts.length} 項）</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">請檢查/修改後再儲存</p>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {preview && (
          <img src={preview} alt="" className="mb-3 max-h-48 w-full rounded-lg border border-border object-contain bg-muted" />
        )}

        {drafts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {error || "沒有可儲存的項目"}
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((d, idx) => (
              <DraftRow
                key={d._id}
                draft={d}
                onChange={(next) => setDrafts((arr) => arr!.map((x, i) => (i === idx ? next : x)))}
                onRemove={() => setDrafts((arr) => arr!.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        {drafts.length > 0 && (
          <>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">合計金額</span>
              <span className="text-lg font-bold tabular-nums">NT$ {total.toLocaleString()}</span>
            </div>
            <button
              onClick={saveAll}
              className="btn-touch mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110"
            >
              <Check className="h-4 w-4" /> 全部儲存到材料清單
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card-surface relative overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent-foreground">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold">📷 拍照辨識估價單</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            拍下估價單／報價單／出貨單，AI 自動填入材料名稱、單位、數量、單價。
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => camRef.current?.click()}
          className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {busy ? "辨識中…" : "拍照辨識"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> 從相簿
        </button>
      </div>

      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
    </div>
  );
}

function DraftRow({
  draft, onChange, onRemove,
}: { draft: Draft; onChange: (d: Draft) => void; onRemove: () => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });
  const lineTotal = (Number(draft.quantity) || 0) * (Number(draft.unitPrice) || 0);
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5">
      <div className="flex items-start gap-1.5">
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="材料名稱"
          className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-1.5 text-sm font-medium outline-none focus:border-primary"
        />
        <button onClick={onRemove} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <input
          value={draft.brand || ""}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="品牌"
          className="rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <input
          inputMode="decimal"
          value={String(draft.quantity)}
          onChange={(e) => set("quantity", Number(e.target.value) || 0)}
          placeholder="數量"
          className="rounded-md border border-input bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary"
        />
        <input
          value={draft.unit || ""}
          onChange={(e) => set("unit", e.target.value)}
          placeholder="單位"
          className="rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <input
          inputMode="decimal"
          value={String(draft.unitPrice)}
          onChange={(e) => set("unitPrice", Number(e.target.value) || 0)}
          placeholder="單價"
          className="rounded-md border border-input bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary"
        />
      </div>
      <div className="mt-1.5 text-right text-[11px] font-semibold text-muted-foreground">
        小計：NT$ {lineTotal.toLocaleString()}
      </div>
    </div>
  );
}

export function ManualMaterialForm({ projectId, onSaved }: { projectId: string; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", unit: "個", quantity: 1, unitPrice: 0 });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" /> 手動新增材料
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        saveMaterial({
          id: uid(), projectId, createdAt: Date.now(), source: "manual",
          name: form.name.trim(),
          brand: form.brand.trim() || undefined,
          unit: form.unit.trim() || "個",
          quantity: Number(form.quantity) || 0,
          unitPrice: Number(form.unitPrice) || 0,
        });
        setForm({ name: "", brand: "", unit: "個", quantity: 1, unitPrice: 0 });
        setOpen(false);
        onSaved?.();
      }}
      className="card-surface grid gap-2 p-3"
    >
      <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="材料名稱" className="rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none focus:border-primary" />
      <div className="grid grid-cols-4 gap-1.5">
        <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="品牌" className="rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none focus:border-primary" />
        <input inputMode="decimal" value={String(form.quantity)} onChange={(e) => set("quantity", Number(e.target.value) || 0)} placeholder="數量" className="rounded-md border border-input bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary" />
        <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="單位" className="rounded-md border border-input bg-card px-2 py-1.5 text-xs outline-none focus:border-primary" />
        <input inputMode="decimal" value={String(form.unitPrice)} onChange={(e) => set("unitPrice", Number(e.target.value) || 0)} placeholder="單價" className="rounded-md border border-input bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary" />
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">取消</button>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">儲存</button>
      </div>
    </form>
  );
}

async function fileToCompressedDataUrl(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
