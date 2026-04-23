import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

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

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: '客戶不存在' });
      return;
    }

    const record = await prisma.prepaidRecord.create({
      data: {
        customerId,
        amount: parseFloat(amount),
        date: new Date(date),
        note
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: customer.balance + parseFloat(amount) }
    });

    broadcastDataUpdate('prepaid-records', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Add prepaid error:', error);
    res.status(500).json({ error: '新增預繳費記錄失敗' });
  }
};
