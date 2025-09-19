import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple performance test endpoint to compare with bulk portfolios
 * This helps isolate if the delay is specific to the bulk portfolio endpoint
 */
export const GET = async (req: NextRequest) => {
  const start = Date.now();
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const totalTime = Date.now() - start;
  
  const response = NextResponse.json({
    message: 'Performance test endpoint',
    timestamp: new Date().toISOString(),
    processingTime: totalTime
  });
  
  response.headers.set('X-Performance-Total', totalTime.toString());
  response.headers.set('X-Performance-Mode', 'test-endpoint');
  
  return response;
};

export const POST = async (req: NextRequest) => {
  const start = Date.now();
  
  try {
    // Parse JSON (similar to bulk portfolio endpoint)
    const parseStart = Date.now();
    const body = await req.json();
    const parseTime = Date.now() - parseStart;
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const totalTime = Date.now() - start;
    
    const response = NextResponse.json({
      message: 'Performance test POST endpoint',
      receivedData: body,
      timestamp: new Date().toISOString(),
      processingTime: totalTime,
      parseTime
    });
    
    response.headers.set('X-Performance-Total', totalTime.toString());
    response.headers.set('X-Performance-Parse', parseTime.toString());
    response.headers.set('X-Performance-Mode', 'test-endpoint-post');
    
    return response;
  } catch (error: any) {
    const totalTime = Date.now() - start;
    
    return NextResponse.json({
      error: error.message,
      processingTime: totalTime
    }, { status: 400 });
  }
};