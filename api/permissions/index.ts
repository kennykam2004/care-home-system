import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';

export async function GET() {
  try {
    const permissions = await prisma.rolePermission.findMany({ include: { role: true } });
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
