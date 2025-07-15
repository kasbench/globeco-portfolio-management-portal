import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';

// POST /api/models/[id]/rebalance - Trigger rebalance for a model
export async function POST(req: NextRequest, { params }: any) {
  try {
    const result = await orderGenerationApi.rebalanceModel(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to rebalance model' }, { status: 500 });
  }
} 