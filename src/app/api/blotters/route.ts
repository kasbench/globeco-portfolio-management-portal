import { NextRequest, NextResponse } from 'next/server';
import { tradeService } from '@/lib/api/tradeService';

export async function GET(req: NextRequest) {
  try {
    const blotters = await tradeService.getBlotters();
    return NextResponse.json(blotters);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch blotters' }, { status: 500 });
  }
} 