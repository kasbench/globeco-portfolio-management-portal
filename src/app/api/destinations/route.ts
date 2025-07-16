import { NextRequest, NextResponse } from 'next/server';
import { tradeService } from '@/lib/api/tradeService';

export async function GET(req: NextRequest) {
  try {
    const destinations = await tradeService.getDestinations();
    return NextResponse.json(destinations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch destinations' }, { status: 500 });
  }
} 