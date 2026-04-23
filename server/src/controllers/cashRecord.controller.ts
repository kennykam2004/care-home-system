import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getCashRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, startDate, endDate, type } = req.query;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const records = await prisma.cashRecord.findMany({
      where,
      include: { customer: true },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '獲取現金進賬記錄失敗' });
  }
};

export const addCashRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, type, amount, date, reason, note } = req.body;
    const userId = req.user?.userId;

    if (!customerId || !type || amount === undefined || !date || !reason) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: '客戶不存在' });
      return;
    }

    const record = await prisma.cashRecord.create({
      data: {
        customerId,
        type,
        amount: parseFloat(amount),
        date: new Date(date),
        reason,
        note,
        collectedBy: userId
      }
    });

    // If it's income, update customer balance
    if (type === '收入') {
      await prisma.customer.update({
        where: { id: customerId },
        data: { balance: customer.balance + parseFloat(amount) }
      });
    }

    broadcastDataUpdate('cash-records', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Add cash record error:', error);
    res.status(500).json({ error: '新增現金進賬記錄失敗' });
  }
};

export const deleteCashRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const record = await prisma.cashRecord.findUnique({ where: { id } });
    if (!record) {
      res.status(404).json({ error: '記錄不存在' });
      return;
    }

    // Reverse the balance change if it was income
    if (record.type === '收入') {
      const customer = await prisma.customer.findUnique({ where: { id: record.customerId } });
      if (customer) {
        await prisma.customer.update({
          where: { id: record.customerId },
          data: { balance: customer.balance - record.amount }
        });
      }
    }

    await prisma.cashRecord.delete({ where: { id } });
    broadcastDataUpdate('cash-records', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除現金進賬記錄失敗' });
  }
};
