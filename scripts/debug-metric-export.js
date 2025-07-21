#!/usr/bin/env node

console.log('🔍 DEBUG: Metric Export Configuration');
console.log('=====================================');

// Set environment variables for debugging
process.env.NODE_ENV = 'development';
process.env.OTEL_DEBUG = 'true';
process.env.OTEL_LOG_LEVEL = 'debug';

// Check current environment
console.log('\n📋 Current Environment Variables:');
console.log('----------------------------------');
const otelVars = Object.keys(process.env)
  .filter(key => key.startsWith('OTEL_'))
  .sort();

otelVars.forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
});

console.log('\n🔧 Key Metric Export Variables:');
console.log('-------------------------------');
console.log(`OTEL_METRICS_EXPORTER: ${process.env.OTEL_METRICS_EXPORTER || 'NOT SET'}`);
console.log(`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: ${process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'NOT SET'}`);
console.log(`OTEL_METRIC_EXPORT_INTERVAL: ${process.env.OTEL_METRIC_EXPORT_INTERVAL || 'NOT SET'}`);

// Test basic OpenTelemetry API
console.log('\n🧪 Testing OpenTelemetry API...');
console.log('-------------------------------');

try {
  const { metrics } = require('@opentelemetry/api');
  console.log('✅ OpenTelemetry API imported successfully');
  
  const meter = metrics.getMeter('debug-test', '1.0.0');
  console.log('✅ Meter created successfully');
  
  const counter = meter.createCounter('debug_export_test_counter', {
    description: 'Counter to test metric export'
  });
  console.log('✅ Counter created successfully');
  
  // Add some values
  console.log('\n📊 Adding counter values...');
  for (let i = 1; i <= 5; i++) {
    counter.add(1, { test_iteration: i.toString() });
    console.log(`   Added count ${i}`);
  }
  
  console.log('\n⏰ Waiting 10 seconds for potential export...');
  console.log('(Check your collector logs during this time)');
  
  setTimeout(() => {
    console.log('\n🎯 Debug Summary:');
    console.log('=================');
    console.log('✅ OpenTelemetry API is working');
    console.log('✅ Metrics can be created');
    console.log('✅ Counter values were added');
    console.log('');
    console.log('🔍 If metrics still don\'t appear in Prometheus:');
    console.log('1. The NodeSDK might not be configured for metric export');
    console.log('2. The metric reader might not be properly initialized');
    console.log('3. Environment variables might not be sufficient');
    console.log('');
    console.log('💡 Since tracing works, try checking:');
    console.log('- Collector logs for incoming metrics');
    console.log('- Whether the collector is configured to forward metrics to Prometheus');
    console.log('- Prometheus scraping configuration');
    
    process.exit(0);
  }, 10000);
  
} catch (error) {
  console.error('❌ Error testing OpenTelemetry API:', error);
  process.exit(1);
}