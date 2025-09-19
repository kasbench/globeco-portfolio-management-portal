import { NextRequest } from 'next/server';

/**
 * Test endpoint that bypasses NextResponse.json() to see if that's causing the delay
 */
export const POST = async (req: NextRequest) => {
  const start = Date.now();
  console.log(`[RAW_RESPONSE_TEST] Started at ${new Date().toISOString()}`);
  
  try {
    // Parse body like bulk portfolio
    const body = await req.json();
    console.log(`[RAW_RESPONSE_TEST] Body parsed at +${Date.now() - start}ms`);
    
    // Create response data
    const responseData = {
      message: "Raw response test",
      receivedData: body,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - start
    };
    
    console.log(`[RAW_RESPONSE_TEST] Response data created at +${Date.now() - start}ms`);
    
    // Use raw Response instead of NextResponse.json()
    const responseBody = JSON.stringify(responseData);
    console.log(`[RAW_RESPONSE_TEST] JSON stringified at +${Date.now() - start}ms`);
    
    const response = new Response(responseBody, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Raw-Response-Time': (Date.now() - start).toString(),
        'X-Response-Mode': 'raw-response'
      }
    });
    
    const totalTime = Date.now() - start;
    console.log(`[RAW_RESPONSE_TEST] Raw Response created at +${totalTime}ms - RETURNING`);
    
    return response;
    
  } catch (error: any) {
    const totalTime = Date.now() - start;
    console.log(`[RAW_RESPONSE_TEST] Error at +${totalTime}ms: ${error.message}`);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Raw-Response-Time': totalTime.toString(),
        'X-Response-Mode': 'raw-response-error'
      }
    });
  }
};

export const GET = async (req: NextRequest) => {
  const start = Date.now();
  console.log(`[RAW_RESPONSE_TEST_GET] Started at ${new Date().toISOString()}`);
  
  const responseData = {
    message: "Raw GET response test",
    timestamp: new Date().toISOString(),
    processingTime: Date.now() - start
  };
  
  const response = new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Raw-Response-Time': (Date.now() - start).toString(),
      'X-Response-Mode': 'raw-response-get'
    }
  });
  
  console.log(`[RAW_RESPONSE_TEST_GET] Completed in ${Date.now() - start}ms`);
  return response;
};