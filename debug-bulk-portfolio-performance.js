#!/usr/bin/env node

/**
 * Debug script to isolate performance issues with POST /api/portfolios/bulk
 * This script will test different parts of the request flow to identify bottlenecks
 */

const axios = require('axios');

// Configuration
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'http://localhost:3000';
const PORTFOLIO_SERVICE_URL = process.env.PORTFOLIO_SERVICE_URL || 'http://globeco-portfolio-service:8000';

// Test data
const testPortfolios = [
  {
    name: `Test Portfolio ${Date.now()}`,
    version: 1
  }
];

async function measureTime(label, operation) {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    console.log(`✅ ${label}: ${duration}ms`);
    return { success: true, duration, result };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${label}: ${duration}ms - Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testDirectPortfolioService() {
  console.log('\n🔍 Testing direct portfolio service call...');
  
  return await measureTime('Direct service call', async () => {
    const response = await axios.post(`${PORTFOLIO_SERVICE_URL}/api/v2/portfolios`, testPortfolios, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  });
}

async function testPortalAPI() {
  console.log('\n🔍 Testing portal API call...');
  
  return await measureTime('Portal API call', async () => {
    const response = await axios.post(`${PORTAL_BASE_URL}/api/portfolios/bulk`, testPortfolios, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  });
}

async function testJSONParsing() {
  console.log('\n🔍 Testing JSON parsing performance...');
  
  const largePayload = Array(100).fill(0).map((_, i) => ({
    name: `Test Portfolio ${i} ${Date.now()}`,
    version: 1
  }));
  
  return await measureTime('JSON stringify/parse', async () => {
    const jsonString = JSON.stringify(largePayload);
    const parsed = JSON.parse(jsonString);
    return parsed;
  });
}

async function testNetworkLatency() {
  console.log('\n🔍 Testing network latency...');
  
  // Test portal health check
  const portalLatency = await measureTime('Portal health check', async () => {
    const response = await axios.get(`${PORTAL_BASE_URL}/api/health`, { timeout: 5000 });
    return response.data;
  });
  
  // Test service health check  
  const serviceLatency = await measureTime('Service health check', async () => {
    const response = await axios.get(`${PORTFOLIO_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data;
  });
  
  return { portalLatency, serviceLatency };
}

async function main() {
  console.log('🚀 Starting bulk portfolio performance debugging...');
  console.log(`Portal URL: ${PORTAL_BASE_URL}`);
  console.log(`Service URL: ${PORTFOLIO_SERVICE_URL}`);
  
  try {
    // Test network latency first
    await testNetworkLatency();
    
    // Test JSON parsing performance
    await testJSONParsing();
    
    // Test direct service call
    const directResult = await testDirectPortfolioService();
    
    // Test portal API call
    const portalResult = await testPortalAPI();
    
    // Compare results
    if (directResult.success && portalResult.success) {
      const overhead = portalResult.duration - directResult.duration;
      console.log(`\n📊 Performance Analysis:`);
      console.log(`   Direct service: ${directResult.duration}ms`);
      console.log(`   Portal API: ${portalResult.duration}ms`);
      console.log(`   Overhead: ${overhead}ms (${((overhead / directResult.duration) * 100).toFixed(1)}% increase)`);
      
      if (overhead > 1000) {
        console.log(`\n⚠️  WARNING: Significant overhead detected (${overhead}ms)`);
        console.log(`   This suggests there may be:`)
        console.log(`   - Telemetry/tracing delays`);
        console.log(`   - Request parsing issues`);
        console.log(`   - Network connectivity problems`);
        console.log(`   - Middleware processing delays`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Debug script interrupted');
  process.exit(0);
});

main().catch(console.error);