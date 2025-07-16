import { NextRequest, NextResponse } from 'next/server';
import orderGenerationServiceApi from '@/lib/api/orderGenerationService';

export async function GET(req: NextRequest, { params }: any) {
  const { rebalanceId, portfolioId } = params;
  try {
    // TODO: Replace with the actual service method to fetch rebalance portfolio positions
    // This is a placeholder. You may need to update the method name and arguments.
    const positions = await orderGenerationServiceApi.getRebalancePortfolioPositions(rebalanceId, portfolioId);
    return NextResponse.json(positions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch rebalance portfolio positions' }, { status: 500 });
  }
} 