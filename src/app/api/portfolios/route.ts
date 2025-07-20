import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/portfolios - List all portfolios
export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const portfolios = await portfolioApi.getPortfolios();
    return NextResponse.json(portfolios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch portfolios' }, { status: 500 });
  }
}, 'get_portfolios');

// POST /api/portfolios - Create a new portfolio
export const POST = withTelemetry(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const created = await portfolioApi.createPortfolio(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create portfolio' }, { status: 500 });
  }
}, 'create_portfolio'); 