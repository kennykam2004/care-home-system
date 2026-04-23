import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getBillPublishes = async (req: AuthRequest, res: Response) => {
  try {
    const { month, customerId } = req.query;
    const where: any = {};
    if (month) where.month = month;
    if (customerId) where.customerId = customerId;

    const publishes = await prisma.billPublish.findMany({
      where,
      include: { customer: true },
      orderBy: { publishedAt: 'desc' }
    });
    res.json(publishes);
  } catch (error) {
    res.status(500).json({ error: '獲取賬單發佈記錄失敗' });
  }
};

export const publishBill = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, month, totalFee, note } = req.body;
    const userId = req.user?.userId;

    if (!customerId || !month || totalFee === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: '客戶不存在' });
      return;
    }

    const existing = await prisma.billPublish.findUnique({
      where: { customerId_month: { customerId, month } }
    });

    if (existing) {
      // Update existing publish
      const updated = await prisma.billPublish.update({
        where: { customerId_month: { customerId, month } },
        data: { totalFee, note, publishedAt: new Date() }
      });
      broadcastDataUpdate('bill-publishes', 'update', updated.id);
      return res.json(updated);
    }

    const publish = await prisma.billPublish.create({
      data: {
        customerId,
        month,
        totalFee,
        note,
        publishedBy: userId
      }
    });

    broadcastDataUpdate('bill-publishes', 'create', publish.id);
    res.json(publish);
  } catch (error) {
    console.error('Publish bill error:', error);
    res.status(500).json({ error: '發佈賬單失敗' });
  }
};

export const deleteBillPublish = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.billPublish.delete({ where: { id } });
    broadcastDataUpdate('bill-publishes', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除賬單發佈失敗' });
  }
};
