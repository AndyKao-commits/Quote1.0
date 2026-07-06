const MOCK_PORT = 3099;
export const AUTH_PROXY_PATH = "/__local_auth__";

/** 瀏覽器一律走同源代理 /__local_auth__，手機只需連 8080 */
export function getLocalMockApiUrl() {
  if (typeof window !== "undefined" && import.meta.env.VITE_LOCAL_FIRST === "true") {
    return AUTH_PROXY_PATH;
  }
  return import.meta.env.VITE_LOCAL_MOCK_API || `http://127.0.0.1:${MOCK_PORT}`;
}

export const LOCAL_MOCK_SECRET =
  import.meta.env.VITE_LOCAL_MOCK_SECRET || "bdg-local-dev-secret-change-me";

export const OFFLINE_DAYS = 20;

export function isLocalFirstMode() {
  return import.meta.env.VITE_LOCAL_FIRST === "true";
}
