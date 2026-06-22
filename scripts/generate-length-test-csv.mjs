import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LIMIT_NAME = 100;
const LIMIT_NOTE = 200;

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "test-data");
mkdirSync(dir, { recursive: true });

function pad(n, ch = "項") {
  const label = `[字數${n}]`;
  if (n <= label.length) return label.slice(0, n);
  return label + ch.repeat(n - label.length);
}

function esc(s) {
  if (/[",\n\r\[]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const catalogLengths = [1, 5, 10, 20, 50, 80, 95, 100, 120, 200, 500];
const catalogRows = ["項目名稱,單位,單價,分類,關鍵字"];
catalogLengths.forEach((n, i) => {
  const name = pad(n);
  catalogRows.push([esc(name), "式", 1000 + i, "字數測試", "測試"].join(","));
});
catalogRows.push([esc("含逗號,測試"), "式", 2000, "特殊字元", "逗號"].join(","));
catalogRows.push([esc('含"引號"測試'), "式", 2001, "特殊字元", "引號"].join(","));
catalogRows.push([esc("含換行\n第二行"), "式", 2002, "特殊字元", "換行"].join(","));

const quoteLengths = [1, 10, 20, 50, 80, 95, 100, 120, 200, 500];
const quoteRows = ["類型,項目名稱,單位,數量,單價,備註"];
quoteLengths.forEach((n, i) => {
  const name = pad(n);
  const type = i % 3 === 0 ? "大項目" : "小項目";
  const unit = type === "大項目" ? "" : "式";
  const qty = type === "大項目" ? "" : "1";
  const price = type === "大項目" ? "" : String(1000 + i);
  const note = `名稱共${n}字`;
  quoteRows.push([type, esc(name), unit, qty, price, esc(note)].join(","));
});
quoteRows.push(
  ["小項目", esc(pad(100)), "式", "1", "3000", esc(`備註${LIMIT_NOTE}字：` + "註".repeat(LIMIT_NOTE))].join(","),
);
quoteRows.push(
  ["小項目", esc(pad(150)), "式", "1", "3001", esc("名稱超過100字應截斷")].join(","),
);
quoteRows.push(
  ["小項目", esc(pad(50)), "式", "1", "3002", esc("備註超過200字：" + "註".repeat(250))].join(","),
);

writeFileSync(join(dir, "項目庫-字數測試.csv"), `\uFEFF${catalogRows.join("\n")}\n`, "utf8");
writeFileSync(join(dir, "報價明細-字數測試.csv"), `\uFEFF${quoteRows.join("\n")}\n`, "utf8");

const summary = `# 項目字數測試 CSV

| 檔案 | 用途 | 匯入位置 |
|------|------|----------|
| 項目庫-字數測試.csv | 測試項目庫名稱字數 | /items → 匯入 CSV |
| 報價明細-字數測試.csv | 測試報價明細名稱與備註字數 | 編輯報價 → 匯入 CSV |

## 測試字數（名稱欄）
${catalogLengths.join(", ")} 字（含超過上限的列，匯入時應截斷至 ${LIMIT_NAME} 字）

## 應用程式限制
- 項目名稱：最多 ${LIMIT_NAME} 字
- 備註：最多 ${LIMIT_NOTE} 字

## 特殊列（僅項目庫檔）
- 含逗號
- 含引號
- 含換行
`;
writeFileSync(join(dir, "README.md"), summary, "utf8");

console.log(`Generated ${catalogRows.length - 1} catalog rows, ${quoteRows.length - 1} quote rows in test-data/`);
