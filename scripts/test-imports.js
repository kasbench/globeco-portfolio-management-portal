#!/usr/bin/env node

console.log('🔍 TESTING TELEMETRY IMPORTS');
console.log('============================\n');

try {
  console.log('1. Testing metrics import...');
  const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');
  console.log('   ✅ Metrics imported successfully');
  
  console.log('2. Testing middleware import...');
  const middleware = require('../src/middleware.ts');
  console.log('   ✅ Middleware imported successfully');
  
  console.log('3. Testing withTelemetry import...');
  const { withTelemetry } = require('../src/lib/withTelemetry.ts');
  console.log('   ✅ withTelemetry imported successfully');
  
  console.log('4. Testing direct telemetry call...');
  telemetryUtils.recordPageView('/test-import', 'test-user');
  
  console.log('\n🎉 All imports working correctly!');
  console.log('📝 If you see metric creation messages above, the fix is working.');
  console.log('🚨 If no metric messages appear, there may be an initialization issue.');
  
} catch (error) {
  console.error('❌ Import error:', error);
  console.log('\n🔧 This suggests a module resolution or compilation issue.');
}