import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/executions - List executions (with query params)
export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    // Build query params object
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    // Use the enhanced executions endpoint for consistency with the hook
    const data = await executionService.getExecutionsEnhanced(params);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch executions' }, { status: 500 });
  }
}, 'list_executions');

// POST /api/executions - Create a new execution
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await executionService.createExecution(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create execution' }, { status: 500 });
  }
} 