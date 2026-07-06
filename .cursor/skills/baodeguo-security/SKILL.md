---
name: baodeguo-security
description: >-
  Security testing for 報得過 (Quote1.0) inspired by Strix pentest methodology.
  Use when reviewing auth, Supabase RLS, server functions, local-first license,
  share links, CI security, or before production deploy.
---

# 報得過安全測試（Strix 方法）

結構化滲透測試技能，改編自 [Strix](https://github.com/usestrix/strix) 的 skills 架構：先畫攻擊面 → 建立角色矩陣 → 實測 PoC → 避免誤報。

## 何時啟用

- 改動 `auth`、`quotes.functions`、`quote-auth-middleware`、Supabase migrations
- 改動 `local-first` 授權、裝置綁定、離線會籍
- PR 合併前、上線前、或使用者回報「別人看得到我的資料」

## 本專案攻擊面

| 區域 | 入口 | 信任邊界 |
|------|------|----------|
| 雲端版 | `src/lib/quotes.functions.ts` + `requireQuoteAuth` | JWT → `requireUserId` → Supabase admin client |
| Supabase | PostgREST / Storage / Auth | RLS + `user_id` 過濾 |
| 分享 | `getQuoteByShareToken` | `share_token` + 可選 `share_expires_at` |
| 本機模擬 | `scripts/local-mock-api.mjs` + `localStorage` license | HMAC 簽章、裝置上限（僅 dev） |
| 前端 | `localStorage` session / license | XSS → token 竊取風險 |

## 測試角色矩陣（必做）

為每個敏感資源建立 **Resource × Action × Principal**：

1. **未登入**（anon）
2. **使用者 A**（自己的報價）
3. **使用者 B**（他人報價 ID / share_token）
4. **過期會籍**（`expired@local` 或雲端過期帳號）

### 雲端 API（serverFn）

對每個 `createServerFn` + `requireQuoteAuth`：

- 無 `Authorization` → 應拒絕
- B 的 token + A 的 `quote.id` → 應 404/403
- `PATCH`/`DELETE` 帶他人 `id` → 應失敗
- 確認 handler 內 **一律** `.eq("user_id", userId)`，不可信任 client 傳入的 `user_id`

重點檔案：

- `src/lib/quote-auth-middleware.ts`
- `src/lib/quotes.functions.ts`
- `src/lib/auth.functions.ts`

### Supabase（Strix `supabase` skill）

參考 `checklists.md` 的 RLS 段落。高價值表：

- `quotes`, `quote_lines`, `profiles`, `catalog_*`, storage buckets

測試模式：

```
GET /rest/v1/quotes?select=*&id=eq.<他人id>
PATCH /rest/v1/quotes?id=eq.<他人id>
```

兩個不同使用者的 JWT 比對回應是否相同（應不同或 B 為空）。

### 本機模擬（local-first）

**僅開發用**，但仍需確認不會誤上線：

- `VITE_LOCAL_MOCK_SECRET` 是否在 client bundle（可偽造 license）→ 生產建置必須 `VITE_LOCAL_FIRST` 為 false
- `POST /auth/login` 裝置上限（2 台）是否生效
- 竄改 `localStorage` license JSON → 無效簽章應無法通過 refresh
- 手機 HTTP 區網：`crypto.subtle` / `randomUUID` 不可用時是否有 fallback（`random-id.ts`）

### JWT / Session（Strix `authentication_jwt` skill）

- Token 存在 `localStorage`（`session.ts`）→ 有 XSS 即帳號接管；檢查 CSP、React 危險 `dangerouslySetInnerHTML`
- CSRF：`src/start.ts` 的 `createCsrfMiddleware` 是否涵蓋所有 `serverFn`
- 過期 token、錯誤 audience 是否被拒

### 分享連結

- 猜測 `share_token` 熵是否足夠
- `share_expires_at` 過期後是否仍可讀
- 分享頁是否洩漏可編輯 API 或內部 user_id

## 工作流程（Strix 式）

1. **盤點** — `npm run security:check` + 讀 `checklists.md`
2. **靜態** — 搜尋 `service_role`、`SUPABASE_SERVICE`、`VITE_.*SECRET` 是否進 client
3. **動態** — 用兩個測試帳號跑 IDOR 矩陣；本機用 `demo@local` / `expired@local`
4. **驗證** — 每個 finding 需最小 PoC（請求 + 預期 vs 實際）
5. **輸出** — 見下方報告格式

## 報告格式

```markdown
## [嚴重度] 標題
- **攻擊面**:
- **PoC**:
- **影響**:
- **修復**:
- **驗證**:
```

嚴重度：Critical / High / Medium / Low / Info

## 進階：完整 Strix 掃描

需 Docker + LLM API key：

```bash
# 安裝見 https://docs.strix.ai
strix --target ./src --instructions "Focus on Supabase auth, serverFn IDOR, local-first license"
```

CI 可參考 Strix GitHub Actions 整合。

## 參考

- 詳細檢查表：同目錄 `checklists.md`
- 上游技能概念：[usestrix/strix/skills](https://github.com/usestrix/strix/tree/main/strix/skills)
