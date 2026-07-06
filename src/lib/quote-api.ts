import { isLocalFirstMode } from "@/lib/local-first/config";
import type { SampleQuoteId } from "@/lib/landing-demo-quotes";
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

export function quoteApiEnabled() {
  return isLocalFirstMode();
}

export async function apiGetProfile(server: ServerCall<any>) {
  if (isLocalFirstMode()) return getLocalProfile();
  return server();
}

export async function apiUpdateProfile(server: ServerCall<any>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return updateLocalProfile(data as any);
  return server();
}

export async function apiListQuotes(server: ServerCall<any[]>) {
  if (isLocalFirstMode()) return listLocalQuotes();
  return server();
}

export async function apiGetQuote(server: ServerCall<any>, id: string) {
  if (isLocalFirstMode()) return getLocalQuote(id);
  return server();
}

export async function apiCreateQuote(server: ServerCall<{ id: string }>) {
  if (isLocalFirstMode()) return createLocalQuote();
  return server();
}

export async function apiCreateSampleQuote(server: ServerCall<{ id: string }>, sampleId: SampleQuoteId) {
  if (isLocalFirstMode()) return createLocalSampleQuote(sampleId);
  return server();
}

export async function apiDuplicateQuote(server: ServerCall<{ id: string }>, id: string) {
  if (isLocalFirstMode()) return duplicateLocalQuote(id);
  return server();
}

export async function apiDeleteQuote(server: ServerCall<{ ok: boolean }>, id: string) {
  if (isLocalFirstMode()) return deleteLocalQuote(id);
  return server();
}

export async function apiSaveQuote(server: ServerCall<any>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return saveLocalQuote(data as any);
  return server();
}

export async function apiListCatalog(server: ServerCall<any[]>) {
  if (isLocalFirstMode()) return listLocalCatalog();
  return server();
}

export async function apiSaveCatalogItem(server: ServerCall<{ id: string }>, data: Record<string, unknown>) {
  if (isLocalFirstMode()) return saveLocalCatalogItem(data as any);
  return server();
}

export async function apiDeleteCatalogItem(server: ServerCall<{ ok: boolean }>, id: string) {
  if (isLocalFirstMode()) return deleteLocalCatalogItem(id);
  return server();
}

export async function apiBulkDeleteCatalog(server: ServerCall<{ ok: boolean; deleted: number }>, ids: string[]) {
  if (isLocalFirstMode()) return bulkDeleteLocalCatalogItems(ids);
  return server();
}

export async function apiSeedDemoCatalog(server: ServerCall<{ ok: boolean; added: number; message: string }>) {
  if (isLocalFirstMode()) return seedLocalDemoCatalog();
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
  return server();
}
