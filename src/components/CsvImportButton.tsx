import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

type Props = {
  label?: string;
  accept?: string;
  busy?: boolean;
  onFile: (text: string, fileName: string) => void | Promise<void>;
};

export function CsvImportButton({ label = "匯入 CSV", accept = ".csv,text/csv", busy, onFile }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      const text = await file.text();
      await onFile(text, file.name);
    } finally {
      setReading(false);
    }
  }

  const disabled = busy || reading;

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="bdg-btn bdg-btn-secondary"
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        {label}
      </button>
    </>
  );
}
