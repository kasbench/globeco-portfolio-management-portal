import { NextRequest, NextResponse } from 'next/server';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

export async function GET(request: NextRequest) {
  try {
    const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    const metricsUrl = `${collectorUrl}/v1/metrics`;
    
    // console.log(`🔍 DIRECT METRICS TEST: Testing direct export to ${metricsUrl}`);
    
    // Create a direct exporter
    const exporter = new OTLPMetricExporter({
      url: metricsUrl,
      headers: {},
    });
    
    // Create a simple metric data structure
    const testMetricData = {
      resourceMetrics: [{
        resource: {
          attributes: [{
            key: 'service.name',
            value: { stringValue: 'globeco-portfolio-management-portal' }
          }]
        },
        scopeMetrics: [{
          scope: {
            name: 'direct-test',
            version: '1.0.0'
          },
          metrics: [{
            name: 'direct_test_counter',
            description: 'Direct test counter',
            unit: '1',
            sum: {
              dataPoints: [{
                attributes: [{
                  key: 'test',
                  value: { stringValue: 'direct' }
                }],
                value: 1,
                timeUnixNano: Date.now() * 1000000
              }],
              aggregationTemporality: 2, // CUMULATIVE
              isMonotonic: true
            }
          }]
        }]
      }]
    };
    
    // Try to export directly
    return new Promise<NextResponse>((resolve) => {
      exporter.export(testMetricData as any, (result) => {
        // console.log(`🔍 DIRECT METRICS TEST: Export result:`, result);
        
        resolve(NextResponse.json({
          success: result.code === 0,
          collectorUrl,
          metricsUrl,
          exportResult: {
            code: result.code,
            error: result.error
          },
          timestamp: new Date().toISOString()
        }));
      });
    });
    
  } catch (error) {
    console.error('❌ DIRECT METRICS TEST: Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}