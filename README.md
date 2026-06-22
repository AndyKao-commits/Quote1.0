# 報得過 Quote1.0

Vercel 自動部署 + Supabase 後端。

## 環境變數（Vercel / 本機 .env）

```
SUPABASE_URL=https://tsnjjdwmrvloemwizmdi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的-service-role-key（僅伺服器，勿公開）

# 選填：若日後改用 client-side Supabase auth
# VITE_SUPABASE_URL=
# VITE_SUPABASE_PUBLISHABLE_KEY=
```

**重要：** `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 環境變數，不要 commit 到 Git。

## 資料庫初始化

1. 打開 [Supabase SQL Editor](https://supabase.com/dashboard/project/tsnjjdwmrvloemwizmdi/sql/new)
2. 從 GitHub 打開 `supabase/bootstrap-quotes.sql`，**全選複製**（第一行必須是 `CREATE OR REPLACE FUNCTION`，不要複製 README 裡的說明文字）
3. 貼到 SQL Editor → Run

若出現 `syntax error at or near "-"`，代表複製到 Markdown 說明文字了，請改複製 `.sql` 檔案內容。

## 本機開發

```bash
npm install
cp .env.example .env   # 填入 SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## 功能

- 三種報價模板（工班清楚 / 工作室 / 正式文件）
- 左填右看即時預覽、匯出 PDF
- 快速項目庫（關鍵字搜尋）
- 聯絡人、歷史報價、複製再改
- 含稅／統編由使用者自行開關
- LINE 分享（短連結 + 預覽頁 `/q/:token`）

## 部署

推送到 `main` 後 Vercel 自動 build（`nitro preset: vercel`）。

記得在 Supabase Auth → URL Configuration 加入你的 Vercel 網域。
