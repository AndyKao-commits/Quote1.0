import { isLocalFirstMode } from "@/lib/local-first/config";
import type { SampleQuoteId } from "@/lib/landing-demo-quotes";
import {
  assertOnlineForWrite,
  cacheCatalog,
  cacheFullQuote,
  cacheProfile,
  cacheQuoteList,
  getCachedCatalog,
  getCachedFullQuote,
  getCachedProfile,
  getCachedQuoteList,
  isBrowserOffline,
  OfflineError,
} from "@/lib/offline-cache/store";
import {
  bulkImportLocalCatalog,
  bulkDeleteLocalCatalogItems,
  createLocalQuote,
  createLocalSampleQuote,
  deleteLocalCatalogItem,
  deleteLocalQuote,
  duplicateLocalQuote,
  getLocalProfile,
  getLocalQuote,
  listLocalCatalog,
  listLocalQuotes,
  saveLocalCatalogItem,
  saveLocalQuote,
  seedLocalDemoCatalog,
  updateLocalProfile,
} from "@/lib/local-first/store";

type ServerCall<T> = () => Promise<T>;

export { OfflineError };

export function quoteApiEnabled() {
  return isLocalFirstMode();
}

async function withOfflineRead<T>(server: ServerCall<T>, fallback: () => Promise<T>): Promise<T> {
  if (isBrowserOffline()) return fallback();
  try {
    return await server();
  } catch (error) {
    try {
      return await fallback();
    } catch {
      throw error;
    }
  }
}

export async function apiGetProfile(server: ServerCall<any>) {
  if (isLocalFirstMode()) return getLocalProfile();
  const data = await withOfflineRead(server, async () => {
    const cached = await getCachedProfile();
    if (!cached) throw new OfflineError("離線且無本機快取，請先連網登入一次");
    return cached;
  });
  if (!isBrowserOffline()) await cacheProfile(data);
  return data;
}

export async function apiUpdateProfile(server: ServerCall<any>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return updateLocalProfile(data as any);
  assertOnlineForWrite("離線無法更新設定，請連上網路後再試");
  return server();
}

export async function apiListQuotes(server: ServerCall<any[]>) {
  if (isLocalFirstMode()) return listLocalQuotes();
  const data = await withOfflineRead(server, getCachedQuoteList);
  if (!isBrowserOffline()) await cacheQuoteList(data);
  return data;
}

export async function apiGetQuote(server: ServerCall<any>, id: string) {
  if (isLocalFirstMode()) return getLocalQuote(id);
  const data = await withOfflineRead(
    server,
    async () => {
      const cached = await getCachedFullQuote(id);
      if (!cached) throw new OfflineError("離線且無本機快取，請先連網開啟過此報價");
      return cached;
    },
  );
  if (!isBrowserOffline()) await cacheFullQuote(data);
  return data;
}

export async function apiCreateQuote(server: ServerCall<{ id: string }>) {
  if (isLocalFirstMode()) return createLocalQuote();
  assertOnlineForWrite("離線無法新建報價，請連上網路後再試");
  return server();
}

export async function apiCreateSampleQuote(server: ServerCall<{ id: string }>, sampleId: SampleQuoteId) {
  if (isLocalFirstMode()) return createLocalSampleQuote(sampleId);
  assertOnlineForWrite("離線無法新建報價，請連上網路後再試");
  return server();
}

export async function apiDuplicateQuote(server: ServerCall<{ id: string }>, id: string) {
  if (isLocalFirstMode()) return duplicateLocalQuote(id);
  assertOnlineForWrite("離線無法複製報價，請連上網路後再試");
  return server();
}

export async function apiDeleteQuote(server: ServerCall<{ ok: boolean }>, id: string) {
  if (isLocalFirstMode()) return deleteLocalQuote(id);
  assertOnlineForWrite("離線無法刪除報價，請連上網路後再試");
  return server();
}

export async function apiSaveQuote(server: ServerCall<any>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return saveLocalQuote(data as any);
  assertOnlineForWrite("離線無法儲存，請連上網路後再試");
  const result = await server();
  if (data.id && typeof data.id === "string") {
    try {
      const cached = await getCachedFullQuote(data.id);
      if (cached) await cacheFullQuote({ ...cached, ...data } as any);
    } catch {
      /* cache refresh is best-effort */
    }
  }
  return result;
}

export async function apiListCatalog(server: ServerCall<any[]>) {
  if (isLocalFirstMode()) return listLocalCatalog();
  const data = await withOfflineRead(server, getCachedCatalog);
  if (!isBrowserOffline()) await cacheCatalog(data);
  return data;
}

export async function apiSaveCatalogItem(server: ServerCall<{ id: string }>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return saveLocalCatalogItem(data as any);
  assertOnlineForWrite("離線無法編輯項目庫，請連上網路後再試");
  return server();
}

export async function apiDeleteCatalogItem(server: ServerCall<{ ok: boolean }>, id: string) {
  if (isLocalFirstMode()) return deleteLocalCatalogItem(id);
  assertOnlineForWrite("離線無法刪除項目，請連上網路後再試");
  return server();
}

export async function apiBulkDeleteCatalog(server: ServerCall<{ ok: boolean; deleted: number }>, ids: string[]) {
  if (isLocalFirstMode()) return bulkDeleteLocalCatalogItems(ids);
  assertOnlineForWrite("離線無法刪除項目，請連上網路後再試");
  return server();
}

export async function apiSeedDemoCatalog(server: ServerCall<{ ok: boolean; added: number; message: string }>) {
  if (isLocalFirstMode()) return seedLocalDemoCatalog();
  assertOnlineForWrite("離線無法匯入示範項目，請連上網路後再試");
  return server();
}

export async function apiBulkImportCatalog(
  server: ServerCall<{ ok: boolean; added: number; skipped?: number; message: string }>,
  items: Array<{
    name: string;
    unit: string;
    unit_price: number;
    category?: string | null;
    keywords?: string[];
  }>,
) {
  if (isLocalFirstMode()) return bulkImportLocalCatalog(items);
  assertOnlineForWrite("離線無法匯入項目，請連上網路後再試");
  return server();
}
