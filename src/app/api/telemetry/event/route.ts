import { NextRequest, NextResponse } from 'next/server';
import { customMetrics } from '@/lib/metrics';

export async function POST(req: NextRequest) {
  try {
    const { event, properties, timestamp, page } = await req.json();
    
    // Record custom event
    customMetrics.apiRequestCounter.add(1, {
      event_type: 'user_interaction',
      event_name: event,
      page: page || 'unknown',
      ...properties,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't return error details for telemetry endpoints
    return NextResponse.json({ success: false }, { status: 200 });
  }
}