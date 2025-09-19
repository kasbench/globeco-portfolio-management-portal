// Simple, straightforward telemetry setup
// Import log filter first to suppress verbose OpenTelemetry output
import './logFilter';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { metrics, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { telemetryConfig } from './telemetry-config';

// Global state
let isInitialized = false;
let sdk: NodeSDK | null = null;

// Simple initialization function
export const initializeTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    return isInitialized;
  }

  try {
    // console.log('🚀 TELEMETRY: Starting OpenTelemetry initialization...');
    // console.log(`🔧 TELEMETRY: Service Name: ${telemetryConfig.serviceName}`);
    // console.log(`🔧 TELEMETRY: Collector URL: ${telemetryConfig.collectorBaseUrl}`);
    // console.log(`🔧 TELEMETRY: Export Interval: ${telemetryConfig.metricExportInterval}ms`);
    
    // Set OpenTelemetry diagnostic logging to ERROR level for production
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    
    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${telemetryConfig.collectorBaseUrl}/v1/metrics`,
      headers: {},
    });
    
    // console.log(`🔧 TELEMETRY: Metric exporter configured for: ${telemetryConfig.collectorBaseUrl}/v1/metrics`);
    
    // Create metric reader
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: telemetryConfig.metricExportInterval,
      exportTimeoutMillis: Math.min(telemetryConfig.metricExportInterval - 500, 3000),
    });
    
    // Initialize SDK with minimal configuration to avoid version conflicts
    sdk = new NodeSDK({
      serviceName: telemetryConfig.serviceName,
      metricReader,
    });
    
    // Start the SDK
    sdk.start();
    // console.log('✅ TELEMETRY: OpenTelemetry SDK started successfully!');
    
    // Create test metrics to verify the system works
    const testMeter = metrics.getMeter('test', '1.0.0');
    const testCounter = testMeter.createCounter('initialization_counter', {
      description: 'Counter to verify telemetry initialization'
    });
    testCounter.add(1, { 
      component: 'telemetry-init',
      timestamp: Date.now().toString()
    });
    // console.log('🧪 TELEMETRY: Test metric recorded');
    
    // Force an immediate export to test connectivity (disabled to prevent blocking)
    // setTimeout(async () => {
    //   try {
    //     // console.log('🔄 TELEMETRY: Forcing metric export...');
    //     await metricReader.forceFlush();
    //     // console.log('✅ TELEMETRY: Forced metric export completed');
    //   } catch (error) {
    //     console.error('❌ TELEMETRY: Forced export failed:', error);
    //   }
    // }, 1000);
    
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