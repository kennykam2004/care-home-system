import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } }
    });

    if (!dbUser || dbUser.status !== '啟動') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = dbUser.roles[0]?.role;
    return NextResponse.json({
      id: dbUser.id,
      employeeId: dbUser.employeeId,
      name: dbUser.name,
      role: role?.code || 'AM01',
      roleName: role?.name || '院長'
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
