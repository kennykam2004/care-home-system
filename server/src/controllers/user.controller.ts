import { Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '10', search, status } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { employeeId: { contains: search as string } }
      ];
    }
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data: users.map((u) => ({
        id: u.id,
        employeeId: u.employeeId,
        name: u.name,
        status: u.status,
        phone: u.phone,
        email: u.email,
        roles: u.roles.map((ur) => ur.role.name),
        createdAt: u.createdAt
      })),
      pagination: { page: Number(page), pageSize: Number(pageSize), total }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '獲取用戶失敗' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      res.status(404).json({ error: '用戶不存在' });
      return;
    }

    res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      status: user.status,
      phone: user.phone,
      email: user.email,
      address: user.address,
      postalCode: user.postalCode,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        isDefault: ur.isDefault
      })),
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: '獲取用戶失敗' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, name, password, phone, email, address, postalCode, roleIds, defaultRoleId } = req.body;

    const existing = await prisma.user.findUnique({ where: { employeeId } });
    if (existing) {
      res.status(400).json({ error: '員工編號已存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, config.saltRounds);

    const user = await prisma.user.create({
      data: {
        employeeId,
        name,
        password: hashedPassword,
        phone,
        email,
        address,
        postalCode,
        createdBy: req.user!.userId,
        roles: {
          create: roleIds.map((roleId: string, index: number) => ({
            roleId,
            isDefault: roleId === defaultRoleId
          }))
        }
      },
      include: { roles: { include: { role: true } } }
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'users',
      action: 'create',
      recordId: user.id,
      recordType: 'User',
      changes: { employeeId, name },
      ipAddress: req.ip,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('users:created', {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        status: user.status,
        roles: user.roles.map((ur) => ur.role.name)
      });
    }

    res.status(201).json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      status: user.status,
      roles: user.roles.map((ur) => ur.role.name)
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '創建用戶失敗' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, phone, email, address, postalCode, status, roleIds, defaultRoleId } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: '用戶不存在' });
      return;
    }

    await prisma.userRole.deleteMany({ where: { userId: id } });

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        postalCode,
        status,
        roles: {
          create: roleIds.map((roleId: string, index: number) => ({
            roleId,
            isDefault: roleId === defaultRoleId
          }))
        }
      },
      include: { roles: { include: { role: true } } }
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'users',
      action: 'update',
      recordId: user.id,
      recordType: 'User',
      changes: { before: existing, after: { name, status } },
      ipAddress: req.ip,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('users:updated', {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        status: user.status,
        roles: user.roles.map((ur) => ur.role.name)
      });
    }

    res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      status: user.status,
      roles: user.roles.map((ur) => ur.role.name)
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用戶失敗' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: '用戶不存在' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'users',
      action: 'delete',
      recordId: id,
      recordType: 'User',
      changes: existing,
      ipAddress: req.ip,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('users:deleted', { id });
    }

    res.json({ message: '刪除用戶成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { newPassword } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: '用戶不存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, config.saltRounds);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Audit log
    await createAuditLog({
      userId: req.user?.userId || '',
      userName: req.user?.name || 'System',
      module: 'users',
      action: 'update',
      recordId: id,
      recordType: 'User',
      changes: { action: 'resetPassword', targetUser: existing.employeeId },
      ipAddress: req.ip,
    });

    res.json({ message: '密碼重置成功' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: '重置密碼失敗' });
  }
};

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
