import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/scaffold/feature-flags';
import { settings } from '@/lib/scaffold/settings';

export async function GET() {
  return NextResponse.json({
    flags: flags,
    settings: settings.filter(s => s.category !== 'SENSITIVE'),
  });
}
