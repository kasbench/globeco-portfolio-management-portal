import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@opentelemetry/api';

export async function GET(req: NextRequest) {
  console.log('🧪 DEBUG: Direct metrics test endpoint called');
  
  try {
    console.log('🧪 DEBUG: Testing direct OpenTelemetry API...');
    
    // Test direct OpenTelemetry API
    const meterProvider = metrics.getMeterProvider();
    console.log('📊 MeterProvider type:', meterProvider.constructor.name);
    
    const directMeter = metrics.getMeter('direct-test', '1.0.0');
    console.log('📊 Direct meter created, type:', typeof directMeter);
    
    const directCounter = directMeter.createCounter('direct_test_counter', {
      description: 'Direct test counter to verify OpenTelemetry API'
    });
    console.log('📊 Direct counter created, type:', typeof directCounter);
    
    // Record multiple values to make sure it shows up
    for (let i = 0; i < 5; i++) {
      directCounter.add(1, { 
        test: 'direct_api',
        iteration: i.toString(),
        timestamp: Date.now().toString()
      });
    }
    console.log('✅ Direct counter values recorded (5 increments)');
    
    // Also test histogram
    const directHistogram = directMeter.createHistogram('direct_test_histogram', {
      description: 'Direct test histogram'
    });
    
    for (let i = 0; i < 3; i++) {
      directHistogram.record(Math.random() * 1000, {
        test: 'direct_histogram',
        iteration: i.toString()
      });
    }
    console.log('✅ Direct histogram values recorded (3 values)');
    
    return NextResponse.json({
      message: 'Direct metrics test completed',
      timestamp: new Date().toISOString(),
      status: 'success',
      meterProvider: meterProvider.constructor.name,
      metricsRecorded: {
        counter: 5,
        histogram: 3
      },
      note: 'Check Prometheus for direct_test_counter_total and direct_test_histogram metrics'
    });
    
  } catch (error) {
    console.error('🧪 DEBUG: Error in direct metrics test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      message: 'Direct metrics test failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
}