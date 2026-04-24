import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  role: string;
}

export function authenticate(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function generateTokens(user: AuthUser) {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}
