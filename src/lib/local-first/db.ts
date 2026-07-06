import Dexie, { type Table } from "dexie";
import type { CatalogItem, Profile, Quote, QuoteLine } from "@/lib/quotes.types";

export type CloudBackupRow = {
  id: string;
  userId: string;
  provider: "icloud" | "google" | "onedrive";
  label: string;
  payload: string;
  createdAt: string;
};

export class LocalFirstDB extends Dexie {
  profiles!: Table<Profile>;
  quotes!: Table<Quote>;
  quoteLines!: Table<QuoteLine & { quote_id: string; user_id: string }>;
  catalogItems!: Table<CatalogItem>;
  cloudBackups!: Table<CloudBackupRow>;

  constructor() {
    super("bdg_local_first");
    this.version(1).stores({
      profiles: "id",
      quotes: "id, user_id, updated_at",
      quoteLines: "id, quote_id, user_id, sort_order",
      catalogItems: "id, user_id, sort_order",
      cloudBackups: "id, userId, provider, createdAt",
    });
  }
}

export const localDb = new LocalFirstDB();
