import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  // console.log('🧪 DEBUG: Telemetry test endpoint called');
  
  try {
    // console.log('🧪 DEBUG: Testing telemetry utilities...');
    
    // Test each telemetry function
    // console.log('🧪 DEBUG: Testing recordPageView...');
    telemetryUtils.recordPageView('/debug/telemetry-test', 'debug-user');
    
    // console.log('🧪 DEBUG: Testing recordApiRequest...');
    telemetryUtils.recordApiRequest('GET', '/debug/telemetry-test', 200, 150);
    
    // console.log('🧪 DEBUG: Testing recordError...');
    telemetryUtils.recordError('debug_test', 'Debug test error', 'telemetry-test');
    
    // console.log('🧪 DEBUG: Testing recordDbOperation...');
    telemetryUtils.recordDbOperation('SELECT', 'debug_table', 100, true);
    
    // console.log('🧪 DEBUG: All telemetry functions called successfully');
    
    return NextResponse.json({
      message: 'Telemetry test completed',
      timestamp: new Date().toISOString(),
      status: 'success',
      note: 'Check server console for telemetry initialization messages'
    });
    
  } catch (error) {
    console.error('🧪 DEBUG: Error in telemetry test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      message: 'Telemetry test failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
}