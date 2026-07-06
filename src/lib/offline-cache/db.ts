import Dexie, { type Table } from "dexie";
import type { CatalogItem, Profile, Quote, QuoteLine } from "@/lib/quotes.types";

export class OfflineCacheDB extends Dexie {
  quotes!: Table<Quote>;
  quoteLines!: Table<QuoteLine & { quote_id: string; user_id: string }>;
  catalogItems!: Table<CatalogItem>;
  profiles!: Table<Profile>;

  constructor() {
    super("bdg_offline_cache");
    this.version(1).stores({
      quotes: "id, user_id, updated_at",
      quoteLines: "id, quote_id, user_id, sort_order",
      catalogItems: "id, user_id, sort_order",
      profiles: "id",
    });
  }
}

export const offlineCacheDb =
  typeof indexedDB !== "undefined" ? new OfflineCacheDB() : (null as unknown as OfflineCacheDB);
