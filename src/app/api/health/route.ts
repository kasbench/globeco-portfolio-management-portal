import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { telemetryUtils, customTracing } from '@/lib/metrics';

export const GET = withTelemetry(async (req: NextRequest) => {
  console.log('🏥 Health check endpoint called');
  
  // Create a custom span for the health check
  const span = customTracing.createSpan('health-check', {
    'health.check': true,
    'health.timestamp': Date.now(),
  });
  
  try {
    // Record health check metrics
    telemetryUtils.recordPageView('/api/health', 'system');
    
    // Simulate some health checks
    const checks = [
      { name: 'database', status: 'healthy', duration: Math.random() * 50 + 10 },
      { name: 'external_api', status: 'healthy', duration: Math.random() * 100 + 20 },
      { name: 'cache', status: 'healthy', duration: Math.random() * 30 + 5 },
    ];
    
    // Record database operation metrics for each check
    checks.forEach(check => {
      telemetryUtils.recordDbOperation(
        'health_check',
        check.name,
        check.duration,
        check.status === 'healthy'
      );
    });
    
    // Add health check attributes to span
    span.setAttributes({
      'health.checks.total': checks.length,
      'health.checks.healthy': checks.filter(c => c.status === 'healthy').length,
    });
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'globeco-portfolio-management-portal',
      version: '0.1.0',
      checks,
      telemetry: {
        service_name: process.env.OTEL_SERVICE_NAME,
        collector_endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        debug_mode: process.env.OTEL_DEBUG === 'true',
      },
    };
    
    console.log('✅ Health check completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    // Record error
    telemetryUtils.recordError(
      'health_check_error',
      error instanceof Error ? error.message : 'Unknown health check error',
      'health-endpoint'
    );
    
    span.setAttributes({
      'health.error': true,
      'health.error.message': error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
    
  } finally {
    span.end();
  }
}, 'health_check');