import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';

// POST /api/models/[id]/rebalance - Trigger rebalance for a model
export const POST = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const result = await orderGenerationApi.rebalanceModel(params.id);
    
    // Extract rebalance_ids from the Order Generation Service response
    // The result is an array of RebalanceDTO objects, each with a rebalance_id field
    const rebalanceIds = Array.isArray(result) 
      ? result.map((item: any) => item.rebalance_id).filter(Boolean)
      : [];
    
    // Return the enhanced response format
    return NextResponse.json({
      success: true,
      message: "Rebalance triggered successfully",
      rebalance_ids: rebalanceIds
    });
  } catch (error: any) {
    // Return the original response format for backward compatibility on error
    return NextResponse.json({ error: error.message || 'Failed to rebalance model' }, { status: 500 });
  }
}, 'rebalance_model'); 