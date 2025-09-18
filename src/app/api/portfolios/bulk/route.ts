import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { PortfolioPostDTO, PortfolioResponseDTO } from '@/types/portfolio';
import { withTelemetry } from '@/lib/withTelemetry';

export const POST = withTelemetry(async (req: NextRequest) => {
  try {
    const body: PortfolioPostDTO[] = await req.json();
    const result: PortfolioResponseDTO[] = await portfolioApi.createBulkPortfolios(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    // Pass through original status codes (400, 500) and response objects
    // Handle validation errors from downstream service
    const statusCode = error.response?.status || error.status || 500;
    
    // For axios errors, try to get the response data first, then fallback to error message
    let errorResponse;
    if (error.response?.data) {
      // Pass through the exact error response from downstream service
      errorResponse = error.response.data;
    } else {
      // Fallback for network errors or other issues
      errorResponse = { error: error.message || 'Failed to create bulk portfolios' };
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}, 'create_bulk_portfolios');