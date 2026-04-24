import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getServiceRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, date } = req.query;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (date) where.date = new Date(date as string);

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { customer: true, service: true },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '獲取服務記錄失敗' });
  }
};

export const createServiceRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, date, type, serviceId, name, qty, amount, note } = req.body;

    if (!customerId || !date || !type || !serviceId || !name || qty === undefined || amount === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const record = await prisma.$transaction(async (tx) => {
      // 檢查庫存是否足夠
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (service && service.stock !== null && service.stock < qty) {
        throw new Error(`庫存不足：只剩 ${service.stock} 個`);
      }

      const newRecord = await tx.serviceRecord.create({
        data: {
          customerId,
          date: new Date(date),
          type,
          serviceId,
          name,
          qty,
          amount,
          note
        }
      });

      // 同步更新庫存數量
      if (service && service.stock !== null) {
        await tx.service.update({
          where: { id: serviceId },
          data: { stock: service.stock - qty }
        });

        // 寫入庫存變動記錄
        await tx.inventoryRecord.create({
          data: {
            itemId: serviceId,
            date: new Date(date),
            type,
            reason: '客戶服務使用扣除',
            qty: -qty
          }
        });
      }

      return newRecord;
    });

    broadcastDataUpdate('service-records', 'create', record.recordId);
    res.json(record);
  } catch (error) {
    console.error('Create service record error:', error);
    const message = error instanceof Error ? error.message : '新增服務記錄失敗';
    res.status(400).json({ error: message });
  }
};

export const deleteServiceRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const record = await prisma.serviceRecord.findUnique({ where: { recordId: id } });
    if (!record) {
      res.status(404).json({ error: '服務記錄不存在' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 還原庫存
      const service = await tx.service.findUnique({ where: { id: record.serviceId } });
      if (service && service.stock !== null) {
        await tx.service.update({
          where: { id: record.serviceId },
          data: { stock: service.stock + record.qty }
        });

        // 寫入庫存變動記錄（逆轉）
        await tx.inventoryRecord.create({
          data: {
            itemId: record.serviceId,
            date: new Date(),
            type: record.type,
            reason: `刪除服務記錄逆轉: ${record.name}`,
            qty: record.qty
          }
        });
      }

      // 刪除服務記錄
      await tx.serviceRecord.delete({ where: { recordId: id } });
    });

    broadcastDataUpdate('service-records', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    console.error('Delete service record error:', error);
    res.status(500).json({ error: '刪除服務記錄失敗' });
  }
};
