import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';

// GET /api/orders - List orders
export async function GET(req: NextRequest) {
  try {
    // Parse query params if needed (pagination, filters, etc.)
    const { searchParams } = new URL(req.url);
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const orders = await orderServiceApi.listOrders(params);
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // You may want to validate the body here
    const created = await orderServiceApi.submitOrderBatch([body]);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
} 