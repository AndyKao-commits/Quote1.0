const ACCESS = "bdg_access_token";
const REFRESH = "bdg_refresh_token";
const PERSIST = "bdg_persist";
const REMEMBER_EMAIL = "bdg_remember_email";

function tokenStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PERSIST) === "0" ? sessionStorage : localStorage;
}

export function getRememberLogin(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PERSIST) !== "0";
}

export function setRememberLogin(remember: boolean) {
  localStorage.setItem(PERSIST, remember ? "1" : "0");
  if (remember) {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  } else {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  }
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBER_EMAIL) ?? "";
}

export function setRememberedEmail(email: string) {
  if (!email.trim()) {
    localStorage.removeItem(REMEMBER_EMAIL);
    return;
  }
  localStorage.setItem(REMEMBER_EMAIL, email.trim());
}

export function getAccessToken(): string | null {
  const store = tokenStorage();
  return store?.getItem(ACCESS) ?? null;
}

export function getRefreshToken(): string | null {
  const store = tokenStorage();
  return store?.getItem(REFRESH) ?? null;
}

export function setSession(access: string, refresh: string) {
  const store = tokenStorage();
  if (!store) return;
  store.setItem(ACCESS, access);
  store.setItem(REFRESH, refresh);
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(ACCESS);
    store.removeItem(REFRESH);
  }
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(bufferSec = 60): boolean {
  const token = getAccessToken();
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return Date.now() / 1000 >= exp - bufferSec;
}

export async function ensureValidSession(
  refresh: (refreshToken: string) => Promise<{ access_token: string; refresh_token: string }>,
): Promise<boolean> {
  const access = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!access && !refreshToken) return false;
  if (access && !isAccessTokenExpired()) return true;
  if (!refreshToken) return false;
  try {
    const next = await refresh(refreshToken);
    setSession(next.access_token, next.refresh_token);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
