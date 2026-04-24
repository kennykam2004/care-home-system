import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        careId: data.careId,
        name: data.name,
        gender: data.gender,
        idCard: data.idCard,
        birth: data.birth ? new Date(data.birth) : undefined,
        phone: data.phone,
        status: data.status,
        bed: data.bed,
        balance: data.balance,
        basicFee: data.basicFee,
        subsidy: data.subsidy,
        deposit: data.deposit,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
        note: data.note
      }
    });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'AM01') return NextResponse.json({ error: '只有院長可以刪除' }, { status: 403 });

    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
