import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint that mimics the exact response pattern of bulk portfolios
 * to see if the response structure is causing the delay
 */
export const POST = async (req: NextRequest) => {
  const start = Date.now();
  console.log(`[PORTFOLIO_PATTERN_TEST] Started at ${new Date().toISOString()}`);
  
  try {
    const body = await req.json();
    console.log(`[PORTFOLIO_PATTERN_TEST] Body parsed at +${Date.now() - start}ms`);
    
    // Mimic the exact response structure of bulk portfolios
    const result = body.map((item: any, index: number) => ({
      portfolioId: `test-${Date.now()}-${index}`,
      name: item.name,
      dateCreated: new Date().toISOString(),
      version: item.version || 1
    }));
    
    console.log(`[PORTFOLIO_PATTERN_TEST] Result created at +${Date.now() - start}ms`);
    
    // Use NextResponse.json() like the original
    const response = NextResponse.json(result, { status: 201 });
    
    console.log(`[PORTFOLIO_PATTERN_TEST] NextResponse created at +${Date.now() - start}ms`);
    
    // Add same headers as original
    response.headers.set('X-Performance-Total', (Date.now() - start).toString());
    response.headers.set('X-Performance-Mode', 'portfolio-pattern-test');
    
    const totalTime = Date.now() - start;
    console.log(`[PORTFOLIO_PATTERN_TEST] Completed in ${totalTime}ms - RETURNING`);
    
    return response;
    
  } catch (error: any) {
    const totalTime = Date.now() - start;
    console.log(`[PORTFOLIO_PATTERN_TEST] Error at +${totalTime}ms: ${error.message}`);
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};