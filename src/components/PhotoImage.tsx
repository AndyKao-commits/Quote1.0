import { usePhotoUrl } from "@/lib/db";
import { ImageOff } from "lucide-react";

export function PhotoImage({ path, alt, className }: { path: string; alt?: string; className?: string }) {
  const { data: url, isLoading } = usePhotoUrl(path);
  if (isLoading) return <div className={`flex items-center justify-center bg-muted ${className ?? ""}`} />;
  if (!url) return <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}><ImageOff className="h-6 w-6" /></div>;
  return <img src={url} alt={alt ?? ""} className={className} loading="lazy" />;
}
