import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tracedFetch } from '@/lib/telemetry-axios';

const ACCOUNTING_SERVICE_HOST = process.env.ACCOUNTING_SERVICE_HOST || 'globeco-portfolio-accounting-service';
const ACCOUNTING_SERVICE_PORT = process.env.ACCOUNTING_SERVICE_PORT || '8087';
const ACCOUNTING_BASE_URL = `http://${ACCOUNTING_SERVICE_HOST}:${ACCOUNTING_SERVICE_PORT}`;

// POST /api/transactions — proxy to Portfolio Accounting Service
export async function POST(req: NextRequest) {
  const requestContext = logger.createRequestContext(req);
  const url = new URL(req.url);

  // Log incoming request
  logger.logIncomingRequest(requestContext, url.search);

  try {
    // Read raw body to preserve payload exactly
    const rawBody = await req.text();

    // Prepare headers, forwarding X-API-Key if present
    const upstreamHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      (upstreamHeaders as Record<string, string>)['X-API-Key'] = apiKey;
    }

    // Timeout consistent with other API clients (30s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const upstreamUrl = `${ACCOUNTING_BASE_URL}/api/v1/transactions`;

    logger.logServiceOperation('Forwarding transactions to accounting service', requestContext, 'post_transactions', {
      upstream_url: upstreamUrl,
    });

    const upstreamResponse = await tracedFetch(
      upstreamUrl,
      {
        method: 'POST',
        headers: upstreamHeaders,
        body: rawBody,
        signal: controller.signal,
      },
      'post_transactions_upstream'
    );

    clearTimeout(timeout);

    // Read upstream response as text to preserve exact body
    const responseText = await upstreamResponse.text();
    const status = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    logger.logApiOperation('Accounting service responded', requestContext, {
      upstream_status: status,
    });

    const response = new Response(responseText, {
      status,
      headers: {
        'Content-Type': contentType,
      },
    });

    // Best-effort response size logging
    logger.logCompletedRequest(requestContext, status, responseText.length);
    return response;
  } catch (error: any) {
    // Log and return a server error since upstream was not reachable or other failure occurred
    logger.logError('Failed to proxy POST /api/transactions', error, requestContext, {
      endpoint: '/api/transactions',
    });

    const errorBody = { error: 'Failed to post transactions' };
    const response = NextResponse.json(errorBody, { status: 500 });
    logger.logCompletedRequest(requestContext, 500, JSON.stringify(errorBody).length);
    return response;
  } finally {
    // Ensure request context cleanup
    logger.cleanupRequestContext(requestContext.requestId);
  }
}


