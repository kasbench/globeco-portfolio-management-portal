import { NextRequest, NextResponse } from 'next/server';
import { allocationService } from '@/lib/api/allocationService';
import { withTelemetry } from '@/lib/withTelemetry';

export const POST = withTelemetry(async (req: NextRequest) => {
  try {
    const result = await allocationService.sendExecutions();
    return NextResponse.json(result);
  } catch (error: any) {
    // Pass through original status codes and response objects
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to send executions';
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}, 'send_executions');