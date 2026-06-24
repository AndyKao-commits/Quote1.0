/** 複製文字（支援 HTTP 本機、iOS；clipboard API 失敗時用 fallback） */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof document === "undefined") return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* secure context / permission / lost user gesture */
    }
  }

  return copyWithExecCommand(text);
}

function copyWithExecCommand(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta);

    const selection = document.getSelection();
    const saved = selection?.rangeCount ? selection.getRangeAt(0) : null;

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");

    document.body.removeChild(ta);
    if (saved && selection) {
      selection.removeAllRanges();
      selection.addRange(saved);
    }
    return ok;
  } catch {
    return false;
  }
}
