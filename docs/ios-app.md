# 報得過 iOS App（Capacitor）

手機離線主力版：資料存本機 IndexedDB，登入／會籍驗證走正式站 API。

## 架構

| 層級 | 說明 |
|------|------|
| **App 本體** | Capacitor 打包的 SPA（`dist/client`） |
| **報價資料** | 裝置內 IndexedDB，可離線編輯 |
| **登入／會籍** | 連 `VITE_APP_API_ORIGIN`（預設 `https://quote1-0.vercel.app/__local_auth__`） |

## 前置條件

1. **Vercel 已開離線版後端**（見 `docs/local-first-demo.md`）  
   - `VITE_LOCAL_FIRST=true`  
   - `LOCAL_MOCK_SECRET`  
   - Supabase migration `offline_license_devices`

2. **建置環境**  
   - Windows：可 `npm run build:ios` 產生 `dist/client` 並 `cap sync`  
   - **上架 App Store 必須用 macOS + Xcode**

## 建置

```bash
npm install
npm run build:ios
```

首次會建立 `ios/` 專案。在 Mac 上：

```bash
npm run cap:open:ios
```

Xcode → Product → Archive → TestFlight / App Store。

## 設定

編輯 `.env.capacitor`：

```env
VITE_LOCAL_FIRST=true
VITE_APP_API_ORIGIN=https://quote1-0.vercel.app
```

## 使用方式

- 使用者用 **Supabase 註冊帳號**登入（與雲端版相同帳號體系）
- 登入後可離線編輯報價；**每 20 天**需連網驗證會籍
- 最多 **2 台裝置**

## 注意

- `demo@local` 僅本機 `npm run local` 可用，App 內請用真實帳號
- Apple 審核需準備隱私權說明、帳號測試方式
- 本機開發可用 `npx cap run ios`（需 Mac）
