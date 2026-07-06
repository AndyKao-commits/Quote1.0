import { useCallback, useSyncExternalStore } from "react";
import { isLocalFirstMode } from "@/lib/local-first/config";
import { evaluateAccess, getStoredLicense, type AccessState } from "@/lib/local-first/license";

let cachedKey: string | null = null;
let cachedSnapshot: AccessState | null = null;

function invalidateAccessCache() {
  cachedKey = null;
  cachedSnapshot = null;
}

function subscribe(cb: () => void) {
  const onChange = () => {
    invalidateAccessCache();
    cb();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener("bdg-local-license", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("bdg-local-license", onChange);
  };
}

function getSnapshot(): AccessState | null {
  if (!isLocalFirstMode()) return null;
  const license = getStoredLicense();
  const key = license ? JSON.stringify(license) : "";
  if (key === cachedKey) return cachedSnapshot;
  cachedKey = key;
  cachedSnapshot = evaluateAccess(license);
  return cachedSnapshot;
}

export function notifyLocalLicenseChange() {
  invalidateAccessCache();
  window.dispatchEvent(new Event("bdg-local-license"));
}

export function useLocalAccess() {
  const access = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const refresh = useCallback(() => notifyLocalLicenseChange(), []);
  return { access, refresh, isLocalMode: isLocalFirstMode() };
}
