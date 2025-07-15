import { NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';
import { RebalancePositionWithSubmission } from '@/types/rebalance';

export async function POST(request: Request) {
  try {
    const { positions, portfolioId } = await request.json();

    if (!positions || !Array.isArray(positions) || !portfolioId) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await orderServiceApi.submitRebalancePositions(
      positions as RebalancePositionWithSubmission[],
      portfolioId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to submit rebalance positions:', error);
    return NextResponse.json(
      { error: 'Failed to submit rebalance positions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
