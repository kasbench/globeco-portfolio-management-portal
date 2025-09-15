import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    const metricsUrl = `${collectorUrl}/v1/metrics`;
    
    // console.log(`🔍 COLLECTOR TEST: Testing connectivity to ${metricsUrl}`);
    
    // Test basic connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(metricsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
        },
        body: new Uint8Array(0), // Empty protobuf body
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({
        success: true,
        collectorUrl,
        metricsUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      return NextResponse.json({
        success: false,
        collectorUrl,
        metricsUrl,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        errorType: fetchError instanceof Error ? fetchError.name : 'Unknown',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}