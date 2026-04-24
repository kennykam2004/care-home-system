import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const where = customerId ? { customerId } : {};
    const publishes = await prisma.billPublish.findMany({
      where,
      orderBy: { publishedAt: 'desc' }
    });
    return NextResponse.json(publishes);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const publish = await prisma.billPublish.create({
      data: {
        customerId: data.customerId,
        month: data.month,
        totalFee: data.totalFee,
        publishedBy: user.id,
        note: data.note
      }
    });
    return NextResponse.json(publish);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
