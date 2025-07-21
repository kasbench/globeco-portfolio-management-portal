import { NextRequest, NextResponse } from 'next/server';
import { simpleMetrics } from '@/lib/simple-telemetry';

export async function GET(req: NextRequest) {
  console.log('🧪 SIMPLE-TEST: Starting simple telemetry test...');
  
  try {
    // Test each metric with detailed logging
    console.log('🧪 SIMPLE-TEST: Testing API request counter...');
    const apiCounter = simpleMetrics.apiRequestCounter;
    apiCounter.add(1, { endpoint: '/api/simple-test', method: 'GET' });
    console.log('✅ SIMPLE-TEST: API request counter incremented');
    
    console.log('🧪 SIMPLE-TEST: Testing page view counter...');
    const pageCounter = simpleMetrics.pageViewCounter;
    pageCounter.add(1, { page: 'simple-test' });
    console.log('✅ SIMPLE-TEST: Page view counter incremented');
    
    console.log('🧪 SIMPLE-TEST: Testing error counter...');
    const errorCounter = simpleMetrics.errorCounter;
    errorCounter.add(1, { error_type: 'test_error' });
    console.log('✅ SIMPLE-TEST: Error counter incremented');
    
    console.log('🎉 SIMPLE-TEST: All metrics tested successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Simple telemetry test completed',
      timestamp: new Date().toISOString(),
      metrics_tested: ['api_requests_total', 'page_views_total', 'errors_total']
    });
    
  } catch (error) {
    console.error('❌ SIMPLE-TEST: Error during test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}