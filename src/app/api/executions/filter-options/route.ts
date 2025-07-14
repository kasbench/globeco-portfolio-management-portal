import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';

// GET /api/executions/filter-options - Get available filter options
export async function GET(req: NextRequest) {
  try {
    const data = await executionService.getFilterOptions();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch filter options' }, { status: 500 });
  }
} 