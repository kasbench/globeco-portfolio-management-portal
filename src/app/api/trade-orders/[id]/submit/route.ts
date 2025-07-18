import { NextRequest, NextResponse } from 'next/server';
import tradeService from '@/lib/api/tradeService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Submit individual trade order
    const result = await tradeService.submitTradeOrder(Number(id), body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Trade order submit failed:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to submit trade order' 
    }, { status: 500 });
  }
}