import { NextRequest, NextResponse } from 'next/server';
import { orderGenerationServiceApi } from '@/lib/api/orderGenerationService';

export async function DELETE(request: NextRequest, { params }: any) {
  const { rebalanceId } = params;
  const version = request.nextUrl.searchParams.get('version');
  console.log('[API] DELETE /api/rebalances/[rebalanceId] called', { rebalanceId, version });
  if (!rebalanceId || !version) {
    console.warn('[API] DELETE /api/rebalances/[rebalanceId]: Missing rebalanceId or version', { rebalanceId, version });
    return NextResponse.json({ success: false, message: 'Missing rebalanceId or version' }, { status: 400 });
  }
  try {
    await orderGenerationServiceApi.deleteRebalance(rebalanceId, Number(version));
    console.log(`[API] DELETE /api/rebalances/[rebalanceId]: Successfully deleted`, { rebalanceId, version });
    return NextResponse.json({ success: true, message: `Rebalance ${rebalanceId} deleted` });
  } catch (error) {
    console.error(`[API] DELETE /api/rebalances/[rebalanceId]: Failed to delete`, { rebalanceId, version, error });
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 