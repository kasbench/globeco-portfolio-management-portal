import { NextResponse } from 'next/server';

export async function GET() {
  // Get all OTEL environment variables
  const otelVars = Object.keys(process.env)
    .filter(key => key.startsWith('OTEL_'))
    .reduce((acc, key) => {
      acc[key] = process.env[key];
      return acc;
    }, {} as Record<string, string | undefined>);

  return NextResponse.json({
    message: 'Environment variables debug info',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    otelVariables: otelVars,
    totalOtelVars: Object.keys(otelVars).length,
    keyMetricVars: {
      OTEL_METRICS_EXPORTER: process.env.OTEL_METRICS_EXPORTER || 'NOT SET',
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'NOT SET',
      OTEL_METRIC_EXPORT_INTERVAL: process.env.OTEL_METRIC_EXPORT_INTERVAL || 'NOT SET',
      OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'NOT SET',
    }
  });
}