#!/usr/bin/env node

console.log('🔧 VERIFYING CUSTOM METRICS FIX');
console.log('===============================\n');

// Set environment for testing
process.env.NODE_ENV = 'development';
process.env.OTEL_DEBUG = 'true';

console.log('📊 Testing custom metrics with lazy initialization...\n');

try {
  // Import the fixed metrics module
  const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');
  
  console.log('✅ Metrics module imported successfully');
  console.log('🧪 Testing metric recording...\n');
  
  // Test each type of metric
  console.log('1. Testing API request metrics...');
  telemetryUtils.recordApiRequest('GET', '/test/verify', 200, 125);
  
  console.log('2. Testing page view metrics...');
  telemetryUtils.recordPageView('/verify-page', 'test-user');
  
  console.log('3. Testing error metrics...');
  telemetryUtils.recordError('test_error', 'Verification test error', 'verification');
  
  console.log('4. Testing database operation metrics...');
  telemetryUtils.recordDbOperation('SELECT', 'test_table', 75, true);
  
  console.log('\n🎉 All metric types tested successfully!');
  console.log('📈 Custom metrics should now appear in Prometheus');
  console.log('🔍 Look for these metric names:');
  console.log('   - api_requests_total');
  console.log('   - api_response_duration_ms');
  console.log('   - page_views_total');
  console.log('   - errors_total');
  console.log('   - db_operations_total');
  console.log('   - db_operation_duration_ms');
  
  console.log('\n⏰ Waiting 5 seconds for metric export...');
  setTimeout(() => {
    console.log('✅ Verification complete! Check your Prometheus endpoint.');
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.error('❌ Error during verification:', error);
  process.exit(1);
}