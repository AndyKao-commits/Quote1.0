import { isLocalFirstMode } from "@/lib/local-first/config";
import { evaluateAccess, getStoredLicense, type AccessState } from "@/lib/local-first/license";
import type { QuoteLine } from "@/lib/quotes.types";

export function getLocalAccess(now = Date.now()): AccessState | null {
  if (!isLocalFirstMode()) return null;
  return evaluateAccess(getStoredLicense(), now);
}

export function assertCanEdit() {
  const access = getLocalAccess();
  if (access && !access.canEdit) throw new Error(access.message);
}

export function assertCanImport() {
  const access = getLocalAccess();
  if (access && !access.canImport) throw new Error(access.message);
}

export function assertCanExportPdf() {
  const access = getLocalAccess();
  if (access && !access.canExportPdf) throw new Error("會籍限制：無法匯出 PDF，請續約並連線登入。");
}

export function sliceLinesForBrowse(lines: QuoteLine[], ratio: number): QuoteLine[] {
  if (ratio >= 1) return lines;
  const items = lines.filter((l) => l.line_type !== "group");
  const visibleItemCount = Math.max(1, Math.ceil(items.length * ratio));
  let seen = 0;
  const result: QuoteLine[] = [];
  for (const l of lines) {
    if (l.line_type === "group") {
      result.push(l);
      continue;
    }
    seen++;
    if (seen <= visibleItemCount) result.push(l);
    else break;
  }
  return result;
}
