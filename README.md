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

## 自動部署（設定一次，之後免手動）

程式 push 到 `cursor/baodeguo-quote1-bd62` 後，GitHub Actions 會自動同步到 **Quote1.0 main**，Vercel 會自動 build。

### 只需做一次（約 2 分鐘）

1. 建立 Token：https://github.com/settings/tokens?type=beta  
   - Repository access → **Only select** → 選 `Quote1.0`  
   - Permissions → **Contents: Read and write**  
   - 產生後複製 token

2. 加入 Secret：https://github.com/AndyKao-commits/dowaterlightout/settings/secrets/actions  
   - **New repository secret**  
   - Name：`QUOTE1_PUSH_TOKEN`  
   - Value：貼上 token

3. Vercel 已連 `Quote1.0` 且 branch 為 `main` 即可（你已完成）

之後每次更新程式，**不用再** `git push quote1` 或手動 Redeploy。

手動重跑：GitHub → dowaterlightout → Actions → Deploy Quote1.0 → Run workflow

---

## 部署到 Vercel（首次）

專案已設定 `nitro preset: vercel`，可直接部署。

### 步驟 1：建立 Vercel 專案

1. 登入 [vercel.com](https://vercel.com)
2. **Add New → Project**
3. 選擇 GitHub repo（`AndyKao-commits/dowaterlightout` 或你的 `Quote1.0` fork）
4. **Branch** 選 `cursor/baodeguo-quote1-bd62`（或合併到 `main` 後選 main）
5. Framework 會自動辨識為 TanStack Start

### 步驟 2：環境變數（Vercel → Settings → Environment Variables）

| 名稱 | 值 |
|------|-----|
| `SUPABASE_URL` | `https://tsnjjdwmrvloemwizmdi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → **service_role**（Secret key） |

### 步驟 3：Supabase Auth 網址

部署完成後取得 Vercel 網址（例如 `https://quote10.vercel.app`），到 Supabase：

**Authentication → URL Configuration**

- **Site URL**：`https://你的網域.vercel.app`
- **Redirect URLs** 新增：
  - `https://你的網域.vercel.app/**`
  - `http://localhost:5173/**`（本機開發用）

### 步驟 4：Deploy

點 **Deploy**，約 1–2 分鐘後即可用網址登入使用。

### 資料庫（若尚未執行）

```sql
ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'item';
```
