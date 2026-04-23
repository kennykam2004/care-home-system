# 頤安三院倉存管理系統

養老院倉存管理系統，包含登入功能、用戶權限管理和即時同步。

## 技術架構

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **後端**: Express + TypeScript + Prisma ORM
- **資料庫**: PostgreSQL
- **認證**: JWT + bcrypt
- **即時同步**: Socket.io

## 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 15+
- npm 或 pnpm

### 1. 安裝依賴

```bash
# 安裝前端依賴
cd client
npm install

# 安裝後端依賴
cd ../server
npm install
```

### 2. 設定資料庫

```bash
cd server

# 複製環境變數檔案並修改
cp .env .env.local
# 編輯 .env.local，設定 DATABASE_URL

# 推送 Prisma Schema 到資料庫
npx prisma db push

# 執行資料庫遷移
npm run db:seed
```

### 3. 啟動開發伺服器

```bash
# 終端 1: 啟動後端
cd server
npm run dev

# 終端 2: 啟動前端
cd client
npm run dev
```

### 4. 開啟瀏覽器

- 前端: http://localhost:5173
- 後端 API: http://localhost:3001

## 預設帳號

| 角色 | 員工編號 | 密碼 |
|------|----------|------|
| 院長 | 000001 | director123 |

## 主要功能

- [x] 登入/登出
- [x] JWT 認證
- [x] 角色權限控制（只有院長能新增用戶）
- [x] Socket.io 即時同步
- [ ] 客戶管理（待完成）
- [ ] 服務管理（待完成）
- [ ] 庫存管理（待完成）
- [ ] 賬單管理（待完成）

## 專案結構

```
├── client/                 # 前端 React 應用
│   ├── src/
│   │   ├── api/           # API 請求
│   │   ├── components/    # UI 組件
│   │   ├── features/      # 功能模組
│   │   ├── hooks/         # 自定義 Hooks
│   │   ├── stores/        # Zustand stores
│   │   └── App.tsx
│   └── package.json
│
├── server/                 # 後端 Express 應用
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中間件
│   │   ├── routes/        # 路由
│   │   ├── config/        # 配置文件
│   │   └── socket/        # Socket.io
│   ├── prisma/
│   │   └── schema.prisma  # 數據模型
│   └── package.json
│
└── README.md
```

## API 端點

### 認證
- `POST /api/auth/login` - 登入
- `POST /api/auth/logout` - 登出
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 獲取當前用戶

### 用戶管理（需認證）
- `GET /api/users` - 獲取用戶列表
- `GET /api/users/:id` - 獲取單個用戶
- `POST /api/users` - 新增用戶（僅院長）
- `PUT /api/users/:id` - 更新用戶
- `DELETE /api/users/:id` - 刪除用戶（僅院長）
- `POST /api/users/:id/reset-password` - 重置密碼（僅院長）

## 部署

### Docker Compose（推薦）

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: carehome
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: your-password
    ports:
      - "5432:5432"

  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admin:your-password@postgres:5432/carehome

  frontend:
    build: ./client
    ports:
      - "80:80"
```

## 開發者

- 系統管理員: 甘家豪 院長
