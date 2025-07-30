import { NextRequest, NextResponse } from 'next/server';
import orderGenerationApi from '@/lib/api/orderGenerationService';
import { withTelemetry } from '@/lib/withTelemetry';
import { logger } from '@/lib/logger';

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
  const requestContext = logger.createRequestContext(req);
  const modelId = params.id;
  const url = new URL(req.url);
  
  // Log incoming request
  logger.logIncomingRequest(requestContext, url.search);
  
  try {
    logger.logApiOperation('Update model requested', requestContext, {
      model_id: modelId
    });

    const body = await req.json();
    
    logger.logServiceOperation('Updating model', requestContext, 'update_model', {
      model_id: modelId
    });

    const updated = await orderGenerationApi.updateModel(modelId, body);
    
    logger.logServiceOperation('Successfully updated model', requestContext, 'update_model', {
      model_id: modelId,
      model_name: updated.name || 'unknown'
    });
    
    logger.logApiOperation('Successfully updated model', requestContext, {
      model_id: modelId,
      model_name: updated.name || 'unknown'
    });

    const response = NextResponse.json(updated);
    logger.logCompletedRequest(requestContext, 200, JSON.stringify(updated).length);
    return response;
    
  } catch (error: any) {
    logger.logError('Failed to update model', error, requestContext, {
      model_id: modelId,
      operation: 'update_model'
    });

    const response = NextResponse.json({ 
      error: error.message || 'Failed to update model' 
    }, { status: 500 });
    logger.logCompletedRequest(requestContext, 500);
    return response;
  } finally {
    logger.cleanupRequestContext(requestContext.requestId);
  }
}

// DELETE /api/models/[id] - Delete model
export async function DELETE(req: NextRequest, { params }: any) {
  const requestContext = logger.createRequestContext(req);
  const modelId = params.id;
  const url = new URL(req.url);
  
  // Log incoming request
  logger.logIncomingRequest(requestContext, url.search);
  
  try {
    const { searchParams } = url;
    const version = searchParams.get('version');
    
    logger.logApiOperation('Delete model requested', requestContext, {
      model_id: modelId,
      version: version
    });
    
    if (!version) {
      logger.warn('Missing version parameter for model deletion', {
        request_id: requestContext.requestId,
        correlation_id: requestContext.correlationId,
        model_id: modelId
      });
      
      const response = NextResponse.json({ error: 'Version parameter is required' }, { status: 400 });
      logger.logCompletedRequest(requestContext, 400);
      return response;
    }
    
    const versionNumber = parseInt(version, 10);
    if (isNaN(versionNumber)) {
      logger.warn('Invalid version parameter for model deletion', {
        request_id: requestContext.requestId,
        correlation_id: requestContext.correlationId,
        model_id: modelId,
        version: version
      });
      
      const response = NextResponse.json({ error: 'Version must be a valid integer' }, { status: 400 });
      logger.logCompletedRequest(requestContext, 400);
      return response;
    }
    
    logger.logServiceOperation('Deleting model', requestContext, 'delete_model', {
      model_id: modelId,
      version: versionNumber
    });
    
    await orderGenerationApi.deleteModel(modelId, versionNumber);
    
    logger.logServiceOperation('Successfully deleted model', requestContext, 'delete_model', {
      model_id: modelId,
      version: versionNumber
    });
    
    logger.logApiOperation('Successfully deleted model', requestContext, {
      model_id: modelId
    });
    
    const response = new NextResponse(null, { status: 204 });
    logger.logCompletedRequest(requestContext, 204);
    return response;
    
  } catch (error: any) {
    logger.logError('Failed to delete model', error, requestContext, {
      model_id: modelId,
      operation: 'delete_model'
    });
    
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to delete model';
    
    // Handle specific error cases based on the documentation
    if (error.response?.status === 404) {
      statusCode = 404;
      errorMessage = `Model ${modelId} not found`;
    } else if (error.response?.status === 409) {
      statusCode = 409;
      errorMessage = 'Model has been modified by another process';
    } else if (error.response?.status === 422) {
      statusCode = 422;
      errorMessage = error.response?.data?.detail || 'Cannot delete model with associated portfolios. Remove all portfolios first.';
    } else if (error.response?.status === 400) {
      statusCode = 400;
      errorMessage = error.response?.data?.detail || 'Invalid model ID format. Must be 24-character hexadecimal string.';
    }
    
    const response = NextResponse.json({ error: errorMessage }, { status: statusCode });
    logger.logCompletedRequest(requestContext, statusCode);
    return response;
  } finally {
    logger.cleanupRequestContext(requestContext.requestId);
  }
} 