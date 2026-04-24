import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
      include: { inventoryRecords: { orderBy: { date: 'desc' }, take: 10 } }
    });

    const result = services.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      price: s.price,
      stock: s.stock,
      isCommon: s.isCommon,
      recentRecords: s.inventoryRecords
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const record = await prisma.inventoryRecord.create({
      data: {
        id: crypto.randomUUID(),
        itemId: data.itemId,
        date: new Date(data.date),
        type: data.type,
        reason: data.reason,
        qty: data.qty
      }
    });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
