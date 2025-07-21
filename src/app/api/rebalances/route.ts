import { NextResponse } from 'next/server';
import { orderGenerationServiceApi } from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';

export const GET = withTelemetry(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sort_by') || '-rebalance_date';

    const rebalances = await orderGenerationServiceApi.listRebalances({
      offset,
      limit,
      sort_by: sortBy,
    });

    return NextResponse.json(rebalances);
  } catch (error) {
    console.error('Failed to fetch rebalances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rebalances', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}, 'list_rebalances');
