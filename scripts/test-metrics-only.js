#!/usr/bin/env node

console.log('🔍 TESTING METRICS FUNCTIONALITY ONLY');
console.log('=====================================\n');

try {
  console.log('1. Importing metrics module...');
  const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');
  console.log('   ✅ Metrics imported successfully\n');
  
  console.log('2. Testing telemetryUtils functions...');
  
  console.log('   📊 Testing recordApiRequest...');
  telemetryUtils.recordApiRequest('GET', '/test-api', 200, 150);
  
  console.log('   👁️ Testing recordPageView...');
  telemetryUtils.recordPageView('/test-page', 'test-user');
  
  console.log('   🚨 Testing recordError...');
  telemetryUtils.recordError('test_error', 'Test error message', 'test_context');
  
  console.log('   🗄️ Testing recordDbOperation...');
  telemetryUtils.recordDbOperation('SELECT', 'test_table', 100, true);
  
  console.log('\n3. Testing direct metric access...');
  console.log('   📈 Accessing apiRequestCounter...');
  const counter = customMetrics.apiRequestCounter;
  console.log('   ✅ Counter accessed successfully');
  
  console.log('\n🎉 All metric functions executed!');
  console.log('📝 Look above for metric creation messages like:');
  console.log('   - "🔧 Initializing custom metrics and tracing..."');
  console.log('   - "📊 Created [metric name] metric"');
  console.log('   - "✅ [Metric type] recorded successfully"');
  
  console.log('\n⚠️ If you don\'t see those messages, the metrics aren\'t being created properly.');
  
} catch (error) {
  console.error('❌ Error testing metrics:', error);
}