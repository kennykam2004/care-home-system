import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getAuditLogs } from '../services/audit.service.js';

const FIELD_LABELS: Record<string, Record<string, string>> = {
  customers: {
    name: '客戶姓名',
    careId: '照顧 ID',
    gender: '性別',
    idCard: '身份證',
    phone: '電話',
    status: '狀態',
    basicFee: '基本費用',
    subsidy: '補貼',
    deposit: '按金',
    balance: '餘額',
    bed: '床位',
  },
  bills: {
    customerId: '客戶',
    month: '月份',
    amount: '金額',
    status: '狀態',
    note: '備註',
  },
  'service-records': {
    customerId: '客戶',
    serviceId: '服務',
    name: '名稱',
    qty: '數量',
    amount: '金額',
    date: '日期',
  },
  inventory: {
    itemId: '項目',
    type: '類型',
    qty: '數量',
    reason: '原因',
    date: '日期',
  },
  'prepaid-records': {
    customerId: '客戶',
    amount: '金額',
    date: '日期',
    note: '備註',
  },
  'cash-records': {
    customerId: '客戶',
    type: '類型',
    amount: '金額',
    reason: '原因',
  },
  users: {
    name: '姓名',
    phone: '電話',
    email: '電郵',
    status: '狀態',
    employeeId: '員工編號',
  },
};

function formatChanges(module: string, changes: string, action: string): string {
  try {
    const obj = JSON.parse(changes);
    const labels = FIELD_LABELS[module] || {};

    // For update, split into before/after
    if (action === 'update' && obj.before && obj.after) {
      const parts: string[] = [];
      for (const key of Object.keys(obj.after)) {
        const label = labels[key] || key;
        const before = obj.before[key];
        const after = obj.after[key];
        if (before !== after) {
          parts.push(`${label}: ${before} → ${after}`);
        }
      }
      return parts.join(', ');
    }

    // For create/delete, show all fields
    return Object.entries(obj)
      .filter(([k]) => k !== 'createdAt' && k !== 'updatedAt')
      .map(([key, value]) => {
        const label = labels[key] || key;
        return `${label}: ${value}`;
      })
      .join(', ');
  } catch {
    return changes;
  }
}

export const getAuditLogsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { module, action, startDate, endDate, page, pageSize } = req.query;

    const filters: any = {};
    if (module) filters.module = module as string;
    if (action) filters.action = action as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (page) filters.page = parseInt(page as string);
    if (pageSize) filters.pageSize = parseInt(pageSize as string);

    const result = await getAuditLogs(filters);

    // Format changes for display
    const formattedLogs = result.logs.map((log: any) => ({
      ...log,
      changes: formatChanges(log.module, log.changes || '{}', log.action),
    }));

    res.json({
      logs: formattedLogs,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: '獲取審計日誌失敗' });
  }
};