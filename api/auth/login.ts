import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '../_lib/prisma';
import { generateTokens } from '../_lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 401 });
    }

    if (user.status !== '啟動') {
      return NextResponse.json({ error: '帳號已被停用' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
    }

    const role = user.roles[0]?.role;
    const userData = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: role?.code || 'AM01',
      roleName: role?.name || '院長'
    };

    const { accessToken, refreshToken } = generateTokens(userData);

    const response = NextResponse.json({
      user: userData,
      accessToken
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '服務器錯誤' }, { status: 500 });
  }
}
