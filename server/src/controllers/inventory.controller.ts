import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getInventoryRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, startDate, endDate } = req.query;
    const where: any = {};

    if (itemId) where.itemId = itemId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const records = await prisma.inventoryRecord.findMany({
      where,
      include: { service: true },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '獲取庫存記錄失敗' });
  }
};

export const createInventoryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, date, type, reason, qty } = req.body;

    if (!itemId || !date || !type || !reason || qty === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const record = await prisma.inventoryRecord.create({
      data: {
        itemId,
        date: new Date(date),
        type,
        reason,
        qty
      }
    });

    // Update service stock
    const service = await prisma.service.findUnique({ where: { id: itemId } });
    if (service && service.stock !== null) {
      const newStock = type === '入庫' ? service.stock + qty : service.stock - qty;
      await prisma.service.update({
        where: { id: itemId },
        data: { stock: newStock }
      });
    }

    broadcastDataUpdate('inventory', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Create inventory record error:', error);
    res.status(500).json({ error: '新增庫存記錄失敗' });
  }
};

export const deleteInventoryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.inventoryRecord.delete({ where: { id } });
    broadcastDataUpdate('inventory', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除庫存記錄失敗' });
  }
};
