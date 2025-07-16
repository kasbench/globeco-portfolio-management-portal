import { NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';
import { RebalancePositionWithSubmission } from '@/types/rebalance';

export async function POST(request: Request) {
  try {
    const { positions, portfolioId } = await request.json();

    if (!positions || !Array.isArray(positions) || !portfolioId) {
      console.error('[API] /api/rebalances/submit-positions: Invalid request body', { positions, portfolioId });
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('[API] /api/rebalances/submit-positions: Submitting positions', {
      portfolioId,
      positionsCount: positions.length,
      positions: positions.map((p: any) => ({
        security_id: p.security_id,
        transaction_type: p.transaction_type,
        trade_quantity: p.trade_quantity
      }))
    });

    const result = await orderServiceApi.submitRebalancePositions(
      positions as RebalancePositionWithSubmission[],
      portfolioId
    );

    console.log('[API] /api/rebalances/submit-positions: Order Service API response', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/rebalances/submit-positions: Failed to submit rebalance positions:', error);
    return NextResponse.json(
      { error: 'Failed to submit rebalance positions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
