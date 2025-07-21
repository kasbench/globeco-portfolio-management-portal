import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/orders/[id] - Get order by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const order = await orderServiceApi.getOrderById(Number(id));
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch order' }, { status: 500 });
  }
}, 'get_order_by_id');

// PUT /api/orders/[id] - Update order
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await orderServiceApi.updateOrder(Number(id), body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Delete order
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 });
    }
    await orderServiceApi.deleteOrder(Number(id), Number(version));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 });
  }
} 