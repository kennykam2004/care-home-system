import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';
import { createAuditLog } from '../services/audit.service.js';

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

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'bills',
      action: 'create',
      recordId: bill.id,
      recordType: 'Bill',
      changes: { customerId, month, totalFee },
      ipAddress: req.ip,
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

    const originalBill = await prisma.bill.findUnique({ where: { id } });
    if (!originalBill) {
      res.status(404).json({ error: '賬單不存在' });
      return;
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: { basicFee, serviceFee, totalFee, prepaid, debt, status }
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'bills',
      action: 'update',
      recordId: bill.id,
      recordType: 'Bill',
      changes: { before: originalBill, after: bill },
      ipAddress: req.ip,
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

    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      res.status(404).json({ error: '賬單不存在' });
      return;
    }

    await prisma.bill.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'bills',
      action: 'delete',
      recordId: id,
      recordType: 'Bill',
      changes: bill,
      ipAddress: req.ip,
    });

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

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      res.status(400).json({ error: '扣除金額必須大於零' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new Error('客戶不存在');
      }

      if (customer.balance < parsedAmount) {
        throw new Error(`預繳費餘額不足：可用餘額為 ${customer.balance}`);
      }

      const originalBalance = customer.balance;
      const newBalance = customer.balance - parsedAmount;
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance }
      });

      return { customerId, amount: parsedAmount, newBalance, originalBalance };
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'bills',
      action: 'update',
      recordId: result.customerId,
      recordType: 'Customer',
      changes: {
        action: 'deductPrepaid',
        amount: result.amount,
        before: result.originalBalance,
        after: result.newBalance
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, newBalance: result.newBalance });
  } catch (error) {
    console.error('Deduct prepaid error:', error);
    const message = error instanceof Error ? error.message : '預繳費劃扣失敗';
    res.status(400).json({ error: message });
  }
};
