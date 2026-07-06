import { randomId } from "@/lib/local-first/random-id";

const DEVICE_KEY = "bdg_local_device_id";

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceName() {
  if (typeof navigator === "undefined") return "未知裝置";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return "瀏覽器";
}
