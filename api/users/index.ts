import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users.map(u => ({
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      phone: u.phone,
      status: u.status,
      createdAt: u.createdAt,
      role: u.roles[0]?.role?.code,
      roleName: u.roles[0]?.role?.name
    })));
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'AM01') return NextResponse.json({ error: '只有院長可以新增用戶' }, { status: 403 });

    const data = await req.json();
    const hashedPassword = await bcrypt.hash(data.password || 'director123', 12);

    const newUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        employeeId: data.employeeId,
        name: data.name,
        password: hashedPassword,
        phone: data.phone,
        status: data.status || '啟動',
        createdBy: user.id
      }
    });

    // 找到默認角色
    const defaultRole = await prisma.role.findFirst({ where: { code: data.role || 'AM01' } });
    if (defaultRole) {
      await prisma.userRole.create({
        data: { userId: newUser.id, roleId: defaultRole.id, isDefault: true }
      });
    }

    return NextResponse.json({ id: newUser.id, employeeId: newUser.employeeId, name: newUser.name });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
