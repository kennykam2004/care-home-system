# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 系統概述

養老院倉存管理系統（頤安三院），用於管理客戶、服務、庫存和賬單。系統基於 React + Express + Prisma (SQLite) + Socket.io。

## 開發命令

```bash
# 前端 (client/)
npm run dev          # 開發模式 (localhost:5173)
npm run build        # 生產建置

# 後端 (server/)
npm run dev          # 開發模式 (tsx watch)
npm run build        # TypeScript 編譯
npx prisma db push   # 同步 schema 到資料庫
npm run db:seed      # 播種初始資料
npx prisma studio    # 開啟 Prisma Studio 查看資料
```

## 認證

- 預設院長帳號：員工編號 `000001`，密碼 `director123`
- JWT Access Token (15分鐘) + Refresh Token (7天，httpOnly cookie)
- 只有院長角色 (AM01) 可新增/編輯/刪除用戶

## 資料模型關係

```
User ─┬─ UserRole ── Role ── RolePermission
      │                  (permissions per role)
      └─ (createdBy relation)

Customer ─┬─ Family (家屬聯絡人)
          ├─ ServiceRecord (服務記錄，會自動扣庫存)
          ├─ PrepaidRecord (預繳費記錄)
          ├─ BillPublish (賬單發佈記錄)
          ├─ CashRecord (現金進賬記錄)
          └─ Bill (動態計算，非預存)

Service ─┬─ InventoryRecord (庫存變動記錄)
         └─ ServiceRecord (服務使用記錄)

InventoryRecord.stock 為 null 時表示無限庫存
```

## 業務邏輯重點

### 账單生成 (BillsView.tsx)
- 账單**並非預先儲存**，而是根據所選月份動態生成
- 計算邏輯：`totalFee = 客戶basicFee + 當月服務記錄amount總和`
- `debt = totalFee - prepaid(客戶balance)`
- `status = debt <= 0 ? '已繳費' : '待繳費'`

### 服務記錄新增 (ServiceRecordView.tsx)
- 新增服務記錄時，會自動建立對應的 `InventoryRecord` 扣減庫存
- `handleAddRecord` 函數同時呼叫 `/api/service-records` 和 `/api/inventory`

### 庫存無限值
- `Service.stock = null` 表示無限庫存，不進行庫存扣減
- `InventoryView` 中以 `∞` 符號顯示

### 預繳費扣減 (deductPrepaid)
- `POST /api/bills/deduct-prepaid` 直接減少 `Customer.balance`
- 账單狀態由前端根據 `debt <= 0` 判斷，非後端儲存

## API 路由結構

| 模組 | 路由前綴 | 主要端點 |
|------|----------|----------|
| 認證 | /api/auth | login, logout, refresh, me |
| 用戶 | /api/users | CRUD + reset-password |
| 角色 | /api/roles | CRUD |
| 權限 | /api/permissions | GET |
| 客戶 | /api/customers | CRUD + family |
| 服務 | /api/services | CRUD |
| 庫存 | /api/inventory | GET, POST (變動記錄) |
| 服務記錄 | /api/service-records | CRUD |
| 账單 | /api/bills | GET, PUT, deduct-prepaid |
| 預繳費記錄 | /api/prepaid-records | GET, POST |
| 账單發佈 | /api/bill-publishes | GET, POST, DELETE |
| 現金進賬 | /api/cash-records | GET, POST, DELETE |

## 即時同步

Socket.io 在以下事件觸發時廣播資料更新：
- `bills`, `customers`, `service-records`, `services`, `inventory`, `users`, `roles`, `prepaid-records`, `bill-publishes`, `cash-records`

前端透過 `useSocketEvent` hook 監聽並自動刷新相應資料。

## 前端模組對應

- `features/customers/CustomerView.tsx` - 客戶訊息管理
- `features/customers/ServiceRecordView.tsx` - 服務記錄
- `features/customers/BillsView.tsx` - 账單管理
- `features/customers/PrepaidRecordsView.tsx` - 預繳費記錄
- `features/customers/BillPublishView.tsx` - 賬單發佈
- `features/customers/CashRecordsView.tsx` - 現金進賬
- `features/inventory/InventoryView.tsx` - 庫存概覽
- `features/services/ServicesView.tsx` - 服務項目管理
- `features/users/UserManagementView.tsx` - 用戶管理
- `features/roles/RoleManagementView.tsx` - 角色管理
