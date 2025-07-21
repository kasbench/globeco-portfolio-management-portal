#!/usr/bin/env node

// Debug script to check if metrics are being created and exported
console.log('🔍 Debugging metrics export...');

// Set up environment variables first
process.env.NODE_ENV = 'development';
process.env.OTEL_DEBUG = 'true';
process.env.OTEL_LOG_LEVEL = 'debug';
process.env.OTEL_METRIC_EXPORT_INTERVAL = '2000'; // Export every 2 seconds for testing

// Import telemetry first to initialize
require('../src/lib/telemetry.ts');

// Wait a bit for telemetry to initialize
setTimeout(async () => {
  console.log('📊 Starting metrics debug test...');
  
  try {
    // Import metrics after telemetry is initialized
    const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');
    const { metrics } = require('@opentelemetry/api');
    
    console.log('✅ Metrics imported successfully');
    
    // Test 1: Direct API usage
    console.log('\n🧪 Test 1: Direct OpenTelemetry API usage');
    const meter = metrics.getMeter('debug-test', '1.0.0');
    const debugCounter = meter.createCounter('debug_direct_counter', {
      description: 'Direct counter for debugging'
    });
    
    for (let i = 0; i < 5; i++) {
      debugCounter.add(1, { 
        test_iteration: i.toString(),
        test_type: 'direct_api'
      });
      console.log(`   Added count ${i + 1} to debug_direct_counter`);
    }
    
    // Test 2: Custom metrics utilities
    console.log('\n🧪 Test 2: Custom metrics utilities');
    for (let i = 0; i < 3; i++) {
      telemetryUtils.recordApiRequest('GET', `/test/${i}`, 200, 100 + i * 50);
      telemetryUtils.recordPageView(`/page/${i}`, `user${i}`);
      console.log(`   Recorded API request and page view ${i + 1}`);
    }
    
    // Test 3: Direct custom metrics
    console.log('\n🧪 Test 3: Direct custom metrics usage');
    for (let i = 0; i < 3; i++) {
      customMetrics.apiRequestCounter.add(1, {
        method: 'POST',
        endpoint: `/direct/${i}`,
        status_code: '201'
      });
      
      customMetrics.apiResponseTime.record(200 + i * 100, {
        method: 'POST',
        endpoint: `/direct/${i}`,
        status_code: '201'
      });
      
      console.log(`   Added direct custom metrics ${i + 1}`);
    }
    
    console.log('\n⏰ Waiting 15 seconds for metrics to be exported...');
    console.log('   (Check your collector logs during this time)');
    
    // Wait for multiple export cycles
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('\n🎉 Debug test completed!');
    console.log('📋 Summary:');
    console.log('   - Created 5 direct API counters');
    console.log('   - Created 3 API request metrics via utilities');
    console.log('   - Created 3 page view metrics via utilities');
    console.log('   - Created 3 direct custom metrics');
    console.log('\n🔍 Check your Prometheus metrics for:');
    console.log('   - debug_direct_counter');
    console.log('   - api_requests_total');
    console.log('   - api_response_duration_ms');
    console.log('   - page_views_total');
    
  } catch (error) {
    console.error('❌ Error in debug test:', error);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Debug test interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Debug test terminated');
  process.exit(0);
});