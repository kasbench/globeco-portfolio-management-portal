import { NextRequest, NextResponse } from 'next/server';
import { tradeService } from '@/lib/api/tradeService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/trades/[id] - Get trade order by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const trade = await tradeService.getTradeOrder(Number(params.id));
    if (!trade) {
      return NextResponse.json({ error: 'Trade order not found' }, { status: 404 });
    }
    return NextResponse.json(trade);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch trade order' }, { status: 500 });
  }
}, 'get_trade_by_id');

// PUT /api/trades/[id] - Update trade order
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const body = await req.json();
    const updated = await tradeService.updateTradeOrder(Number(params.id), body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update trade order' }, { status: 500 });
  }
}

// DELETE /api/trades/[id] - Not implemented (return 501)
export async function DELETE(req: NextRequest, { params }: any) {
  return NextResponse.json({ error: 'Delete trade order not implemented' }, { status: 501 });
} 