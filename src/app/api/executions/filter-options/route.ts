import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/executions/filter-options - Get available filter options
export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const data = await executionService.getFilterOptions();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch filter options' }, { status: 500 });
  }
}, 'get_execution_filter_options'); 