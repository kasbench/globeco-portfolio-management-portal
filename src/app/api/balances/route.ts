import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { tracedFetch } from '@/lib/telemetry-axios';

const ACCOUNTING_SERVICE_HOST = process.env.ACCOUNTING_SERVICE_HOST || 'globeco-portfolio-accounting-service';
const ACCOUNTING_SERVICE_PORT = process.env.ACCOUNTING_SERVICE_PORT || '8087';
const ACCOUNTING_BASE_URL = `http://${ACCOUNTING_SERVICE_HOST}:${ACCOUNTING_SERVICE_PORT}`;

export const GET = withTelemetry(async (req: NextRequest) => {
  const url = new URL(req.url);
  const queryString = url.search; // includes leading '?'

  const upstreamUrl = `${ACCOUNTING_BASE_URL}/api/v1/balances${queryString}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const upstreamResponse = await tracedFetch(
      upstreamUrl,
      { method: 'GET', signal: controller.signal },
      'get_balances_upstream'
    );
    clearTimeout(timeout);

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}, 'get_balances');
