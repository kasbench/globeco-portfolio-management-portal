import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/api/securityService';
import { withTelemetry } from '@/lib/withTelemetry';

export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const securities = await securityService.getAllSecurities();
    return NextResponse.json(securities);
  } catch (error: any) {
    // Pass through original status codes and response objects
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to fetch securities';
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}, 'get_all_securities');