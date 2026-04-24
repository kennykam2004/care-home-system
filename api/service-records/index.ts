import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (month) {
      const [year, m] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(m), 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { customer: true, service: true },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();

    const record = await prisma.serviceRecord.create({
      data: {
        recordId: crypto.randomUUID(),
        customerId: data.customerId,
        date: new Date(data.date),
        type: data.type,
        serviceId: data.serviceId,
        name: data.name,
        qty: data.qty,
        amount: data.amount,
        note: data.note
      }
    });

    // 自動扣庫存
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (service && service.stock !== null) {
      await prisma.service.update({
        where: { id: data.serviceId },
        data: { stock: { decrement: data.qty } }
      });
      await prisma.inventoryRecord.create({
        data: {
          itemId: data.serviceId,
          date: new Date(),
          type: '支出',
          reason: `服務扣減: ${data.name}`,
          qty: data.qty
        }
      });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Service record error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
