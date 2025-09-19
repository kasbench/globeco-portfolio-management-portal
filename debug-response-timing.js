#!/usr/bin/env node

/**
 * Debug script to isolate where the 5-second delay is occurring
 * Tests different layers of the request/response cycle
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://globeco.local';
const DIRECT_SERVICE_URL = process.env.DIRECT_SERVICE_URL || 'http://globeco-portfolio-service:8000';

// Test payload
const testPayload = [
  {
    name: `Test Portfolio ${Date.now()}`,
    version: 1
  }
];

async function measureRequestTiming(url, data, label) {
  console.log(`\n🔍 Testing ${label}...`);
  
  const start = performance.now();
  let dnsTime, connectTime, tlsTime, firstByteTime, downloadTime;
  
  try {
    const response = await axios.post(url, data, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0'
      },
      timeout: 30000,
      // Track timing information
      transformResponse: [(data) => {
        downloadTime = performance.now();
        return data;
      }]
    });
    
    const totalTime = performance.now() - start;
    
    console.log(`✅ ${label} completed:`);
    console.log(`   Total time: ${totalTime.toFixed(1)}ms`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response size: ${JSON.stringify(response.data).length} bytes`);
    
    // Check for performance headers
    const perfHeaders = {};
    Object.keys(response.headers).forEach(key => {
      if (key.toLowerCase().startsWith('x-performance') || 
          key.toLowerCase().startsWith('x-response-time') ||
          key.toLowerCase().includes('time')) {
        perfHeaders[key] = response.headers[key];
      }
    });
    
    if (Object.keys(perfHeaders).length > 0) {
      console.log(`   Performance headers:`, perfHeaders);
    }
    
    return {
      success: true,
      totalTime,
      status: response.status,
      headers: response.headers,
      dataSize: JSON.stringify(response.data).length
    };
    
  } catch (error) {
    const totalTime = performance.now() - start;
    console.log(`❌ ${label} failed after ${totalTime.toFixed(1)}ms:`);
    console.log(`   Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    
    return {
      success: false,
      totalTime,
      error: error.message,
      status: error.response?.status
    };
  }
}

async function testStreamingResponse() {
  console.log(`\n🔍 Testing streaming response behavior...`);
  
  const start = performance.now();
  let firstByteTime = null;
  let chunks = [];
  
  try {
    const response = await axios.post(`${BASE_URL}/api/portfolios/bulk`, testPayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: 30000
    });
    
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        if (firstByteTime === null) {
          firstByteTime = performance.now() - start;
          console.log(`   First byte received: ${firstByteTime.toFixed(1)}ms`);
        }
        chunks.push(chunk);
      });
      
      response.data.on('end', () => {
        const totalTime = performance.now() - start;
        const fullResponse = Buffer.concat(chunks).toString();
        
        console.log(`✅ Streaming test completed:`);
        console.log(`   Time to first byte: ${firstByteTime?.toFixed(1) || 'N/A'}ms`);
        console.log(`   Total time: ${totalTime.toFixed(1)}ms`);
        console.log(`   Response size: ${fullResponse.length} bytes`);
        
        resolve({
          success: true,
          firstByteTime,
          totalTime,
          responseSize: fullResponse.length
        });
      });
      
      response.data.on('error', (error) => {
        const totalTime = performance.now() - start;
        console.log(`❌ Streaming test failed after ${totalTime.toFixed(1)}ms: ${error.message}`);
        reject(error);
      });
    });
    
  } catch (error) {
    const totalTime = performance.now() - start;
    console.log(`❌ Streaming test failed after ${totalTime.toFixed(1)}ms: ${error.message}`);
    return {
      success: false,
      totalTime,
      error: error.message
    };
  }
}

async function testMultipleRequests() {
  console.log(`\n🔍 Testing multiple concurrent requests...`);
  
  const promises = [];
  const startTime = performance.now();
  
  // Send 3 concurrent requests
  for (let i = 0; i < 3; i++) {
    const payload = [{
      name: `Concurrent Test Portfolio ${i} ${Date.now()}`,
      version: 1
    }];
    
    promises.push(measureRequestTiming(`${BASE_URL}/api/portfolios/bulk`, payload, `Concurrent Request ${i + 1}`));
  }
  
  const results = await Promise.all(promises);
  const totalTime = performance.now() - startTime;
  
  console.log(`\n📊 Concurrent test summary:`);
  console.log(`   Total time for all requests: ${totalTime.toFixed(1)}ms`);
  results.forEach((result, i) => {
    console.log(`   Request ${i + 1}: ${result.success ? result.totalTime.toFixed(1) + 'ms' : 'FAILED'}`);
  });
  
  return results;
}

async function main() {
  console.log('🚀 Starting response timing analysis...');
  console.log(`Portal URL: ${BASE_URL}`);
  console.log(`Direct Service URL: ${DIRECT_SERVICE_URL}`);
  
  try {
    // Test 1: Standard request
    const standardResult = await measureRequestTiming(
      `${BASE_URL}/api/portfolios/bulk`, 
      testPayload, 
      'Standard Request'
    );
    
    // Test 2: Streaming response
    const streamingResult = await testStreamingResponse();
    
    // Test 3: Multiple concurrent requests
    const concurrentResults = await testMultipleRequests();
    
    // Test 4: Direct service call (if accessible)
    try {
      const directResult = await measureRequestTiming(
        `${DIRECT_SERVICE_URL}/api/v2/portfolios`, 
        testPayload, 
        'Direct Service Call'
      );
      
      if (standardResult.success && directResult.success) {
        const overhead = standardResult.totalTime - directResult.totalTime;
        console.log(`\n📊 Performance Comparison:`);
        console.log(`   Direct service: ${directResult.totalTime.toFixed(1)}ms`);
        console.log(`   Portal API: ${standardResult.totalTime.toFixed(1)}ms`);
        console.log(`   Infrastructure overhead: ${overhead.toFixed(1)}ms`);
      }
    } catch (error) {
      console.log(`\n⚠️  Could not test direct service call: ${error.message}`);
    }
    
    // Analysis
    console.log(`\n🔍 Analysis:`);
    if (streamingResult.success && streamingResult.firstByteTime) {
      if (streamingResult.firstByteTime > 1000) {
        console.log(`   ⚠️  High time to first byte (${streamingResult.firstByteTime.toFixed(1)}ms) suggests server-side delay`);
      } else {
        console.log(`   ✅ Time to first byte is reasonable (${streamingResult.firstByteTime.toFixed(1)}ms)`);
      }
      
      const downloadTime = streamingResult.totalTime - streamingResult.firstByteTime;
      if (downloadTime > 1000) {
        console.log(`   ⚠️  High download time (${downloadTime.toFixed(1)}ms) suggests network/streaming issues`);
      } else {
        console.log(`   ✅ Download time is reasonable (${downloadTime.toFixed(1)}ms)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);