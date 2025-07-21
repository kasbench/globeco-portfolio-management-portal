import { NextRequest, NextResponse } from 'next/server';
import { tradeService } from '@/lib/api/tradeService';
import { withTelemetry } from '@/lib/withTelemetry';

export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const destinations = await tradeService.getDestinations();
    return NextResponse.json(destinations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch destinations' }, { status: 500 });
  }
}, 'list_destinations'); 