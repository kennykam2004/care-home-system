import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const month = searchParams.get('month');

    if (!customerId || !month) {
      return NextResponse.json({ error: '需要 customerId 和 month' }, { status: 400 });
    }

    const [year, m] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ error: '客戶不存在' }, { status: 404 });

    const serviceRecords = await prisma.serviceRecord.findMany({
      where: { customerId, date: { gte: startDate, lte: endDate } }
    });

    const serviceFee = serviceRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalFee = customer.basicFee + serviceFee;
    const debt = totalFee - customer.balance;
    const status = debt <= 0 ? '已繳費' : '待繳費';

    return NextResponse.json({
      customerId,
      month,
      basicFee: customer.basicFee,
      serviceFee,
      totalFee,
      prepaid: customer.balance,
      debt,
      status
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
