import type { CatalogItem, Profile, Quote, QuoteLine } from "@/lib/quotes.types";
import { offlineCacheDb } from "@/lib/offline-cache/db";

export class OfflineError extends Error {
  constructor(message = "目前離線，請連上網路後再試") {
    super(message);
    this.name = "OfflineError";
  }
}

export function isBrowserOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function assertOnlineForWrite(message?: string) {
  if (isBrowserOffline()) throw new OfflineError(message);
}

function db() {
  if (!offlineCacheDb) throw new OfflineError("此環境不支援離線快取");
  return offlineCacheDb;
}

export async function cacheQuoteList(quotes: Quote[]) {
  const dexie = db();
  await dexie.transaction("rw", dexie.quotes, async () => {
    await dexie.quotes.clear();
    if (quotes.length) await dexie.quotes.bulkPut(quotes);
  });
}

export async function getCachedQuoteList(): Promise<Quote[]> {
  return db().quotes.orderBy("updated_at").reverse().toArray();
}

export async function cacheFullQuote(quote: Quote & { quote_lines: QuoteLine[] }) {
  const dexie = db();
  const { quote_lines: lines, ...row } = quote;
  await dexie.transaction("rw", [dexie.quotes, dexie.quoteLines], async () => {
    await dexie.quotes.put(row);
    await dexie.quoteLines.where("quote_id").equals(row.id).delete();
    if (lines.length) {
      await dexie.quoteLines.bulkPut(
        lines.map((line) => ({
          ...line,
          quote_id: row.id,
          user_id: row.user_id,
        })),
      );
    }
  });
}

export async function getCachedFullQuote(id: string) {
  const dexie = db();
  const quote = await dexie.quotes.get(id);
  if (!quote) return null;
  const quote_lines = await dexie.quoteLines.where("quote_id").equals(id).sortBy("sort_order");
  return { ...quote, quote_lines };
}

export async function cacheProfile(profile: Profile) {
  await db().profiles.put(profile);
}

export async function getCachedProfile() {
  const rows = await db().profiles.toArray();
  return rows[0] ?? null;
}

export async function cacheCatalog(items: CatalogItem[]) {
  const dexie = db();
  await dexie.transaction("rw", dexie.catalogItems, async () => {
    await dexie.catalogItems.clear();
    if (items.length) await dexie.catalogItems.bulkPut(items);
  });
}

export async function getCachedCatalog(): Promise<CatalogItem[]> {
  return db().catalogItems.orderBy("sort_order").toArray();
}
