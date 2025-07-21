import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/models/[id] - Get model by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const model = await orderGenerationApi.getModelById(params.id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    return NextResponse.json(model);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch model' }, { status: 500 });
  }
}, 'get_model_by_id');

// PUT /api/models/[id] - Update model
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const body = await req.json();
    const updated = await orderGenerationApi.updateModel(params.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update model' }, { status: 500 });
  }
}

// DELETE /api/models/[id] - Delete model (not implemented in orderGenerationApi, so return 501)
export async function DELETE(req: NextRequest, { params }: any) {
  return NextResponse.json({ error: 'Delete model not implemented' }, { status: 501 });
} 