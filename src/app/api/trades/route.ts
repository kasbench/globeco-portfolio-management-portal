import { NextRequest, NextResponse } from 'next/server';
import { tradeService } from '@/lib/api/tradeService';

// GET /api/trades - List trade orders (with optional filtering, sorting, pagination)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    const trades = await tradeService.getTradeOrders(params);
    return NextResponse.json(trades);
  } catch (error: any) {
    console.error('Trades API route failed:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch trades'
    }, { status: 500 });
  }
}

// POST /api/trades - Create a new trade order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await tradeService.createTradeOrder(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create trade' }, { status: 500 });
  }
} 