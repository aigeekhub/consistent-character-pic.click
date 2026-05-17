import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/scaffold/logger';

function checkAuth(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  return adminSecret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = logger.getLogs();
  return NextResponse.json({ logs });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.clearLogs();
  return NextResponse.json({ message: 'Logs cleared' });
}
