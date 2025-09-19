import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint that exactly mimics the bulk portfolio response
 * to isolate if it's the response content causing NGINX delays
 */
export const POST = async (req: NextRequest) => {
  const start = Date.now();
  console.log(`[BULK_MIMIC_TEST] Started at ${new Date().toISOString()}`);
  
  try {
    const body = await req.json();
    console.log(`[BULK_MIMIC_TEST] Body parsed at +${Date.now() - start}ms`);
    
    // Create EXACT same response structure as bulk portfolios
    const result = body.map((item: any, index: number) => ({
      portfolioId: `68cc30a386e226d439ad1d${46 + index}`, // Same format as real response
      name: item.name,
      dateCreated: "2025-09-18T16:17:39.384278Z", // Same format as real response
      version: item.version || 1
    }));
    
    console.log(`[BULK_MIMIC_TEST] Result created at +${Date.now() - start}ms`);
    
    // Use EXACT same response creation as bulk portfolios
    const response = NextResponse.json(result, { status: 201 });
    
    // Add EXACT same headers as bulk portfolios
    response.headers.set('X-Performance-Total', (Date.now() - start).toString());
    response.headers.set('X-Performance-Parse', '0');
    response.headers.set('X-Performance-Service', (Date.now() - start).toString());
    response.headers.set('X-Performance-Response', '0');
    response.headers.set('X-Performance-Mode', 'bulk-mimic-test');
    response.headers.set('X-Response-Size', JSON.stringify(result).length.toString());
    
    const totalTime = Date.now() - start;
    console.log(`[BULK_MIMIC_TEST] Completed in ${totalTime}ms - RETURNING`);
    
    return response;
    
  } catch (error: any) {
    const totalTime = Date.now() - start;
    console.log(`[BULK_MIMIC_TEST] Error at +${totalTime}ms: ${error.message}`);
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};