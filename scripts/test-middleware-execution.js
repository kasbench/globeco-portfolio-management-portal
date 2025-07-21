#!/usr/bin/env node

console.log('🧪 TESTING MIDDLEWARE AND API EXECUTION');
console.log('======================================\n');

// This script will help identify if the middleware is running at all

const http = require('http');
const { spawn } = require('child_process');

// Function to make HTTP request
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing if Next.js server is running...');
  
  try {
    // Test basic page
    console.log('1. Testing root page...');
    const rootResponse = await makeRequest(`${baseUrl}/`);
    console.log(`   ✅ Root page: ${rootResponse.status}`);
    console.log(`   📊 Response time header: ${rootResponse.headers['x-response-time'] || 'not set'}`);
    
    // Test API health endpoint
    console.log('2. Testing health API...');
    const healthResponse = await makeRequest(`${baseUrl}/api/health`);
    console.log(`   ✅ Health API: ${healthResponse.status}`);
    console.log(`   📊 Response time header: ${healthResponse.headers['x-response-time'] || 'not set'}`);
    
    // Test telemetry test endpoint
    console.log('3. Testing telemetry test API...');
    const telemetryResponse = await makeRequest(`${baseUrl}/api/telemetry/test`);
    console.log(`   ✅ Telemetry test API: ${telemetryResponse.status}`);
    console.log(`   📊 Response time header: ${telemetryResponse.headers['x-response-time'] || 'not set'}`);
    
    console.log('\n🎉 All endpoints responded successfully!');
    console.log('📝 Check your Next.js server console for:');
    console.log('   - Middleware console messages (🌐 Middleware:...)');
    console.log('   - Telemetry console messages (📊 Recording...)');
    console.log('   - API handler messages (🧪 Test telemetry endpoint called)');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    console.log('\n🚨 Next.js server might not be running!');
    console.log('💡 Start the server with: npm run dev');
    console.log('   Then run this test again to verify middleware execution');
  }
}

// Run the test
testEndpoints();