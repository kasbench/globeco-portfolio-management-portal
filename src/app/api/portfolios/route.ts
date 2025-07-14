import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';

// GET /api/portfolios - List all portfolios
export async function GET(req: NextRequest) {
  try {
    const portfolios = await portfolioApi.getPortfolios();
    return NextResponse.json(portfolios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch portfolios' }, { status: 500 });
  }
}

// POST /api/portfolios - Create a new portfolio
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await portfolioApi.createPortfolio(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create portfolio' }, { status: 500 });
  }
} 