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

    const record = await prisma.serviceRecord.create({
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
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (service && service.stock !== null) {
      const newStock = service.stock - qty;
      await prisma.service.update({
        where: { id: serviceId },
        data: { stock: newStock }
      });

      // 寫入庫存變動記錄
      await prisma.inventoryRecord.create({
        data: {
          itemId: serviceId,
          date: new Date(date),
          type,
          reason: '客戶服務使用扣除',
          qty: -qty
        }
      });
    }

    broadcastDataUpdate('service-records', 'create', record.recordId);
    res.json(record);
  } catch (error) {
    console.error('Create service record error:', error);
    res.status(500).json({ error: '新增服務記錄失敗' });
  }
};

export const deleteServiceRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.serviceRecord.delete({ where: { recordId: id } });
    broadcastDataUpdate('service-records', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除服務記錄失敗' });
  }
};
