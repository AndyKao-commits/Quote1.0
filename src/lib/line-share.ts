import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

function isLikelyMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function extractHttpUrl(text: string) {
  return text.match(/https?:\/\/\S+/)?.[0] ?? "";
}

/**
 * 桌面瀏覽器官方分享頁（LINE Social Plugins）
 * @see https://developers.line.biz/en/docs/line-social-plugins/
 */
function lineDesktopShareUrl(pageUrl: string, text?: string) {
  const q = new URLSearchParams({ url: pageUrl });
  if (text?.trim()) q.set("text", text.trim());
  return `https://social-plugins.line.me/lineit/share?${q.toString()}`;
}

/**
 * 手機 LINE App「分享給好友」畫面
 * @see https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/
 */
function lineMobileShareUrl(text: string) {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
}

function openLineShareWindow(href: string) {
  if (isLikelyMobile()) {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer,width=560,height=720");
}

/** 編輯頁：複製完整分享文案後開啟 LINE */
export async function shareLinkViaLine(url: string, message?: string) {
  const text = message?.trim() || url;
  const copied = await copyToClipboard(text);
  const href = isLikelyMobile() ? lineMobileShareUrl(text) : lineDesktopShareUrl(url, text);
  openLineShareWindow(href);
  if (copied) {
    toast.success(
      isLikelyMobile()
        ? "分享文案已複製，請在 LINE 選擇聊天室"
        : "分享文案已複製，請在 LINE 分享視窗選擇聊天室",
    );
  } else {
    toast.info("已開啟 LINE 分享，請手動複製上方分享連結", { duration: 7000 });
  }
  return copied;
}

/** 分享頁：複製完整文案後開啟 LINE */
export async function shareViaLine(text: string) {
  const copied = await copyToClipboard(text);
  const link = extractHttpUrl(text);
  const pageUrl = link || (typeof window !== "undefined" ? window.location.href : "");

  const href = isLikelyMobile()
    ? lineMobileShareUrl(text)
    : lineDesktopShareUrl(pageUrl, text);

  openLineShareWindow(href);

  if (isLikelyMobile()) {
    toast.success(copied ? "已開啟 LINE" : "已開啟 LINE，請選擇聊天室後送出");
    return;
  }

  if (copied) {
    toast.info("分享內容已複製。請在 LINE 分享視窗登入並選擇聊天室", { duration: 7000 });
  } else {
    toast.warning("請在 LINE 分享視窗登入後選擇聊天室", { duration: 7000 });
  }
}
