import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Minimal version of bulk portfolios route without any telemetry or wrappers
 * This helps isolate if the telemetry system is causing the delay
 */
export const POST = async (req: NextRequest) => {
  const requestStart = Date.now();
  
  try {
    // Parse request body
    const body = await req.json();
    console.log(`[MINIMAL] Request parsed in ${Date.now() - requestStart}ms`);
    
    // Direct axios call to portfolio service
    const serviceStart = Date.now();
    const PORTFOLIO_SERVICE_HOST = process.env.PORTFOLIO_SERVICE_HOST || 'globeco-portfolio-service';
    const PORTFOLIO_SERVICE_PORT = process.env.PORTFOLIO_SERVICE_PORT || '8000';
    const BASE_URL = `http://${PORTFOLIO_SERVICE_HOST}:${PORTFOLIO_SERVICE_PORT}`;
    
    const response = await axios.post(`${BASE_URL}/api/v2/portfolios`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    const serviceTime = Date.now() - serviceStart;
    const totalTime = Date.now() - requestStart;
    
    console.log(`[MINIMAL] Service call took ${serviceTime}ms`);
    console.log(`[MINIMAL] Total time: ${totalTime}ms`);
    
    const nextResponse = NextResponse.json(response.data, { status: 201 });
    nextResponse.headers.set('X-Minimal-Total-Time', totalTime.toString());
    nextResponse.headers.set('X-Minimal-Service-Time', serviceTime.toString());
    
    return nextResponse;
    
  } catch (error: any) {
    const totalTime = Date.now() - requestStart;
    console.log(`[MINIMAL] Error after ${totalTime}ms:`, error.message);
    
    const statusCode = error.response?.status || 500;
    const errorResponse = error.response?.data || { error: error.message };
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
};