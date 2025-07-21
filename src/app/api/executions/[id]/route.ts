import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/executions/[id] - Get execution by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const { id } = params;
    const data = await executionService.getExecutionEnhanced(Number(id));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch execution' }, { status: 500 });
  }
}, 'get_execution_by_id');

// PUT /api/executions/[id] - Update execution
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const body = await req.json();
    const data = await executionService.updateExecution(Number(id), body);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update execution' }, { status: 500 });
  }
}

// DELETE /api/executions/[id] - Cancel execution
export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { id } = params;
    // Version is required for cancel, get from query string
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 });
    }
    const data = await executionService.cancelExecution(Number(id), Number(version));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel execution' }, { status: 500 });
  }
} 