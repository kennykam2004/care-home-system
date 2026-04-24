import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Customers error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'AM01') {
      return NextResponse.json({ error: '只有院長可以新增客戶' }, { status: 403 });
    }

    const data = await req.json();
    const customer = await prisma.customer.create({
      data: {
        id: data.id || crypto.randomUUID(),
        careId: data.careId,
        name: data.name,
        gender: data.gender,
        idCard: data.idCard,
        birth: new Date(data.birth),
        phone: data.phone,
        status: data.status || '在院',
        bed: data.bed,
        balance: data.balance || 0,
        basicFee: data.basicFee || 0,
        subsidy: data.subsidy || 0,
        deposit: data.deposit || 0,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        note: data.note
      }
    });
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
