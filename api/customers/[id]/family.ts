import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../_lib/prisma';
import { authenticate } from '../../_lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const family = await prisma.family.findMany({ where: { customerId: id } });
    return NextResponse.json(family);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();
    const family = await prisma.family.create({
      data: {
        customerId: id,
        name: data.name,
        phone: data.phone,
        isMain: data.isMain || false
      }
    });
    return NextResponse.json(family);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');
    if (!familyId) return NextResponse.json({ error: 'Missing familyId' }, { status: 400 });

    await prisma.family.delete({ where: { id: familyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
