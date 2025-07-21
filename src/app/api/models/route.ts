import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';

// GET /api/models - List all models (with optional pagination/sorting)
export const GET = withTelemetry(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const models = await orderGenerationApi.listModels(params);
    return NextResponse.json(models);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch models' }, { status: 500 });
  }
}, 'list_models');

// POST /api/models - Create a new model
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const createdModel = await orderGenerationApi.createModel(body);
    return NextResponse.json(createdModel, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create model' }, { status: 500 });
  }
} 