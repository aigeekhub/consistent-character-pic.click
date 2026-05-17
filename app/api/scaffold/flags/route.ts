import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags, updateFeatureFlag } from '@/lib/scaffold/feature-flags';

function checkAuth(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  return adminSecret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ flags: getFeatureFlags() });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key, enabled } = await req.json();
  updateFeatureFlag(key, enabled);
  
  return NextResponse.json({ message: 'Flag updated', flags: getFeatureFlags() });
}
