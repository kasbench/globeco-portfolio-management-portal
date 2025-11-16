import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { PortfolioPostDTO, PortfolioResponseDTO } from '@/types/portfolio';
import { withTelemetry } from '@/lib/withTelemetry';

// Check if debug logging is enabled
const isDebugEnabled = process.env.LOG_LEVEL === 'debug';

// Bypass telemetry wrapper to isolate the delay
export const POST = async (req: NextRequest) => {
  const requestStart = Date.now();
  if (isDebugEnabled) {
    console.log(`[BULK_PORTFOLIO_TIMING] Request started at ${new Date().toISOString()}`);
  }

  try {
    // Measure JSON parsing time
    const parseStart = Date.now();
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Starting JSON parse at +${parseStart - requestStart}ms`);
    }
    const body: PortfolioPostDTO[] = await req.json();
    const parseTime = Date.now() - parseStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] JSON parse completed at +${Date.now() - requestStart}ms (took ${parseTime}ms)`);
    }

    // Measure service call time
    const serviceStart = Date.now();
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Starting service call at +${serviceStart - requestStart}ms`);
    }
    const result: PortfolioResponseDTO[] = await portfolioApi.createBulkPortfolios(body);
    const serviceTime = Date.now() - serviceStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Service call completed at +${Date.now() - requestStart}ms (took ${serviceTime}ms)`);
    }

    // Measure response creation time
    const responseStart = Date.now();
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Creating NextResponse at +${responseStart - requestStart}ms`);
    }
    const response = NextResponse.json(result, { status: 201 });
    const responseTime = Date.now() - responseStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] NextResponse created at +${Date.now() - requestStart}ms (took ${responseTime}ms)`);
    }

    // Measure header setting time
    const headerStart = Date.now();
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Setting headers at +${headerStart - requestStart}ms`);
    }
    response.headers.set('X-Performance-Total', (Date.now() - requestStart).toString());
    response.headers.set('X-Performance-Parse', parseTime.toString());
    response.headers.set('X-Performance-Service', serviceTime.toString());
    response.headers.set('X-Performance-Response', responseTime.toString());
    response.headers.set('X-Performance-Mode', 'detailed-timing');
    response.headers.set('X-Response-Size', JSON.stringify(result).length.toString());
    const headerTime = Date.now() - headerStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Headers set at +${Date.now() - requestStart}ms (took ${headerTime}ms)`);
    }

    const totalTime = Date.now() - requestStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Handler completed at +${totalTime}ms - RETURNING RESPONSE`);
      console.log(`[BULK_PORTFOLIO_TIMING] Breakdown: Parse=${parseTime}ms, Service=${serviceTime}ms, Response=${responseTime}ms, Headers=${headerTime}ms, Total=${totalTime}ms`);
    }

    return response;
  } catch (error: any) {
    const totalTime = Date.now() - requestStart;
    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] ERROR at +${totalTime}ms: ${error.message}`);
    }

    const statusCode = error.response?.status || error.status || 500;
    let errorResponse;
    if (error.response?.data) {
      errorResponse = error.response.data;
    } else {
      errorResponse = { error: error.message || 'Failed to create bulk portfolios' };
    }

    const response = NextResponse.json(errorResponse, { status: statusCode });
    response.headers.set('X-Performance-Total', totalTime.toString());
    response.headers.set('X-Performance-Error', 'true');
    response.headers.set('X-Performance-Mode', 'detailed-timing');

    if (isDebugEnabled) {
      console.log(`[BULK_PORTFOLIO_TIMING] Error response created and returning`);
    }
    return response;
  }
};