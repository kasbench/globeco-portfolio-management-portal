import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { telemetryUtils, customTracing } from '@/lib/metrics';

export const GET = withTelemetry(async (req: NextRequest) => {
  console.log('🧪 Test telemetry endpoint called');
  
  // Create a custom span for testing
  const span = customTracing.createSpan('test-operation', {
    'test.type': 'manual',
    'test.endpoint': '/api/telemetry/test',
  });
  
  // Record some test metrics
  telemetryUtils.recordPageView('/api/telemetry/test', 'test-user');
  telemetryUtils.recordError('test_error', 'This is a test error', 'test-context');
  telemetryUtils.recordDbOperation('SELECT', 'test_table', 150, true);
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  span.end();
  
  console.log('✅ Test telemetry data recorded');
  
  return NextResponse.json({
    message: 'Telemetry test completed',
    timestamp: new Date().toISOString(),
    service: process.env.OTEL_SERVICE_NAME || 'globeco-portfolio-management-portal',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
}, 'telemetry_test');