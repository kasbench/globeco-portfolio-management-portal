import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('🔍 Collector connectivity debug endpoint called');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
      OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    },
    connectivity: [] as any[],
  };

  // Test both ports and various endpoints
  const testEndpoints = [
    'http://otel-collector-collector.monitoring.svc.cluster.local:4317',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4318',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4317/v1/traces',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/traces',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4317/v1/metrics',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/metrics',
  ];

  for (const endpoint of testEndpoints) {
    console.log(`🧪 Testing connectivity to: ${endpoint}`);
    
    const testResult = {
      endpoint,
      method: 'GET',
      success: false,
      status: null as number | null,
      statusText: '',
      error: null as string | null,
      responseTime: 0,
      headers: {} as Record<string, string>,
    };

    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'globeco-portfolio-management-portal/debug',
        },
      });
      
      clearTimeout(timeoutId);
      testResult.responseTime = Date.now() - startTime;
      testResult.status = response.status;
      testResult.statusText = response.statusText;
      testResult.success = response.status < 500; // Consider 4xx as "successful connection"
      
      // Collect response headers
      response.headers.forEach((value, key) => {
        testResult.headers[key] = value;
      });
      
      console.log(`✅ ${endpoint}: ${response.status} ${response.statusText} (${testResult.responseTime}ms)`);
      
    } catch (error) {
      testResult.responseTime = Date.now() - startTime;
      testResult.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${endpoint}: ${testResult.error} (${testResult.responseTime}ms)`);
    }
    
    results.connectivity.push(testResult);
  }

  // Test POST requests to the OTLP endpoints
  const postEndpoints = [
    'http://otel-collector-collector.monitoring.svc.cluster.local:4317/v1/traces',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/traces',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4317/v1/metrics',
    'http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/metrics',
  ];

  for (const endpoint of postEndpoints) {
    console.log(`🧪 Testing POST to: ${endpoint}`);
    
    const testResult = {
      endpoint,
      method: 'POST',
      success: false,
      status: null as number | null,
      statusText: '',
      error: null as string | null,
      responseTime: 0,
      headers: {} as Record<string, string>,
    };

    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Send a minimal test payload
      const testPayload = endpoint.includes('traces') ? {
        resourceSpans: []
      } : {
        resourceMetrics: []
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'globeco-portfolio-management-portal/debug',
        },
        body: JSON.stringify(testPayload),
      });
      
      clearTimeout(timeoutId);
      testResult.responseTime = Date.now() - startTime;
      testResult.status = response.status;
      testResult.statusText = response.statusText;
      testResult.success = response.status < 500;
      
      // Collect response headers
      response.headers.forEach((value, key) => {
        testResult.headers[key] = value;
      });
      
      console.log(`✅ POST ${endpoint}: ${response.status} ${response.statusText} (${testResult.responseTime}ms)`);
      
    } catch (error) {
      testResult.responseTime = Date.now() - startTime;
      testResult.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ POST ${endpoint}: ${testResult.error} (${testResult.responseTime}ms)`);
    }
    
    results.connectivity.push(testResult);
  }

  // Summary
  const successful = results.connectivity.filter(r => r.success).length;
  const total = results.connectivity.length;
  
  console.log(`📊 Connectivity test summary: ${successful}/${total} successful`);
  
  return NextResponse.json({
    ...results,
    summary: {
      total,
      successful,
      failed: total - successful,
      successRate: `${Math.round((successful / total) * 100)}%`,
    },
  });
}