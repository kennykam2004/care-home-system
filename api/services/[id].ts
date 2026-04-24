import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'AM01') return NextResponse.json({ error: '只有院長可以編輯服務' }, { status: 403 });

    const { id } = await params;
    const data = await req.json();
    const service = await prisma.service.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        price: data.price,
        stock: data.stock,
        isCommon: data.isCommon
      }
    });
    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'AM01') return NextResponse.json({ error: '只有院長可以刪除服務' }, { status: 403 });

    const { id } = await params;
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
