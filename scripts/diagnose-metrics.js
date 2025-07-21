#!/usr/bin/env node

console.log('🔍 METRICS DIAGNOSTIC TOOL');
console.log('==========================\n');

// Set debug environment
process.env.NODE_ENV = 'development';
process.env.OTEL_DEBUG = 'true';
process.env.OTEL_LOG_LEVEL = 'debug';
process.env.OTEL_METRIC_EXPORT_INTERVAL = '1000'; // 1 second for fast testing

console.log('📋 Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   OTEL_DEBUG: ${process.env.OTEL_DEBUG}`);
console.log(`   OTEL_LOG_LEVEL: ${process.env.OTEL_LOG_LEVEL}`);
console.log(`   OTEL_METRIC_EXPORT_INTERVAL: ${process.env.OTEL_METRIC_EXPORT_INTERVAL}`);
console.log(`   OTEL_EXPORTER_OTLP_ENDPOINT: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'not set'}\n`);

// Initialize telemetry
console.log('🚀 Initializing telemetry...');
require('../src/lib/telemetry.ts');

// Wait for telemetry to initialize
setTimeout(async () => {
  console.log('\n📊 Starting metrics diagnostic...');

  try {
    // Import after telemetry initialization
    const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');
    const { metrics } = require('@opentelemetry/api');

    console.log('✅ Metrics modules imported successfully\n');

    // Test 1: Check if OpenTelemetry API is working
    console.log('🧪 TEST 1: OpenTelemetry API Basic Test');
    console.log('----------------------------------------');
    const testMeter = metrics.getMeter('diagnostic-test', '1.0.0');
    const diagnosticCounter = testMeter.createCounter('diagnostic_test_counter', {
      description: 'Counter to test basic OpenTelemetry functionality'
    });

    console.log('   ✅ Test meter created');
    console.log('   ✅ Test counter created');

    // Add some values
    for (let i = 1; i <= 3; i++) {
      diagnosticCounter.add(1, { test_number: i.toString() });
      console.log(`   📈 Added count ${i} to diagnostic_test_counter`);
    }

    // Test 2: Check custom metrics utilities
    console.log('\n🧪 TEST 2: Custom Metrics Utilities Test');
    console.log('------------------------------------------');

    console.log('   🌐 Testing API request metrics...');
    telemetryUtils.recordApiRequest('GET', '/diagnostic/test1', 200, 150);
    telemetryUtils.recordApiRequest('POST', '/diagnostic/test2', 201, 300);
    telemetryUtils.recordApiRequest('GET', '/diagnostic/test3', 404, 50);

    console.log('   👁️ Testing page view metrics...');
    telemetryUtils.recordPageView('/diagnostic/page1', 'user123');
    telemetryUtils.recordPageView('/diagnostic/page2', 'user456');
    telemetryUtils.recordPageView('/diagnostic/page3');

    console.log('   🚨 Testing error metrics...');
    telemetryUtils.recordError('diagnostic_error', 'Test error 1', 'test_context');
    telemetryUtils.recordError('validation_error', 'Test error 2', 'form_validation');

    console.log('   🗄️ Testing database operation metrics...');
    telemetryUtils.recordDbOperation('SELECT', 'users', 75, true);
    telemetryUtils.recordDbOperation('INSERT', 'orders', 120, true);
    telemetryUtils.recordDbOperation('UPDATE', 'profiles', 200, false);

    // Test 3: Direct custom metrics usage
    console.log('\n🧪 TEST 3: Direct Custom Metrics Test');
    console.log('--------------------------------------');

    console.log('   📊 Testing direct counter usage...');
    customMetrics.apiRequestCounter.add(1, { method: 'PATCH', endpoint: '/direct/test', status_code: '200' });

    console.log('   📈 Testing histogram usage...');
    customMetrics.apiResponseTime.record(250, { method: 'PATCH', endpoint: '/direct/test', status_code: '200' });

    console.log('   📉 Testing up-down counter usage...');
    customMetrics.activeUsers.add(10, { region: 'us-east' });
    customMetrics.activeUsers.add(-3, { region: 'us-west' });

    // Test 4: Rapid metric generation
    console.log('\n🧪 TEST 4: Rapid Metric Generation Test');
    console.log('----------------------------------------');

    console.log('   🔄 Generating 20 rapid metrics...');
    for (let i = 1; i <= 20; i++) {
      telemetryUtils.recordApiRequest('GET', `/rapid/test${i}`, 200, 100 + i);
      if (i % 5 === 0) {
        console.log(`   📊 Generated ${i}/20 rapid metrics`);
      }
    }

    console.log('\n⏰ WAITING FOR METRIC EXPORTS...');
    console.log('==================================');
    console.log('Waiting 15 seconds for multiple export cycles...');
    console.log('(Watch the console for export logs)\n');

    // Wait for multiple export cycles
    let countdown = 15;
    const countdownInterval = setInterval(() => {
      console.log(`⏳ ${countdown} seconds remaining...`);
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n🎯 DIAGNOSTIC SUMMARY');
    console.log('=====================');
    console.log('✅ Generated the following metrics:');
    console.log('   📊 diagnostic_test_counter (3 data points)');
    console.log('   📊 api_requests_total (26 data points)');
    console.log('   📊 api_response_duration_ms (26 data points)');
    console.log('   📊 page_views_total (3 data points)');
    console.log('   📊 errors_total (2 data points)');
    console.log('   📊 db_operations_total (3 data points)');
    console.log('   📊 db_operation_duration_ms (3 data points)');
    console.log('   📊 active_users (2 data points)');

    console.log('\n🔍 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check your OpenTelemetry Collector logs for incoming metrics');
    console.log('2. Verify your Prometheus configuration is scraping the collector');
    console.log('3. Check Prometheus targets page (/targets) for collector status');
    console.log('4. Query Prometheus directly for these metric names');
    console.log('5. If metrics still don\'t appear, there may be a collector configuration issue');

    console.log('\n🔧 TROUBLESHOOTING COMMANDS:');
    console.log('============================');
    console.log('# Check collector logs:');
    console.log('kubectl logs -n monitoring deployment/otel-collector-collector');
    console.log('');
    console.log('# Check Prometheus targets:');
    console.log('curl http://your-prometheus:9090/api/v1/targets');
    console.log('');
    console.log('# Query for your metrics:');
    console.log('curl "http://your-prometheus:9090/api/v1/query?query=api_requests_total"');

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 Diagnostic completed!');
  process.exit(0);
}, 5000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Diagnostic interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Diagnostic terminated');
  process.exit(0);
});