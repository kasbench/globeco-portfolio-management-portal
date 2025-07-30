import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { withTelemetry } from '@/lib/withTelemetry';
import { logger } from '@/lib/logger';

// GET /api/portfolios/[id] - Get portfolio by ID
export const GET = withTelemetry(async (req: NextRequest, { params }: any) => {
  try {
    const portfolio = await portfolioApi.getPortfolio(params.id);
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    return NextResponse.json(portfolio);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch portfolio' }, { status: 500 });
  }
}, 'get_portfolio_by_id');

// PUT /api/portfolios/[id] - Update portfolio
export async function PUT(req: NextRequest, { params }: any) {
  const requestContext = logger.createRequestContext(req);
  const portfolioId = params.id;
  const url = new URL(req.url);
  
  // Log incoming request
  logger.logIncomingRequest(requestContext, url.search);

  try {
    logger.logApiOperation('Update portfolio requested', requestContext, {
      portfolio_id: portfolioId
    });

    const body = await req.json();
    
    logger.debug('Request body parsed', {
      request_id: requestContext.requestId,
      correlation_id: requestContext.correlationId,
      portfolio_id: portfolioId,
      body_keys: Object.keys(body || {}),
      body_size: JSON.stringify(body).length
    });

    // Validate required fields
    if (!body) {
      logger.warn('Empty request body provided', {
        request_id: requestContext.requestId,
        correlation_id: requestContext.correlationId,
        portfolio_id: portfolioId
      });
      
      const response = NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      logger.logCompletedRequest(requestContext, 400);
      return response;
    }

    if (body.portfolioId && body.portfolioId !== portfolioId) {
      logger.warn('Portfolio ID mismatch between URL and body', {
        request_id: requestContext.requestId,
        correlation_id: requestContext.correlationId,
        url_portfolio_id: portfolioId,
        body_portfolio_id: body.portfolioId
      });
      
      const response = NextResponse.json({ 
        error: 'Portfolio ID in URL does not match portfolio ID in request body' 
      }, { status: 400 });
      logger.logCompletedRequest(requestContext, 400);
      return response;
    }

    logger.logServiceOperation('Updating portfolio', requestContext, 'update_portfolio', {
      portfolio_id: portfolioId
    });

    const updated = await portfolioApi.updatePortfolio(portfolioId, body);
    
    logger.logServiceOperation('Successfully updated portfolio', requestContext, 'update_portfolio', {
      portfolio_id: portfolioId,
      portfolio_name: updated.name,
      version: updated.version,
      version_incremented: body.version !== updated.version
    });
    
    logger.logApiOperation('Successfully updated portfolio', requestContext, {
      portfolio_id: portfolioId,
      portfolio_name: updated.name
    });

    const response = NextResponse.json(updated);
    logger.logCompletedRequest(requestContext, 200, JSON.stringify(updated).length);
    return response;
    
  } catch (error: any) {
    logger.logError('Failed to update portfolio', error, requestContext, {
      portfolio_id: portfolioId,
      operation: 'update_portfolio'
    });

    const statusCode = error.status || 500;
    let errorMessage = error.message || 'Failed to update portfolio';
    
    // Return appropriate error response based on error type
    if (error.status === 404) {
      errorMessage = 'Portfolio not found';
    } else if (error.status === 409) {
      errorMessage = 'Version conflict - portfolio was modified by another user';
    }

    const response = NextResponse.json({ error: errorMessage }, { status: statusCode });
    logger.logCompletedRequest(requestContext, statusCode);
    return response;
  } finally {
    logger.cleanupRequestContext(requestContext.requestId);
  }
}

// DELETE /api/portfolios/[id] - Delete portfolio
export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 });
    }
    await portfolioApi.deletePortfolio(params.id, Number(version));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete portfolio' }, { status: 500 });
  }
} 