import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';

export async function POST(req: NextRequest) {
  try {
    const { error, context, timestamp, page } = await req.json();
    
    // Record error with server-side telemetry
    telemetryUtils.recordError(
      'client_error',
      error.message || 'Unknown client error',
      context || page || 'unknown'
    );
    
    return NextResponse.json({ success: true });
  } catch (err) {
    // Don't return error details for telemetry endpoints
    return NextResponse.json({ success: false }, { status: 200 });
  }
}