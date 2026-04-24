import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { verifyRefreshToken, generateTokens } from '../_lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { roles: { include: { role: true } } }
    });

    if (!user || user.status !== '啟動') {
      return NextResponse.json({ error: 'User not valid' }, { status: 401 });
    }

    const role = user.roles[0]?.role;
    const userData = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: role?.code || 'AM01',
      roleName: role?.name || '院長'
    };

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userData);

    const response = NextResponse.json({ accessToken });
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
