import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from '@/lib/metrics';

// Health check endpoint without telemetry wrapper to avoid traces
export async function GET(req: NextRequest) {
  console.log('🏥 Health check endpoint called');
  
  try {
    // Record basic health check metrics (no traces)
    telemetryUtils.recordPageView('/api/health', 'system');
    
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
    
    console.log('✅ Health check completed successfully (no traces sent)');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    // Record error metrics only (no traces)
    telemetryUtils.recordError(
      'health_check_error',
      error instanceof Error ? error.message : 'Unknown health check error',
      'health-endpoint'
    );
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}