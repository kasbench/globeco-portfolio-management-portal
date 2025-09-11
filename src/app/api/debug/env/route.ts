import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      NODE_IP: process.env.NODE_IP,
      OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
      OTEL_DEBUG: process.env.OTEL_DEBUG,
      OTEL_LOG_LEVEL: process.env.OTEL_LOG_LEVEL,
      OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    return NextResponse.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}