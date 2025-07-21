#!/usr/bin/env node

// Test script to verify custom metrics are working
console.log('🧪 Testing custom metrics generation...');

// Import the metrics utilities
const { telemetryUtils, customMetrics } = require('../src/lib/metrics.ts');

async function testCustomMetrics() {
  console.log('📊 Starting custom metrics test...');
  
  try {
    // Test API request metrics
    console.log('🌐 Testing API request metrics...');
    telemetryUtils.recordApiRequest('GET', '/api/test', 200, 150);
    telemetryUtils.recordApiRequest('POST', '/api/users', 201, 300);
    telemetryUtils.recordApiRequest('GET', '/api/error', 500, 100);
    
    // Test page view metrics
    console.log('👁️ Testing page view metrics...');
    telemetryUtils.recordPageView('/dashboard', 'user123');
    telemetryUtils.recordPageView('/profile', 'user456');
    telemetryUtils.recordPageView('/home');
    
    // Test error metrics
    console.log('🚨 Testing error metrics...');
    telemetryUtils.recordError('validation_error', 'Invalid input data', 'user_form');
    telemetryUtils.recordError('network_error', 'Connection timeout', 'api_call');
    
    // Test database operation metrics
    console.log('🗄️ Testing database operation metrics...');
    telemetryUtils.recordDbOperation('SELECT', 'users', 50, true);
    telemetryUtils.recordDbOperation('INSERT', 'orders', 120, true);
    telemetryUtils.recordDbOperation('UPDATE', 'profiles', 200, false);
    
    // Test direct metric usage
    console.log('📈 Testing direct metric usage...');
    customMetrics.activeUsers.add(5, { region: 'us-east' });
    customMetrics.activeUsers.add(-2, { region: 'us-west' });
    
    console.log('✅ All custom metrics tests completed!');
    console.log('⏰ Waiting 10 seconds for metrics to be exported...');
    
    // Wait for metrics to be exported
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('🎉 Test completed! Check your Prometheus/collector for the metrics.');
    
  } catch (error) {
    console.error('❌ Error testing custom metrics:', error);
  }
}

// Run the test
testCustomMetrics().then(() => {
  console.log('🏁 Test script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});