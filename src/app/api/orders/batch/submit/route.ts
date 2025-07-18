import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';

// POST /api/orders/batch/submit - Submit multiple orders in batch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.orderIds || !Array.isArray(body.orderIds)) {
      return NextResponse.json({ 
        error: 'Invalid request body. Expected { orderIds: number[] }' 
      }, { status: 400 });
    }

    if (body.orderIds.length === 0) {
      return NextResponse.json({ 
        error: 'Cannot submit empty order batch' 
      }, { status: 400 });
    }

    if (body.orderIds.length > 100) {
      return NextResponse.json({ 
        error: `Batch size ${body.orderIds.length} exceeds maximum allowed 100` 
      }, { status: 400 });
    }

    // Validate all order IDs are numbers
    const invalidIds = body.orderIds.filter((id: any) => !Number.isInteger(id) || id <= 0);
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: `Invalid order IDs: ${invalidIds.join(', ')}` 
      }, { status: 400 });
    }

    const result = await orderServiceApi.submitOrdersBatch(body.orderIds);
    
    // Handle partial success (HTTP 207 Multi-Status)
    if (result.status === 'PARTIAL') {
      return NextResponse.json(result, { status: 207 });
    }
    
    // Handle complete failure
    if (result.status === 'FAILURE') {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to submit order batch:', error);
    
    // Handle specific error cases
    if (error.status === 400) {
      return NextResponse.json({ error: error.message || 'Invalid batch data' }, { status: 400 });
    }
    
    if (error.status === 413) {
      return NextResponse.json({ error: 'Batch too large' }, { status: 413 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to submit order batch' 
    }, { 
      status: error.status || 500 
    });
  }
}