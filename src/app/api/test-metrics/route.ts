import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { customMetrics, telemetryUtils } from '@/lib/metrics';

async function handler(req: NextRequest) {
  // console.log('🧪 TEST-METRICS: Starting test endpoint');
  
  try {
    // Test all custom metrics
    // console.log('🧪 TEST-METRICS: Testing API request counter...');
    customMetrics.apiRequestCounter.add(1, { test: 'endpoint', type: 'api_test' });
    
    // console.log('🧪 TEST-METRICS: Testing page view counter...');
    customMetrics.pageViewCounter.add(1, { test: 'endpoint', page: 'test-metrics' });
    
    // console.log('🧪 TEST-METRICS: Testing error counter...');
    customMetrics.errorCounter.add(1, { test: 'endpoint', error_type: 'test_error' });
    
    // console.log('🧪 TEST-METRICS: Testing response time histogram...');
    customMetrics.apiResponseTime.record(123, { test: 'endpoint', method: 'GET' });
    
    // console.log('🧪 TEST-METRICS: Testing active users...');
    customMetrics.activeUsers.add(1, { test: 'endpoint' });
    
    // console.log('🧪 TEST-METRICS: Testing DB operation metrics...');
    customMetrics.dbOperationCounter.add(1, { test: 'endpoint', operation: 'select' });
    customMetrics.dbOperationDuration.record(45, { test: 'endpoint', operation: 'select' });
    
    // Test utility functions
    // console.log('🧪 TEST-METRICS: Testing utility functions...');
    telemetryUtils.recordApiRequest('GET', '/api/test-metrics', 200, 150);
    telemetryUtils.recordPageView('/test-metrics', 'test-user');
    telemetryUtils.recordError('test_error', 'This is a test error', 'test-metrics');
    telemetryUtils.recordDbOperation('select', 'test_table', 30, true);
    
    // console.log('✅ TEST-METRICS: All metrics tested successfully');
    
    return NextResponse.json({
      success: true,
      message: 'All custom metrics tested successfully',
      timestamp: new Date().toISOString(),
      metrics_tested: [
        'api_requests_total',
        'page_views_total', 
        'errors_total',
        'api_response_duration_ms',
        'active_users',
        'db_operations_total',
        'db_operation_duration_ms'
      ]
    });
    
  } catch (error) {
    console.error('❌ TEST-METRICS: Error during testing:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Export handler without telemetry wrapper to avoid traces
export const GET = handler;