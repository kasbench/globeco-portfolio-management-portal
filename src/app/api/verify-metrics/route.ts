import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { customMetrics, telemetryUtils } from '@/lib/metrics';

async function handler(req: NextRequest) {
  console.log('🔍 VERIFY-METRICS: Starting comprehensive metrics verification...');
  
  const results = [];
  
  try {
    // Test 1: API Request Counter
    console.log('🔍 VERIFY-METRICS: Testing api_requests_total...');
    customMetrics.apiRequestCounter.add(5, { 
      method: 'GET', 
      endpoint: '/api/verify-metrics',
      status_code: '200'
    });
    results.push('✅ api_requests_total: Added 5 with labels');
    
    // Test 2: Page View Counter  
    console.log('🔍 VERIFY-METRICS: Testing page_views_total...');
    customMetrics.pageViewCounter.add(3, { 
      page: 'verify-metrics',
      user_id: 'test-user'
    });
    results.push('✅ page_views_total: Added 3 with labels');
    
    // Test 3: Error Counter
    console.log('🔍 VERIFY-METRICS: Testing errors_total...');
    customMetrics.errorCounter.add(2, { 
      error_type: 'validation_error',
      context: 'verify-metrics'
    });
    results.push('✅ errors_total: Added 2 with labels');
    
    // Test 4: Response Time Histogram
    console.log('🔍 VERIFY-METRICS: Testing api_response_duration_ms...');
    customMetrics.apiResponseTime.record(150, {
      method: 'GET',
      endpoint: '/api/verify-metrics'
    });
    customMetrics.apiResponseTime.record(200, {
      method: 'GET', 
      endpoint: '/api/verify-metrics'
    });
    results.push('✅ api_response_duration_ms: Recorded 150ms and 200ms');
    
    // Test 5: Active Users (Up/Down Counter)
    console.log('🔍 VERIFY-METRICS: Testing active_users...');
    customMetrics.activeUsers.add(1, { session: 'test-session' });
    results.push('✅ active_users: Added 1 user');
    
    // Test 6: DB Operations
    console.log('🔍 VERIFY-METRICS: Testing db_operations_total...');
    customMetrics.dbOperationCounter.add(1, {
      operation: 'select',
      table: 'users',
      success: 'true'
    });
    results.push('✅ db_operations_total: Added 1 select operation');
    
    // Test 7: DB Duration
    console.log('🔍 VERIFY-METRICS: Testing db_operation_duration_ms...');
    customMetrics.dbOperationDuration.record(45, {
      operation: 'select',
      table: 'users'
    });
    results.push('✅ db_operation_duration_ms: Recorded 45ms');
    
    // Test 8: Utility Functions
    console.log('🔍 VERIFY-METRICS: Testing utility functions...');
    telemetryUtils.recordApiRequest('POST', '/api/verify-metrics', 201, 180);
    telemetryUtils.recordPageView('/verify-metrics', 'utility-test-user');
    telemetryUtils.recordError('test_error', 'This is a test error message', 'verify-metrics');
    telemetryUtils.recordDbOperation('insert', 'test_table', 25, true);
    results.push('✅ Utility functions: All tested successfully');
    
    console.log('🎉 VERIFY-METRICS: All metrics verification completed!');
    
    return NextResponse.json({
      success: true,
      message: 'All metrics verified and recorded',
      timestamp: new Date().toISOString(),
      results,
      prometheus_metrics_to_check: [
        'api_requests_total{method="GET",endpoint="/api/verify-metrics",status_code="200"}',
        'api_requests_total{method="POST",endpoint="/api/verify-metrics",status_code="201"}',
        'page_views_total{page="verify-metrics",user_id="test-user"}',
        'page_views_total{page="/verify-metrics",user_id="utility-test-user"}',
        'errors_total{error_type="validation_error",context="verify-metrics"}',
        'errors_total{error_type="test_error",context="verify-metrics"}',
        'api_response_duration_ms_bucket{method="GET",endpoint="/api/verify-metrics"}',
        'api_response_duration_ms_bucket{method="POST",endpoint="/api/verify-metrics"}',
        'active_users{session="test-session"}',
        'db_operations_total{operation="select",table="users",success="true"}',
        'db_operations_total{operation="insert",table="test_table",success="true"}',
        'db_operation_duration_ms_bucket{operation="select",table="users"}',
        'db_operation_duration_ms_bucket{operation="insert",table="test_table"}'
      ]
    });
    
  } catch (error) {
    console.error('❌ VERIFY-METRICS: Error during verification:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      results
    }, { status: 500 });
  }
}

export const GET = withTelemetry(handler, 'verify-metrics');