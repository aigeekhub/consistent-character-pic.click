import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/scaffold/logger';

export async function POST(req: NextRequest) {
  try {
    const { type, module, message, severity, metadata, route } = await req.json();
    
    logger.log(
      type || 'CLIENT_EVENT',
      module || 'CLIENT',
      message || 'No message provided',
      severity || 'info',
      metadata,
      route
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record log' }, { status: 500 });
  }
}
