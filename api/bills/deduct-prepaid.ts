import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { customerId, amount } = await req.json();
    if (!customerId || !amount) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: amount } }
    });

    await prisma.prepaidRecord.create({
      data: {
        customerId,
        amount: -amount,
        date: new Date(),
        note: '扣減預繳費'
      }
    });

    return NextResponse.json({ success: true, balance: customer.balance });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
