// Simple, straightforward telemetry setup

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { telemetryConfig } from './telemetry-config';

// Global state
let isInitialized = false;

console.log('🔧 TELEMETRY: Starting initialization process...');

// Simple initialization function
export const initializeTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    console.log('🔧 TELEMETRY: Already initialized or running in browser, skipping');
    return isInitialized;
  }

  try {
    console.log('🚀 TELEMETRY: Initializing OpenTelemetry SDK...');
    console.log(`🔧 TELEMETRY: Collector URL: ${telemetryConfig.collectorBaseUrl}`);
    console.log(`🔧 TELEMETRY: Service Name: ${telemetryConfig.serviceName}`);
    
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
    
    console.log('✅ TELEMETRY: OpenTelemetry SDK initialized successfully');
    console.log('✅ TELEMETRY: Metrics will be exported every 10 seconds');

    return true;

  } catch (error) {
    console.error('❌ TELEMETRY: Initialization failed:', error);
    isInitialized = false;
    return false;
  }
};

// Initialize immediately
const success = initializeTelemetry();
console.log(`🔧 TELEMETRY: Initialization result: ${success ? 'SUCCESS' : 'FAILED'}`);

export { isInitialized };