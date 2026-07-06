const MOCK_PORT = 3099;
export const AUTH_PROXY_PATH = "/__local_auth__";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return cap?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** 瀏覽器走同源代理；iOS App 走 VITE_APP_API_ORIGIN（正式站授權 API） */
export function getLocalMockApiUrl() {
  if (typeof window !== "undefined" && isLocalFirstMode()) {
    const apiOrigin = import.meta.env.VITE_APP_API_ORIGIN?.replace(/\/$/, "");
    if (apiOrigin && isNativeApp()) {
      return `${apiOrigin}${AUTH_PROXY_PATH}`;
    }
    return AUTH_PROXY_PATH;
  }
  return import.meta.env.VITE_LOCAL_MOCK_API || `http://127.0.0.1:${MOCK_PORT}`;
}
export const LOCAL_MOCK_SECRET =
  import.meta.env.DEV
    ? import.meta.env.VITE_LOCAL_MOCK_SECRET || "bdg-local-dev-secret-change-me"
    : "";

export const OFFLINE_DAYS = 20;

export function isLocalFirstMode() {
  return import.meta.env.VITE_LOCAL_FIRST === "true";
}
