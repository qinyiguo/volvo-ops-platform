# Volvo 售後服務營運平台

## 專案結構

```
volvo-ops-platform/
├── client/                     # React 前端 (Vite)
│   └── src/
│       ├── pages/              # 頁面元件
│       ├── components/         # 共用元件 (Layout.jsx)
│       └── services/api.js     # API 呼叫
├── server/                     # Node.js 後端 (Express)
│   ├── routes/                 # API 路由 (8 個模組)
│   ├── services/               # 業務邏輯引擎
│   │   ├── uploadParser.js     # 上傳解析 + 公式引擎
│   │   └── trackingEngine.js   # 追蹤品項統計
│   └── models/db.js            # PostgreSQL 連線
└── database/
    └── schema.sql              # 15 張表 + 1 View
```

## 快速開始

### 1. 資料庫
```bash
# 在 Zeabur 開 PostgreSQL，或本地用 Docker
createdb volvo_ops
psql volvo_ops < database/schema.sql
```

### 2. 後端
```bash
cd server
cp .env.example .env  # 填入 POSTGRES_CONNECTION_STRING
npm install
npm run dev
```

### 3. 前端
```bash
cd client
npm install
npm run dev
```

## API 總覽

所有 API 皆為公開存取，無需登入。

| 模組 | 路徑 | 說明 |
|------|------|------|
| Upload | /api/upload | 多檔上傳+自動辨識 |
| Dashboard | /api/dashboard | 即時戰報+四廠整合 |
| Repair | /api/repair | 維修收入查詢 |
| Tech | /api/tech | 技師績效查詢 |
| Parts | /api/parts | 零件銷售查詢 |
| Targets | /api/targets | 目標管理 |
| Admin | /api/admin | 後台管理 |
| Export | /api/export | Excel 匯出 |
| Health | /api/health | 健康檢查（含 DB 連線狀態）|

## 頁面功能

| 分類 | 頁面 | 說明 |
|------|------|------|
| 戰報 | 即時戰報 | SA綜合統計、接待業績(引擎/鈑烤)、技師統計、GRO銷售、美容統計 |
| 戰報 | 四廠整合 | 跨據點 KPI 比較、電油車統計、追蹤品項統計 |
| 查詢 | 維修收入查詢 | 明細/帳類彙總，支援匯出 Excel |
| 查詢 | 技師績效查詢 | 排名統計/明細，支援匯出 Excel |
| 查詢 | 零件銷售查詢 | 明細/彙總，支援匯出 Excel |
| 管理 | 資料上傳 | 拖拉 DMS Excel，系統自動辨識類型與據點 |
| 管理 | 目標設定 | 年度目標、月權重、人員權重、預覽分配 |
| 管理 | 後台管理 | 追蹤品項設定、人員據點對照、使用者管理、促銷獎金參數 |

## 部署 (Zeabur)

1. GitHub push → Zeabur 自動 build（Dockerfile）
2. Marketplace 開 PostgreSQL
3. Zeabur 會自動注入 `POSTGRES_CONNECTION_STRING` 環境變數
4. 部署後訪問 `/api/health` 確認 DB 連線狀態
