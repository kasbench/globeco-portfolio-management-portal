#!/usr/bin/env node

/**
 * Test script to measure telemetry overhead in isolation
 */

// Simulate the telemetry wrappers without actual HTTP calls
async function measureTelemetryOverhead() {
  console.log('🔍 Testing telemetry overhead...');
  
  // Simulate the withTelemetry wrapper
  async function withTelemetrySimulation(operation, operationName) {
    const start = Date.now();
    
    // Simulate telemetry setup
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms for setup
    
    try {
      const result = await operation();
      
      // Simulate telemetry cleanup
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms for cleanup
      
      return result;
    } finally {
      const duration = Date.now() - start;
      console.log(`  withTelemetry overhead: ${duration}ms`);
    }
  }
  
  // Simulate the withHttpTelemetry wrapper
  async function withHttpTelemetrySimulation(operation, operationName) {
    const start = Date.now();
    
    // Simulate HTTP telemetry setup
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms for setup
    
    try {
      const result = await operation();
      
      // Simulate HTTP telemetry cleanup
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms for cleanup
      
      return result;
    } finally {
      const duration = Date.now() - start;
      console.log(`  withHttpTelemetry overhead: ${duration}ms`);
    }
  }
  
  // Simulate the actual service call (14ms as reported)
  async function simulateServiceCall() {
    await new Promise(resolve => setTimeout(resolve, 14));
    return { success: true };
  }
  
  // Test the full chain
  const totalStart = Date.now();
  
  await withTelemetrySimulation(async () => {
    // Simulate JSON parsing
    const parseStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms for JSON parsing
    console.log(`  JSON parsing: ${Date.now() - parseStart}ms`);
    
    // Simulate the service call with HTTP telemetry
    return await withHttpTelemetrySimulation(async () => {
      return await simulateServiceCall();
    }, 'createBulkPortfolios');
  }, 'create_bulk_portfolios');
  
  const totalTime = Date.now() - totalStart;
  console.log(`📊 Total simulated time: ${totalTime}ms`);
  console.log(`📊 Expected overhead: ~20ms, Actual overhead in production: ~5000ms`);
  console.log(`📊 Missing time: ~${5000 - totalTime}ms - This suggests a blocking operation!`);
}

// Test for potential blocking operations
async function testBlockingOperations() {
  console.log('\n🔍 Testing for potential blocking operations...');
  
  // Test setTimeout delays
  console.log('Testing setTimeout(100ms)...');
  const start1 = Date.now();
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`  Actual delay: ${Date.now() - start1}ms`);
  
  // Test setTimeout delays (1000ms)
  console.log('Testing setTimeout(1000ms)...');
  const start2 = Date.now();
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`  Actual delay: ${Date.now() - start2}ms`);
  
  // Test multiple small delays
  console.log('Testing 50 x 100ms delays...');
  const start3 = Date.now();
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log(`  Total delay: ${Date.now() - start3}ms`);
}

async function main() {
  console.log('🚀 Testing telemetry overhead in isolation...\n');
  
  await measureTelemetryOverhead();
  await testBlockingOperations();
  
  console.log('\n💡 Recommendations:');
  console.log('1. Check for setTimeout calls with large delays in telemetry code');
  console.log('2. Look for synchronous blocking operations');
  console.log('3. Check if telemetry collector is responding slowly');
  console.log('4. Verify no retry loops are causing delays');
  console.log('5. Check for DNS resolution issues in container environment');
}

main().catch(console.error);