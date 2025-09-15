import { NextRequest, NextResponse } from 'next/server';
import { metrics, trace } from '@opentelemetry/api';

export async function GET(req: NextRequest) {
  // console.log('🔍 DEBUG: Telemetry status check endpoint called (no traces will be generated)');
  
  try {
    // Check global providers
    const meterProvider = metrics.getMeterProvider();
    const tracerProvider = trace.getTracerProvider();
    
    // console.log('📊 MeterProvider type:', meterProvider.constructor.name);
    // console.log('🔍 TracerProvider type:', tracerProvider.constructor.name);
    
    // Test creating a meter
    const testMeter = metrics.getMeter('debug-status-test', '1.0.0');
    // console.log('📊 Test meter created, type:', typeof testMeter);
    
    // Test creating a counter
    const testCounter = testMeter.createCounter('debug_status_counter', {
      description: 'Debug status test counter'
    });
    // console.log('📊 Test counter created, type:', typeof testCounter);
    
    // Test recording a value
    testCounter.add(1, { debug: 'status_check', timestamp: Date.now().toString() });
    // console.log('✅ Test counter value recorded');
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      telemetry: {
        meterProvider: meterProvider.constructor.name,
        tracerProvider: tracerProvider.constructor.name,
        meterType: typeof testMeter,
        counterType: typeof testCounter,
        globalProvidersWorking: true
      },
      message: 'Telemetry status check completed successfully'
    });
    
  } catch (error) {
    console.error('❌ DEBUG: Error in telemetry status check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({
      status: 'error',
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      message: 'Telemetry status check failed'
    }, { status: 500 });
  }
}