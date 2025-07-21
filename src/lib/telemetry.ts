// Minimal telemetry setup to avoid console flooding

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { telemetryConfig } from './telemetry-config';

// Only initialize once on server side
let isInitialized = false;

if (typeof window === 'undefined' && !isInitialized) {
  isInitialized = true;
  
  const init = async () => {
    try {
      // Minimal setup - only essential configuration
      const collectorBaseUrl = telemetryConfig.collectorBaseUrl;
      
      // Set essential environment variables
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = collectorBaseUrl;
      process.env.OTEL_SERVICE_NAME = telemetryConfig.serviceName;
      process.env.OTEL_SERVICE_VERSION = telemetryConfig.serviceVersion;
      process.env.OTEL_RESOURCE_ATTRIBUTES = [
        `service.name=${telemetryConfig.serviceName}`,
        `service.version=${telemetryConfig.serviceVersion}`,
        `deployment.environment=${process.env.NODE_ENV || 'development'}`,
        `service.namespace=globeco`,
      ].join(',');

      // Create metric exporter and reader
      const metricExporter = new OTLPMetricExporter({
        url: `${collectorBaseUrl}/v1/metrics`,
        headers: {},
      });
      
      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: telemetryConfig.metricExportInterval,
        exportTimeoutMillis: 5000,
      });
      
      // Initialize SDK with minimal configuration
      const sdk = new NodeSDK({
        instrumentations: [], // No auto-instrumentations to avoid issues
        metricReader,
      });
      
      // Start SDK
      await sdk.start();
      
      // Only log success if debug is enabled
      if (process.env.OTEL_DEBUG === 'true') {
        console.log('✅ OpenTelemetry initialized');
      }

      // Set startup time for metrics initialization
      process.env.TELEMETRY_STARTUP_TIME = Date.now().toString();

      // Graceful shutdown
      process.on('SIGTERM', () => {
        sdk.shutdown().finally(() => process.exit(0));
      });

    } catch (error) {
      // Only log errors, don't flood console
      console.error('❌ OpenTelemetry initialization failed:', error);
    }
  };

  init();
}