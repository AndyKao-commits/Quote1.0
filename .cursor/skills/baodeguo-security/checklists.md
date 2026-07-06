# 報得過安全檢查表（改編 Strix）

## Supabase RLS

- [ ] 所有含 PII/報價的表已 `ENABLE ROW LEVEL SECURITY`
- [ ] SELECT/INSERT/UPDATE/DELETE 四種操作皆有 policy（非只做 SELECT）
- [ ] Policy 使用 `auth.uid()`，非 client 傳入的 `user_id`
- [ ] 多租戶欄位（若有 `org_id`）在 policy 內強制過濾
- [ ] RPC `SECURITY DEFINER` 函數內部有 ownership 檢查
- [ ] Storage bucket 非 public 除非刻意公開
- [ ] `service_role` 僅在 `*.server.ts`，未出現在 `src/routes` client bundle

## TanStack serverFn

- [ ] 敏感操作皆掛 `requireQuoteAuth`
- [ ] 無 token 時 `requireUserId` 拋錯，非回空資料
- [ ] `getQuote` / `saveQuote` / `deleteQuote` 雙重條件 `id` + `user_id`
- [ ] 公開 endpoint（如 share）刻意不掛 auth，且欄位最小化
- [ ] `inputValidator`（zod）擋住 mass assignment 多餘欄位

## Auth / JWT

- [ ] 登入 rate limit（`login_rate_limits`）僅 service_role 可寫
- [ ] Refresh token 輪替與過期處理
- [ ] Logout 清除 client session
- [ ] 生產環境 HTTPS；Cookie 若有則 Secure + SameSite

## Local-first（dev only）

- [ ] 生產 build 未設 `VITE_LOCAL_FIRST=true`
- [ ] `LOCAL_MOCK_SECRET` 不進前端 env
- [ ] 裝置上限 2 台：第三台 403
- [ ] 離線 20 天後 `evaluateAccess` 鎖編輯
- [ ] `expired@local` 無法完整編輯

## Client

- [ ] 無硬編碼 API key / JWT
- [ ] PDF/匯出不含其他使用者資料
- [ ] 錯誤訊息不洩漏 stack / SQL

## IDOR 手動 PoC 範本

```http
# 使用者 B 的 token，嘗試讀 A 的報價
GET /api/...  Authorization: Bearer <B>
# serverFn: getQuote({ id: "<A的quoteId>" })
# 預期: 找不到報價單 / 403
```
