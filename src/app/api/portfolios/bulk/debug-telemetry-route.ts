import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { PortfolioPostDTO, PortfolioResponseDTO } from '@/types/portfolio';
import { withTelemetryTiming } from '@/lib/withTelemetryTiming';

export const POST = withTelemetryTiming(async (req: NextRequest) => {
  const requestStart = Date.now();
  console.log(`[BULK_PORTFOLIO_HANDLER] Handler started at ${new Date().toISOString()}`);

  try {
    // Measure JSON parsing time
    const parseStart = Date.now();
    console.log(`[BULK_PORTFOLIO_HANDLER] Starting JSON parse at +${parseStart - requestStart}ms`);
    const body: PortfolioPostDTO[] = await req.json();
    const parseTime = Date.now() - parseStart;
    console.log(`[BULK_PORTFOLIO_HANDLER] JSON parse completed in ${parseTime}ms`);

    // Measure service call time
    const serviceStart = Date.now();
    console.log(`[BULK_PORTFOLIO_HANDLER] Starting service call at +${serviceStart - requestStart}ms`);
    const result: PortfolioResponseDTO[] = await portfolioApi.createBulkPortfolios(body);
    const serviceTime = Date.now() - serviceStart;
    console.log(`[BULK_PORTFOLIO_HANDLER] Service call completed in ${serviceTime}ms`);

    // Measure response creation time
    const responseStart = Date.now();
    console.log(`[BULK_PORTFOLIO_HANDLER] Creating response at +${responseStart - requestStart}ms`);
    const response = NextResponse.json(result, { status: 201 });
    const responseTime = Date.now() - responseStart;
    console.log(`[BULK_PORTFOLIO_HANDLER] Response created in ${responseTime}ms`);

    const totalTime = Date.now() - requestStart;
    console.log(`[BULK_PORTFOLIO_HANDLER] Handler completed in ${totalTime}ms - RETURNING`);

    // Add performance headers
    response.headers.set('X-Performance-Total', totalTime.toString());
    response.headers.set('X-Performance-Parse', parseTime.toString());
    response.headers.set('X-Performance-Service', serviceTime.toString());
    response.headers.set('X-Performance-Response', responseTime.toString());
    response.headers.set('X-Performance-Mode', 'telemetry-timing');

    return response;
  } catch (error: any) {
    const totalTime = Date.now() - requestStart;
    console.log(`[BULK_PORTFOLIO_HANDLER] Error after ${totalTime}ms: ${error.message}`);

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
    response.headers.set('X-Performance-Mode', 'telemetry-timing');

    return response;
  }
}, 'create_bulk_portfolios_debug');