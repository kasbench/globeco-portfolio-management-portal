import { NextRequest, NextResponse } from 'next/server';
import tradeService from '@/lib/api/tradeService';

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 });
    }
    await tradeService.deleteTradeOrder(params.id, Number(version));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete trade order' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const body = await req.json();
    const updated = await tradeService.updateTradeOrder(params.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update trade order' }, { status: 500 });
  }
} 