import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';

// POST /api/models/[id]/rebalance - Trigger rebalance for a model
export const POST = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const result = await orderGenerationApi.rebalanceModel(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to rebalance model' }, { status: 500 });
  }
}, 'rebalance_model'); 