# 報得過 Quote1.0

獨立專案 repo：`AndyKao-commits/Quote1.0`  
線上網址：https://quote1-0.vercel.app

**本 repo 與其他專案無連動。** push 到 `main` 後 Vercel 自動部署，不需額外 GitHub Actions。

## 環境變數（Vercel / 本機 .env）

```
SUPABASE_URL=https://tsnjjdwmrvloemwizmdi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的-service-role-key（僅伺服器，勿公開）
```

**重要：** `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 環境變數，不要 commit 到 Git。

## 本機開發

```bash
git clone https://github.com/AndyKao-commits/Quote1.0.git
cd Quote1.0
npm install
cp .env.example .env   # 填入 SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## 部署（自動）

1. Vercel 連本 repo **`Quote1.0`**，Production Branch = **`main`**
2. 環境變數：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
3. `git push origin main` → Vercel 自動 build，**不用手動 Redeploy**

Build 設定：
- Build Command：`npm run build`
- Output Directory：**留空**

## Supabase Auth 網址

**Authentication → URL Configuration**

- Site URL：`https://quote1-0.vercel.app`
- Redirect URLs：`https://quote1-0.vercel.app/**`、`http://localhost:5173/**`

## 資料庫

新安裝：執行 `supabase/bootstrap-quotes.sql`  
已有資料庫：

```sql
ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'item';
```

## 功能

- 三種報價模板、PDF 匯出、LINE 分享
- 項目庫（載入示範項目）、拖曳排序、大/小項目、備註
- 聯絡人、歷史報價、品牌 Logo 設定
