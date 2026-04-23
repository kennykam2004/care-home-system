import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { verifyAccessToken, TokenPayload } from '../config/jwt.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: '未登入' });
      return;
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: { include: { role: true } } }
    });

    if (!user || user.status === '停用') {
      res.status(401).json({ error: '無效的憑證或用戶已停用' });
      return;
    }

    req.user = {
      userId: user.id,
      employeeId: user.employeeId,
      name: user.name,
      roles: user.roles.map((ur) => ur.role.name)
    };

    next();
  } catch (error) {
    res.status(401).json({ error: '憑證已過期' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({ error: '權限不足' });
      return;
    }

    next();
  };
};
