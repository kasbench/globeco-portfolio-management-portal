import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/orders - List orders
export const GET = withTelemetry(async (req: NextRequest) => {
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
}, 'list_orders');

// POST /api/orders - Create order
export const POST = withTelemetry(async (req: NextRequest) => {
  try {
    const body = await req.json();
    // You may want to validate the body here
    const created = await orderServiceApi.submitOrderBatch([body]);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}, 'create_order'); 