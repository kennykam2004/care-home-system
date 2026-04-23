import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getServices = async (req: AuthRequest, res: Response) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: '獲取服務列表失敗' });
  }
};

export const getService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      res.status(404).json({ error: '服務不存在' });
      return;
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: '獲取服務失敗' });
  }
};

export const createService = async (req: AuthRequest, res: Response) => {
  try {
    const { id, type, name, price, stock, isCommon } = req.body;

    if (!id || !type || !name || price === undefined) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const service = await prisma.service.create({
      data: { id, type, name, price, stock, isCommon: isCommon || false }
    });
    broadcastDataUpdate('services', 'create', service.id);
    res.json(service);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: '新增服務失敗' });
  }
};

export const updateService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { type, name, price, stock, isCommon } = req.body;

    const service = await prisma.service.update({
      where: { id },
      data: { type, name, price, stock, isCommon }
    });
    broadcastDataUpdate('services', 'update', service.id);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: '更新服務失敗' });
  }
};

export const deleteService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.service.delete({ where: { id } });
    broadcastDataUpdate('services', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除服務失敗' });
  }
};
