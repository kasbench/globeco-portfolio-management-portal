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

// DELETE /api/models/[id] - Delete model
export const DELETE = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    
    if (!version) {
      return NextResponse.json({ error: 'Version parameter is required' }, { status: 400 });
    }
    
    const versionNumber = parseInt(version, 10);
    if (isNaN(versionNumber)) {
      return NextResponse.json({ error: 'Version must be a valid integer' }, { status: 400 });
    }
    
    await orderGenerationApi.deleteModel(params.id, versionNumber);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error(`Error deleting model ${params.id}:`, error);
    
    // Handle specific error cases based on the documentation
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Model ${params.id} not found` }, { status: 404 });
    } else if (error.response?.status === 409) {
      return NextResponse.json({ error: 'Model has been modified by another process' }, { status: 409 });
    } else if (error.response?.status === 422) {
      return NextResponse.json({ 
        error: error.response?.data?.detail || 'Cannot delete model with associated portfolios. Remove all portfolios first.' 
      }, { status: 422 });
    } else if (error.response?.status === 400) {
      return NextResponse.json({ 
        error: error.response?.data?.detail || 'Invalid model ID format. Must be 24-character hexadecimal string.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to delete model' }, { status: 500 });
  }
}, 'delete_model'); 