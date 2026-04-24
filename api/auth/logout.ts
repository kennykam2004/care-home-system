import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
  return response;
}
