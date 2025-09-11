// Telemetry configuration with debugging support
export const telemetryConfig = {
  // Collector endpoints
  collectorBaseUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
    'http://otel-collector-daemonset-collector.monitoring.svc.cluster.local:4318',
  
  // Service identification
  serviceName: process.env.OTEL_SERVICE_NAME || 'globeco-portfolio-management-portal',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '0.1.0',
  
  // Debug settings - only enable if explicitly set to true
  debugMode: process.env.OTEL_DEBUG === 'true',
  logLevel: process.env.OTEL_LOG_LEVEL || 'debug',
  
  // Export settings
  metricExportInterval: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || '2000'), // Reduced to 2 seconds for faster testing
  traceExportTimeout: parseInt(process.env.OTEL_TRACE_EXPORT_TIMEOUT || '30000'),
  
  // Feature flags
  enableAutoInstrumentation: process.env.OTEL_ENABLE_AUTO_INSTRUMENTATION !== 'false',
  enableCustomMetrics: process.env.OTEL_ENABLE_CUSTOM_METRICS !== 'false',
  enableCustomTracing: process.env.OTEL_ENABLE_CUSTOM_TRACING !== 'false',
};

export const logTelemetryConfig = () => {
  // Telemetry configuration logging disabled for cleaner output
  console.log(`   Collector URL: ${telemetryConfig.collectorBaseUrl}`);
  console.log(`   Debug Mode: ${telemetryConfig.debugMode}`);
  console.log(`   Log Level: ${telemetryConfig.logLevel}`);
  console.log(`   Metric Export Interval: ${telemetryConfig.metricExportInterval}ms`);
  console.log(`   Auto Instrumentation: ${telemetryConfig.enableAutoInstrumentation}`);
  console.log(`   Custom Metrics: ${telemetryConfig.enableCustomMetrics}`);
  console.log(`   Custom Tracing: ${telemetryConfig.enableCustomTracing}`);
};