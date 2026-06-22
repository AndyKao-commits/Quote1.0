import { toast } from "sonner";

function isLikelyMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** 電腦版 LINE 不會自動送達聊天室，需複製後自行貼上 */
export async function shareViaLine(text: string) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    /* clipboard may be blocked */
  }

  if (isLikelyMobile()) {
    window.location.href = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    toast.success(copied ? "已開啟 LINE" : "已開啟 LINE，請選擇聊天室後送出");
    return;
  }

  if (copied) {
    toast.info("分享內容已複製。請在 LINE 選擇聊天室後貼上（Ctrl+V）並按送出", { duration: 7000 });
  } else {
    toast.warning("請在 LINE 視窗貼上分享內容並選擇聊天室後送出", { duration: 7000 });
  }

  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
