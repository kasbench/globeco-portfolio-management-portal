import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { withTelemetry } from '@/lib/withTelemetry';

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
  const startTime = Date.now();
  const portfolioId = params.id;
  
  // Log incoming request details
  console.log('📝 PUT /api/portfolios/[id] - Request received', {
    portfolioId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    xForwardedFor: req.headers.get('x-forwarded-for'),
    xRealIp: req.headers.get('x-real-ip'),
  });

  try {
    const body = await req.json();
    
    // Log request body details
    console.log('📝 PUT /api/portfolios/[id] - Request body parsed', {
      portfolioId,
      requestBody: body,
      bodyKeys: Object.keys(body || {}),
      bodySize: JSON.stringify(body).length,
      hasName: 'name' in (body || {}),
      hasVersion: 'version' in (body || {}),
      hasDateCreated: 'dateCreated' in (body || {}),
    });

    // Validate required fields
    if (!body) {
      console.warn('⚠️ PUT /api/portfolios/[id] - Empty request body', { portfolioId });
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    if (body.portfolioId && body.portfolioId !== portfolioId) {
      console.warn('⚠️ PUT /api/portfolios/[id] - Portfolio ID mismatch', {
        urlPortfolioId: portfolioId,
        bodyPortfolioId: body.portfolioId
      });
      return NextResponse.json({ 
        error: 'Portfolio ID in URL does not match portfolio ID in request body' 
      }, { status: 400 });
    }

    console.log('🔄 PUT /api/portfolios/[id] - Calling portfolio service', {
      portfolioId,
      serviceCall: 'portfolioApi.updatePortfolio',
      parameters: { id: portfolioId, body }
    });

    const updated = await portfolioApi.updatePortfolio(portfolioId, body);
    
    const duration = Date.now() - startTime;
    console.log('✅ PUT /api/portfolios/[id] - Update successful', {
      portfolioId,
      duration: `${duration}ms`,
      updatedPortfolio: {
        id: updated.id,
        name: updated.name,
        version: updated.version,
        dateCreated: updated.dateCreated
      },
      versionIncremented: body.version !== updated.version
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ PUT /api/portfolios/[id] - Update failed', {
      portfolioId,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        status: error.status,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      errorType: error.constructor.name
    });

    // Return appropriate error response based on error type
    if (error.status === 404) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    
    if (error.status === 409) {
      return NextResponse.json({ error: 'Version conflict - portfolio was modified by another user' }, { status: 409 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to update portfolio' 
    }, { 
      status: error.status || 500 
    });
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