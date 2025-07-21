import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/portfolios/[id] - Get portfolio by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const portfolio = await portfolioApi.getPortfolio(params.id);
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    return NextResponse.json(portfolio);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch portfolio' }, { status: 500 });
  }
}, 'get_portfolio_by_id');

// PUT /api/portfolios/[id] - Update portfolio
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const body = await req.json();
    const updated = await portfolioApi.updatePortfolio(params.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update portfolio' }, { status: 500 });
  }
}

// DELETE /api/portfolios/[id] - Delete portfolio
export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 });
    }
    await portfolioApi.deletePortfolio(params.id, Number(version));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete portfolio' }, { status: 500 });
  }
} 