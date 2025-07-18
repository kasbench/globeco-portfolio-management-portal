import { NextRequest, NextResponse } from 'next/server';
import tradeService from '@/lib/api/tradeService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Submit batch of trade orders
    const result = await tradeService.submitTradeOrdersBatch(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Batch trade order submit failed:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to submit trade orders' 
    }, { status: 500 });
  }
}