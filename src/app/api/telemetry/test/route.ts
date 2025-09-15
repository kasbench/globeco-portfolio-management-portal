import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@opentelemetry/api';
import { initializeTelemetry } from '@/lib/telemetry';

export async function GET(request: NextRequest) {
  try {
    // Ensure telemetry is initialized before creating metrics
    const telemetryInitialized = initializeTelemetry();
    // console.log(`🔧 TEST ENDPOINT: Telemetry initialized: ${telemetryInitialized}`);
    
    // Get meter and create test metrics
    const meter = metrics.getMeter('test-endpoint', '1.0.0');
    
    // Create and increment a counter
    const testCounter = meter.createCounter('test_endpoint_calls', {
      description: 'Number of calls to the test endpoint'
    });
    testCounter.add(1, { 
      endpoint: '/api/telemetry/test',
      method: 'GET',
      timestamp: Date.now().toString()
    });
    
    // Create and record a histogram
    const testHistogram = meter.createHistogram('test_endpoint_duration', {
      description: 'Duration of test endpoint calls'
    });
    testHistogram.record(Math.random() * 100, {
      endpoint: '/api/telemetry/test',
      method: 'GET'
    });
    
    // console.log('🧪 TELEMETRY TEST: Test metrics recorded');
    
    return NextResponse.json({
      success: true,
      message: 'Test metrics recorded successfully',
      timestamp: new Date().toISOString(),
      metrics: {
        counter: 'test_endpoint_calls',
        histogram: 'test_endpoint_duration'
      }
    });
    
  } catch (error) {
    console.error('❌ TELEMETRY TEST: Failed to record metrics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}