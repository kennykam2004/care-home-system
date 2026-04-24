import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const where = customerId ? { customerId } : {};
    const records = await prisma.prepaidRecord.findMany({
      where,
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
    const record = await prisma.prepaidRecord.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        date: new Date(data.date),
        note: data.note
      }
    });

    // 更新客戶餘額
    await prisma.customer.update({
      where: { id: data.customerId },
      data: { balance: { increment: data.amount } }
    });

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
