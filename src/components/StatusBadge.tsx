import type { ProjectStatus } from "@/lib/storage";
import { statusLabel } from "@/lib/storage";

const styles: Record<ProjectStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/10 text-primary border-primary/20",
  review: "bg-accent/15 text-accent-foreground border-accent/40",
  done: "bg-[color:var(--color-status-done)]/15 text-[color:var(--color-status-done)] border-[color:var(--color-status-done)]/30",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
