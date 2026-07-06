# 本機離線模式

與正式版相同介面，資料存於本機 IndexedDB；授權與會籍驗證走本機授權服務。

## 一鍵啟動

```bash
npm run local
```

會自動建立 `.env.local-first`、啟動授權服務與前端。

瀏覽器開啟：**http://localhost:8080/auth**

> dev 伺服器埠為 **8080**（非 5173）。

## 手動啟動

```bash
# 終端機 1
npm run mock:api

# 終端機 2
copy local-first.env.example .env.local-first
npm run dev:local
```

## 開發用帳號

| 帳號 | 密碼 | 說明 |
|------|------|------|
| `demo@local` | `demo123` | 有效會籍 |
| `expired@local` | `demo123` | 已過期會籍 |

## 功能路徑

| 功能 | 路徑 |
|------|------|
| 報價 | `/quotes` |
| 項目庫 | `/items` |
| 設定／資料與同步 | `/settings` |

- **自動存檔**：連線時備份至 iCloud／Google 雲端／OneDrive（依裝置偵測）
- **手動存檔**：匯出 `.bdg` 檔案，供離線轉移
- **不提供** LINE 分享連結（僅 PDF）

## 常見問題

### 無法連線至授權伺服器
執行 `npm run mock:api`，或改用 `npm run local`。

### port 3099 已被占用
授權服務已在執行，直接開 http://localhost:8080/auth

### 清除登入狀態
DevTools → Application → Local Storage → 刪除 `bdg_local_license`

## 手機測試（同一 Wi-Fi）

電腦與手機必須連**同一個 Wi-Fi**。手機無法使用 `localhost` 或 `127.0.0.1` 連到你的電腦。

### 一鍵（Windows，推薦）

```bash
npm run local:lan
```

會自動：
1. 偵測電腦區網 IP（例如 `192.168.0.105`）
2. 寫入 `.env.local-first` 的 `VITE_LOCAL_MOCK_API`
3. 啟動授權服務（區網可連）與前端（`--host`）

手機瀏覽器開啟終端機顯示的網址，例如：

`http://192.168.0.105:8080/auth`

### 手動

```bash
# 終端機 1 — 區網授權服務
npm run mock:api:lan

# 終端機 2 — 查電腦 IP（ipconfig → IPv4）
# 編輯 .env.local-first：
# VITE_LOCAL_MOCK_API=http://192.168.0.105:3099

npm run dev:local:lan
```

### 連不上時

1. 確認手機與電腦同一 Wi-Fi（不要用手機 4G）
2. Windows 防火牆允許 **Node.js** 通過（私人網路），或暫時允許 **8080**、**3099** 埠
3. 授權服務必須用 `mock:api:lan`，不能用一般的 `mock:api`
4. 修改 `.env.local-first` 後需**重啟** `dev:local:lan`

### 上線版（Vercel）

若要測已部署的正式站，手機直接開 https://quote1-0.vercel.app 即可，不需上述設定。
