import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../_lib/prisma';

export async function GET() {
  try {
    const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
