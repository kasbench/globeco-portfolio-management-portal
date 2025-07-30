// Simple, straightforward telemetry setup
// Import log filter first to suppress verbose OpenTelemetry output
import './logFilter';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { telemetryConfig } from './telemetry-config';

// Global state
let isInitialized = false;

// Telemetry initialization

// Simple initialization function
export const initializeTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    return isInitialized;
  }

  try {
    // Set OpenTelemetry diagnostic logging to ERROR level only to suppress verbose output
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    
    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${telemetryConfig.collectorBaseUrl}/v1/metrics`,
      headers: {},
    });
    
    // Create metric reader
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000, // Export every 10 seconds
      exportTimeoutMillis: 5000,
    });
    
    // Initialize SDK
    const sdk = new NodeSDK({
      instrumentations: [],
      metricReader,
    });
    
    // Start SDK synchronously
    sdk.start();
    isInitialized = true;
    return true;

  } catch (error) {
    console.error('❌ TELEMETRY: Initialization failed:', error);
    isInitialized = false;
    return false;
  }
};

// Initialize immediately
initializeTelemetry();

export { isInitialized };