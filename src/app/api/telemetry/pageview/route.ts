import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';

export async function POST(req: NextRequest) {
  try {
    const { page, timestamp } = await req.json();
    
    // Record page view with server-side telemetry
    telemetryUtils.recordPageView(page);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't return error details for telemetry endpoints
    return NextResponse.json({ success: false }, { status: 200 });
  }
}