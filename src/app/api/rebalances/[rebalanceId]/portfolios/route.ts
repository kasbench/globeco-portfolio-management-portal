import { NextRequest, NextResponse } from 'next/server';
import orderGenerationServiceApi from '@/lib/api/orderGenerationService';

export async function GET(
  request: NextRequest,
  { params }: any
) {
  const { rebalanceId } = params;
  try {
    const portfolios = await orderGenerationServiceApi.getRebalancePortfolios(rebalanceId);
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error('Error fetching rebalance portfolios:', error);
    return NextResponse.json({ message: 'Error fetching rebalance portfolios' }, { status: 500 });
  }
}
