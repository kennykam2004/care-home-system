import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../config/jwt.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const login = async (req: Request, res: Response) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      res.status(400).json({ error: '員工編號和密碼為必填' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: {
        roles: { include: { role: true } },
        creator: true
      }
    });

    if (!user) {
      res.status(401).json({ error: '員工編號或密碼錯誤' });
      return;
    }

    if (user.status === '停用') {
      res.status(401).json({ error: '帳號已停用，請聯繫管理員' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: '員工編號或密碼錯誤' });
      return;
    }

    const payload: TokenPayload = {
      userId: user.id,
      employeeId: user.employeeId,
      name: user.name,
      roles: user.roles.map((ur) => ur.role.name)
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const allPermissions = await prisma.rolePermission.findMany({
      where: { roleId: { in: user.roles.map((ur) => ur.roleId) } }
    });

    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    res.json({
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        status: user.status,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          isDefault: ur.isDefault
        })),
        permissions: allPermissions
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登入失敗' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS });
  res.json({ message: '登出成功' });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: '無 refresh token' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: { include: { role: true } } }
    });

    if (!user || user.status === '停用') {
      res.status(401).json({ error: '無效的憑證' });
      return;
    }

    const payload: TokenPayload = {
      userId: user.id,
      employeeId: user.employeeId,
      name: user.name,
      roles: user.roles.map((ur) => ur.role.name)
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.cookie('refreshToken', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: ' refresh token 無效' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      res.status(404).json({ error: '用戶不存在' });
      return;
    }

    const allPermissions = await prisma.rolePermission.findMany({
      where: { roleId: { in: user.roles.map((ur) => ur.roleId) } }
    });

    res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      postalCode: user.postalCode,
      status: user.status,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        isDefault: ur.isDefault
      })),
      permissions: allPermissions
    });
  } catch (error) {
    res.status(500).json({ error: '獲取用戶資訊失敗' });
  }
};
