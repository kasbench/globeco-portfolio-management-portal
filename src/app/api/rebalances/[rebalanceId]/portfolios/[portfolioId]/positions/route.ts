import { NextRequest, NextResponse } from 'next/server';
import { orderGenerationServiceApi } from '@/lib/api/orderGenerationService';

export async function GET(req: NextRequest, { params }: any) {
  const { rebalanceId, portfolioId } = params;
  try {
    // console.log('[API] GET /api/rebalances/[rebalanceId]/portfolios/[portfolioId]/positions', { rebalanceId, portfolioId });
    const positions = await orderGenerationServiceApi.getRebalancePortfolioPositions(rebalanceId, portfolioId);
    return NextResponse.json(positions);
  } catch (error: any) {
    console.error('[API] Error fetching portfolio positions', { rebalanceId, portfolioId, error });
    return NextResponse.json({ error: error.message || 'Failed to fetch rebalance portfolio positions' }, { status: 500 });
  }
} 