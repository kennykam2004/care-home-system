import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';
import { createAuditLog } from '../services/audit.service.js';

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

    const record = await prisma.$transaction(async (tx) => {
      // Update service stock
      const service = await tx.service.findUnique({ where: { id: itemId } });
      if (service && service.stock !== null) {
        if (type === '出庫' && service.stock < qty) {
          throw new Error(`庫存不足：只剩 ${service.stock} 個`);
        }
        const newStock = type === '入庫' ? service.stock + qty : service.stock - qty;
        await tx.service.update({
          where: { id: itemId },
          data: { stock: newStock }
        });
      }

      const newRecord = await tx.inventoryRecord.create({
        data: {
          itemId,
          date: new Date(date),
          type,
          reason,
          qty
        }
      });

      return newRecord;
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'inventory',
      action: 'create',
      recordId: record.id,
      recordType: 'InventoryRecord',
      changes: { itemId, type, reason, qty },
      ipAddress: req.ip,
    });

    broadcastDataUpdate('inventory', 'create', record.id);
    res.json(record);
  } catch (error) {
    console.error('Create inventory record error:', error);
    const message = error instanceof Error ? error.message : '新增庫存記錄失敗';
    res.status(400).json({ error: message });
  }
};

export const deleteInventoryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const record = await prisma.inventoryRecord.findUnique({ where: { id } });
    if (!record) {
      res.status(404).json({ error: '庫存記錄不存在' });
      return;
    }

    await prisma.inventoryRecord.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'inventory',
      action: 'delete',
      recordId: id,
      recordType: 'InventoryRecord',
      changes: record,
      ipAddress: req.ip,
    });

    broadcastDataUpdate('inventory', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除庫存記錄失敗' });
  }
};
