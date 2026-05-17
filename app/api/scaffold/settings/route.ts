import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, updateAppSetting } from '@/lib/scaffold/settings';

function checkAuth(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  return adminSecret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ settings: getAppSettings() });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key, value } = await req.json();
  updateAppSetting(key, value);
  
  return NextResponse.json({ message: 'Setting updated', settings: getAppSettings() });
}
