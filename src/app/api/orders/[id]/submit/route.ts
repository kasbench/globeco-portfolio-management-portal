import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';

// POST /api/orders/[id]/submit - Submit individual order
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const result = await orderServiceApi.submitOrder(orderId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to submit order:', error);
    
    // Handle specific error cases
    if (error.status === 404) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (error.status === 400) {
      return NextResponse.json({ error: error.message || 'Invalid order data' }, { status: 400 });
    }
    
    if (error.status === 409) {
      return NextResponse.json({ error: 'Order conflict - order may have been modified' }, { status: 409 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to submit order' 
    }, { 
      status: error.status || 500 
    });
  }
}