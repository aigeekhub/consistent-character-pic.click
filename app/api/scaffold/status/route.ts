import { NextRequest, NextResponse } from 'next/server';

function checkAuth(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  return adminSecret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0-retrofit',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}
