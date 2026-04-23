import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// 可控制的模組列表
export const MODULES = [
  { key: 'customers', name: '客戶信息管理' },
  { key: 'inventory', name: '庫存概覽' },
  { key: 'services', name: '服務管理' },
  { key: 'bills', name: '賬單管理' },
  { key: 'users', name: '用戶管理' },
  { key: 'roles', name: '角色管理' },
];

export const getModulePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.rolePermission.findMany();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: '獲取權限失敗' });
  }
};

export const getRolePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId } = req.params as { roleId: string };
    const permissions = await prisma.rolePermission.findMany({
      where: { roleId }
    });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: '獲取角色權限失敗' });
  }
};

export const updateRolePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId } = req.params as { roleId: string };
    const { permissions } = req.body; // [{ module: 'customers', canView: true, canEdit: false }, ...]

    // 刪除現有權限
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    });

    // 創建新權限
    if (permissions && permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p: { module: string; canView: boolean; canEdit: boolean }) => ({
          roleId,
          module: p.module,
          canView: p.canView,
          canEdit: p.canEdit,
        }))
      });
    }

    res.json({ message: '權限更新成功' });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: '更新權限失敗' });
  }
};
