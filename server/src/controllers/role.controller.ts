import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: '獲取角色失敗' });
  }
};

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, description, type } = req.body;

    const existing = await prisma.role.findUnique({ where: { code } });
    if (existing) {
      res.status(400).json({ error: '角色編號已存在' });
      return;
    }

    const role = await prisma.role.create({
      data: { code, name, description, type: type || '工作員' }
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: '創建角色失敗' });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, type } = req.body;

    const role = await prisma.role.update({
      where: { id },
      data: { name, description, type }
    });

    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: '更新角色失敗' });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.role.delete({ where: { id } });
    res.json({ message: '刪除角色成功' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: '刪除角色失敗' });
  }
};
