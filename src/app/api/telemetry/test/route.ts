import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';

// Test telemetry endpoint without telemetry wrapper to avoid traces
export async function GET(req: NextRequest) {
  console.log('🧪 Test telemetry endpoint called (no traces will be generated)');
  
  // Record some test metrics (but no traces)
  telemetryUtils.recordPageView('/api/telemetry/test', 'test-user');
  telemetryUtils.recordError('test_error', 'This is a test error', 'test-context');
  telemetryUtils.recordDbOperation('SELECT', 'test_table', 150, true);
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('✅ Test telemetry data recorded (metrics only, no traces)');
  
  return NextResponse.json({
    message: 'Telemetry test completed (metrics only)',
    timestamp: new Date().toISOString(),
    service: process.env.OTEL_SERVICE_NAME || 'globeco-portfolio-management-portal',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    traces_disabled: 'This endpoint does not generate traces',
  });
}