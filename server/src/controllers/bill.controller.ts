import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getBills = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, month } = req.query;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (month) where.month = month;

    const bills = await prisma.bill.findMany({
      where,
      include: { customer: true },
      orderBy: { month: 'desc' }
    });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: '獲取賬單列表失敗' });
  }
};

export const getBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { customer: true }
    });
    if (!bill) {
      res.status(404).json({ error: '賬單不存在' });
      return;
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: '獲取賬單失敗' });
  }
};

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, month, basicFee, serviceFee, totalFee, prepaid, debt } = req.body;

    if (!customerId || !month || totalFee === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const bill = await prisma.bill.create({
      data: {
        customerId,
        month,
        basicFee: basicFee || 0,
        serviceFee: serviceFee || 0,
        totalFee,
        prepaid: prepaid || 0,
        debt: debt || 0
      }
    });
    broadcastDataUpdate('bills', 'create', bill.id);
    res.json(bill);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ error: '新增賬單失敗' });
  }
};

export const updateBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { basicFee, serviceFee, totalFee, prepaid, debt, status } = req.body;

    const bill = await prisma.bill.update({
      where: { id },
      data: { basicFee, serviceFee, totalFee, prepaid, debt, status }
    });
    broadcastDataUpdate('bills', 'update', bill.id);
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: '更新賬單失敗' });
  }
};

export const deleteBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.bill.delete({ where: { id } });
    broadcastDataUpdate('bills', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除賬單失敗' });
  }
};

export const deductPrepaid = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount } = req.body;

    if (!customerId || amount === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: '客戶不存在' });
      return;
    }

    // Deduct from balance
    const newBalance = Math.max(0, customer.balance - amount);
    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: newBalance }
    });

    res.json({ success: true, newBalance });
  } catch (error) {
    console.error('Deduct prepaid error:', error);
    res.status(500).json({ error: '預繳費劃扣失敗' });
  }
};
