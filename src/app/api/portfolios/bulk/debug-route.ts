import { NextRequest, NextResponse } from 'next/server';
import { portfolioApi } from '@/lib/api/portfolioService';
import { PortfolioPostDTO, PortfolioResponseDTO } from '@/types/portfolio';

/**
 * Debug version of the bulk portfolios route with detailed timing measurements
 * This helps identify where the 5-second delay is occurring
 */
export const POST = async (req: NextRequest) => {
  const requestStart = Date.now();
  const timings: Record<string, number> = {};
  
  console.log(`[DEBUG] Bulk portfolio request started at ${new Date().toISOString()}`);
  
  try {
    // Measure JSON parsing time
    const parseStart = Date.now();
    const body: PortfolioPostDTO[] = await req.json();
    timings.jsonParse = Date.now() - parseStart;
    console.log(`[DEBUG] JSON parsing took ${timings.jsonParse}ms`);
    
    // Measure service call time
    const serviceStart = Date.now();
    const result: PortfolioResponseDTO[] = await portfolioApi.createBulkPortfolios(body);
    timings.serviceCall = Date.now() - serviceStart;
    console.log(`[DEBUG] Service call took ${timings.serviceCall}ms`);
    
    // Measure response creation time
    const responseStart = Date.now();
    const response = NextResponse.json(result, { status: 201 });
    timings.responseCreation = Date.now() - responseStart;
    console.log(`[DEBUG] Response creation took ${timings.responseCreation}ms`);
    
    const totalTime = Date.now() - requestStart;
    timings.total = totalTime;
    
    console.log(`[DEBUG] Total request time: ${totalTime}ms`);
    console.log(`[DEBUG] Timing breakdown:`, timings);
    
    // Add timing headers for debugging
    response.headers.set('X-Debug-Total-Time', totalTime.toString());
    response.headers.set('X-Debug-JSON-Parse', timings.jsonParse.toString());
    response.headers.set('X-Debug-Service-Call', timings.serviceCall.toString());
    response.headers.set('X-Debug-Response-Creation', timings.responseCreation.toString());
    
    return response;
    
  } catch (error: any) {
    const totalTime = Date.now() - requestStart;
    console.log(`[DEBUG] Error occurred after ${totalTime}ms:`, error.message);
    
    // Pass through original status codes (400, 500) and response objects
    const statusCode = error.response?.status || error.status || 500;
    
    let errorResponse;
    if (error.response?.data) {
      errorResponse = error.response.data;
    } else {
      errorResponse = { error: error.message || 'Failed to create bulk portfolios' };
    }
    
    const response = NextResponse.json(errorResponse, { status: statusCode });
    response.headers.set('X-Debug-Total-Time', totalTime.toString());
    response.headers.set('X-Debug-Error', 'true');
    
    return response;
  }
};