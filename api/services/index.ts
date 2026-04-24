import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'AM01') return NextResponse.json({ error: '只有院長可以新增服務' }, { status: 403 });

    const data = await req.json();
    const service = await prisma.service.create({
      data: {
        id: data.id || crypto.randomUUID(),
        type: data.type,
        name: data.name,
        price: data.price,
        stock: data.stock,
        isCommon: data.isCommon || false
      }
    });
    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
