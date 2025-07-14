import { NextRequest, NextResponse } from 'next/server';
import { executionService } from '@/lib/api/executionService';

// POST /api/executions/batch - Create multiple executions in batch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await executionService.createExecutionsBatch(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create executions batch' }, { status: 500 });
  }
}

// DELETE /api/executions/batch - Cancel multiple executions in batch
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await executionService.cancelExecutionsBatch(body);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel executions batch' }, { status: 500 });
  }
} 