# Volvo 售後服務營運平台

## 專案結構

```
volvo-ops-platform/
├── client/                     # React 前端 (Vite)
│   └── src/
│       ├── pages/              # 頁面元件
│       ├── components/         # 共用元件
│       └── services/api.js     # API 呼叫
├── server/                     # Node.js 後端 (Express)
│   ├── routes/                 # API 路由 (8 個模組)
│   ├── services/               # 業務邏輯引擎
│   │   ├── uploadParser.js     # 上傳解析 + 公式引擎
│   │   └── trackingEngine.js   # 追蹤品項統計
│   ├── models/db.js            # PostgreSQL 連線
│   └── middleware/auth.js      # JWT 認證
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
cp .env.example .env  # 填入 DATABASE_URL
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

| 模組 | 路徑 | 說明 |
|------|------|------|
| Auth | /api/auth | 登入/認證 |
| Upload | /api/upload | 多檔上傳+自動辨識 |
| Dashboard | /api/dashboard | 即時戰報+四廠整合 |
| Repair | /api/repair | 維修收入查詢 |
| Tech | /api/tech | 技師績效查詢 |
| Parts | /api/parts | 零件銷售查詢 |
| Targets | /api/targets | 目標管理 |
| Admin | /api/admin | 後台管理 |
| Export | /api/export | Excel 匯出 |

## 部署 (Zeabur)
1. GitHub push → Zeabur 自動 build
2. Marketplace 開 PostgreSQL
3. 環境變數設定 DATABASE_URL, JWT_SECRET
