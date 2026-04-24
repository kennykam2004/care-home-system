import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';
import { createAuditLog } from '../services/audit.service.js';

export const getPrepaidRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const records = await prisma.prepaidRecord.findMany({
      where,
      include: { customer: true },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '獲取預繳費記錄失敗' });
  }
};

export const addPrepaidRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount, date, note } = req.body;

    if (!customerId || amount === undefined || !date) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const record = await prisma.$transaction(async (tx) => {
      const parsedAmount = parseFloat(amount);

      // 檢查客戶是否存在
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new Error('客戶不存在');
      }

      const newRecord = await tx.prepaidRecord.create({
        data: {
          customerId,
          amount: parsedAmount,
          date: new Date(date),
          note
        }
      });

      // 使用原子增量更新余額
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { increment: parsedAmount } }
      });

      return newRecord;
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'prepaid-records',
      action: 'create',
      recordId: record.id,
      recordType: 'PrepaidRecord',
      changes: { customerId, amount: record.amount },
      ipAddress: req.ip,
    });

    broadcastDataUpdate('prepaid-records', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Add prepaid error:', error);
    const message = error instanceof Error ? error.message : '新增預繳費記錄失敗';
    res.status(400).json({ error: message });
  }
};
