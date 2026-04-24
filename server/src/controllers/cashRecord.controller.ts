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

    const record = await prisma.$transaction(async (tx) => {
      const parsedAmount = parseFloat(amount);

      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new Error('客戶不存在');
      }

      const newRecord = await tx.cashRecord.create({
        data: {
          customerId,
          type,
          amount: parsedAmount,
          date: new Date(date),
          reason,
          note,
          collectedBy: userId
        }
      });

      // If it's income, atomically update customer balance
      if (type === '收入') {
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: parsedAmount } }
        });
      }

      return newRecord;
    });

    broadcastDataUpdate('cash-records', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Add cash record error:', error);
    const message = error instanceof Error ? error.message : '新增現金進賬記錄失敗';
    res.status(400).json({ error: message });
  }
};

export const deleteCashRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.$transaction(async (tx) => {
      const record = await tx.cashRecord.findUnique({ where: { id } });
      if (!record) {
        throw new Error('記錄不存在');
      }

      // Reverse the balance change if it was income
      if (record.type === '收入') {
        await tx.customer.update({
          where: { id: record.customerId },
          data: { balance: { decrement: record.amount } }
        });
      }

      await tx.cashRecord.delete({ where: { id } });
    });

    broadcastDataUpdate('cash-records', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    console.error('Delete cash record error:', error);
    const message = error instanceof Error ? error.message : '刪除現金進賬記錄失敗';
    res.status(400).json({ error: message });
  }
};
