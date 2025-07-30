import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';
import { withStructuredLogging, logApiOperation, logServiceOperation, createSuccessResponse, createErrorResponse } from '@/lib/apiLogger';

// Health check endpoint with structured logging
export const GET = withStructuredLogging(async (req: NextRequest, context) => {
  logApiOperation('Health check requested', context);
  
  try {
    // Record basic health check metrics (no traces)
    telemetryUtils.recordPageView('/api/health', 'system');
    
    logServiceOperation('Performing health checks', context, 'health_check');
    
    // Simulate some health checks
    const checks = [
      { name: 'database', status: 'healthy', duration: Math.random() * 50 + 10 },
      { name: 'external_api', status: 'healthy', duration: Math.random() * 100 + 20 },
      { name: 'cache', status: 'healthy', duration: Math.random() * 30 + 5 },
    ];
    
    // Record database operation metrics for each check (no traces)
    checks.forEach(check => {
      telemetryUtils.recordDbOperation(
        'health_check',
        check.name,
        check.duration,
        check.status === 'healthy'
      );
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
        traces_filtered: 'Health check traces are filtered out from Jaeger',
      },
    };
    
    logServiceOperation('Health checks completed successfully', context, 'health_check', {
      checks_count: checks.length,
      all_healthy: checks.every(c => c.status === 'healthy')
    });
    
    logApiOperation('Health check completed successfully', context);
    
    return createSuccessResponse(response, context);
    
  } catch (error) {
    // Record error metrics only (no traces)
    telemetryUtils.recordError(
      'health_check_error',
      error instanceof Error ? error.message : 'Unknown health check error',
      'health-endpoint'
    );
    
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      context,
      { operation: 'health_check' }
    );
  }
}, 'health_check');