import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';

// GET /api/executions/summary - Get execution summary statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      filters[key] = value;
    });
    const data = await executionService.getExecutionSummary(filters);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch execution summary' }, { status: 500 });
  }
} 