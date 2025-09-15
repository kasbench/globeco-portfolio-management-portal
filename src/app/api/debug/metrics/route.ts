import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // // console.log('🐛 DEBUG: Simple metrics test endpoint called');
  
  try {
    // Import metrics here to avoid any initialization issues
    // console.log('🐛 DEBUG: Importing metrics module...');
    const { telemetryUtils } = await import('@/lib/metrics');
    // console.log('🐛 DEBUG: Metrics module imported successfully');
    
    // console.log('🐛 DEBUG: About to call recordPageView...');
    telemetryUtils.recordPageView('/debug/metrics', 'debug-user');
    // console.log('🐛 DEBUG: recordPageView completed');
    
    // console.log('🐛 DEBUG: About to call recordApiRequest...');
    telemetryUtils.recordApiRequest('GET', '/debug/metrics', 200, 100);
    // console.log('🐛 DEBUG: recordApiRequest completed');
    
    // console.log('🐛 DEBUG: About to call recordError...');
    telemetryUtils.recordError('debug_test', 'Debug test error', 'debug-endpoint');
    // console.log('🐛 DEBUG: recordError completed');
    
    // console.log('🐛 DEBUG: All telemetry calls completed successfully');
    
    return NextResponse.json({
      message: 'Debug metrics test completed',
      timestamp: new Date().toISOString(),
      status: 'success',
      telemetryCallsCompleted: true
    });
    
  } catch (error) {
    console.error('🐛 DEBUG: Error in metrics test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('🐛 DEBUG: Error stack:', errorStack);
    return NextResponse.json({
      message: 'Debug metrics test failed',
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
}