import type { QuoteLine, QuoteLineType } from "@/lib/quotes.types";

export type CatalogCsvRow = {
  name: string;
  unit: string;
  unit_price: number;
  category: string | null;
  keywords: string[];
};

export type QuoteLineCsvRow = {
  line_type: QuoteLineType;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  note: string | null;
};

const CATALOG_ALIASES: Record<string, keyof CatalogCsvRow | "keywords_raw"> = {
  name: "name",
  項目名稱: "name",
  名稱: "name",
  項目: "name",
  unit: "unit",
  單位: "unit",
  unit_price: "unit_price",
  unitprice: "unit_price",
  price: "unit_price",
  單價: "unit_price",
  價格: "unit_price",
  category: "category",
  分類: "category",
  類別: "category",
  keywords: "keywords_raw",
  keyword: "keywords_raw",
  關鍵字: "keywords_raw",
  tags: "keywords_raw",
};

const LINE_ALIASES: Record<string, keyof QuoteLineCsvRow | "line_type_raw"> = {
  line_type: "line_type_raw",
  linetype: "line_type_raw",
  type: "line_type_raw",
  類型: "line_type_raw",
  項目類型: "line_type_raw",
  name: "name",
  項目名稱: "name",
  名稱: "name",
  項目: "name",
  unit: "unit",
  單位: "unit",
  quantity: "quantity",
  qty: "quantity",
  數量: "quantity",
  unit_price: "unit_price",
  unitprice: "unit_price",
  price: "unit_price",
  單價: "unit_price",
  價格: "unit_price",
  note: "note",
  備註: "note",
  說明: "note",
};

function normalizeHeader(h: string) {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "");
}

function mapHeader(header: string, aliases: Record<string, string>) {
  const key = normalizeHeader(header);
  return aliases[key] ?? aliases[header.trim()] ?? null;
}

/** Minimal RFC-style CSV parser (quoted fields, commas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function parseNumber(v: string, fallback = 0) {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function splitKeywords(v: string) {
  return v
    .split(/[,，、;；|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLineType(v: string): QuoteLineType {
  const s = v.trim().toLowerCase();
  if (["group", "大項目", "大项", "工種", "工种", "標題", "标题"].includes(s)) return "group";
  return "item";
}

function rowsToObjects(rows: string[][]) {
  if (!rows.length) return { headers: [] as string[], data: [] as Record<string, string>[] };
  const [headerRow, ...body] = rows;
  const headers = headerRow.map((h) => h.trim());
  const data = body.map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, data };
}

export function parseCatalogCsv(text: string): { rows: CatalogCsvRow[]; errors: string[] } {
  const table = parseCsv(text);
  const { headers, data } = rowsToObjects(table);
  const errors: string[] = [];
  const colMap = new Map<number, keyof CatalogCsvRow | "keywords_raw">();

  headers.forEach((h, i) => {
    const mapped = mapHeader(h, CATALOG_ALIASES);
    if (mapped) colMap.set(i, mapped);
  });

  if (![...colMap.values()].includes("name")) {
    return { rows: [], errors: ["找不到「項目名稱」欄位（可用 name / 項目名稱）"] };
  }

  const rows: CatalogCsvRow[] = [];
  data.forEach((row, idx) => {
    const lineNo = idx + 2;
    const raw: Partial<Record<keyof CatalogCsvRow | "keywords_raw", string>> = {};
    colMap.forEach((field, colIdx) => {
      const header = headers[colIdx];
      raw[field] = row[header] ?? "";
    });

    const name = (raw.name ?? "").trim();
    if (!name) {
      errors.push(`第 ${lineNo} 行：項目名稱不可為空，已略過`);
      return;
    }

    rows.push({
      name,
      unit: (raw.unit ?? "式").trim() || "式",
      unit_price: Math.max(0, parseNumber(raw.unit_price ?? "0")),
      category: (raw.category ?? "").trim() || null,
      keywords: raw.keywords_raw ? splitKeywords(raw.keywords_raw) : [],
    });
  });

  return { rows, errors };
}

export function parseQuoteLinesCsv(text: string): { rows: QuoteLineCsvRow[]; errors: string[] } {
  const table = parseCsv(text);
  const { headers, data } = rowsToObjects(table);
  const errors: string[] = [];
  const colMap = new Map<number, keyof QuoteLineCsvRow | "line_type_raw">();

  headers.forEach((h, i) => {
    const mapped = mapHeader(h, LINE_ALIASES);
    if (mapped) colMap.set(i, mapped);
  });

  if (![...colMap.values()].includes("name")) {
    return { rows: [], errors: ["找不到「項目名稱」欄位（可用 name / 項目名稱）"] };
  }

  const rows: QuoteLineCsvRow[] = [];
  data.forEach((row, idx) => {
    const lineNo = idx + 2;
    const raw: Partial<Record<keyof QuoteLineCsvRow, string>> & { line_type_raw?: string } = {};
    colMap.forEach((field, colIdx) => {
      const header = headers[colIdx];
      const val = row[header] ?? "";
      if (field === "line_type_raw") raw.line_type_raw = val;
      else raw[field as keyof QuoteLineCsvRow] = val;
    });

    const name = (raw.name ?? "").trim();
    if (!name) {
      errors.push(`第 ${lineNo} 行：項目名稱不可為空，已略過`);
      return;
    }

    const line_type = parseLineType(raw.line_type_raw ?? "item");
    rows.push({
      line_type,
      name,
      unit: line_type === "group" ? "—" : (raw.unit ?? "式").trim() || "式",
      quantity: line_type === "group" ? 0 : Math.max(0, parseNumber(raw.quantity ?? "1", 1)),
      unit_price: line_type === "group" ? 0 : Math.max(0, parseNumber(raw.unit_price ?? "0")),
      note: (raw.note ?? "").trim() || null,
    });
  });

  return { rows, errors };
}

function escCsvField(s: string) {
  if (/[",\n\r\[]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function catalogRowsToCsv(): string {
  const header = "項目名稱,單位,單價,分類,關鍵字";
  const sample = "拆除工程,式,15000,拆除,拆除 敲除";
  return `${header}\n${sample}\n`;
}

export function quoteLinesToCsv(): string {
  const header = "類型,項目名稱,單位,數量,單價,備註";
  const samples = [
    "大項目,泥作工程,,,,",
    "小項目,地坪整平,坪,12,4500,含材料",
  ];
  return `${header}\n${samples.join("\n")}\n`;
}

export function quoteLineCsvToQuoteLines(rows: QuoteLineCsvRow[], startOrder: number): QuoteLine[] {
  return rows.map((r, i) => ({
    sort_order: startOrder + i,
    line_type: r.line_type,
    name: r.name,
    unit: r.unit,
    quantity: r.quantity,
    unit_price: r.unit_price,
    note: r.note,
  }));
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
