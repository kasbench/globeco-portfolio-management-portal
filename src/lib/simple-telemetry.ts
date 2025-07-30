// All-in-one simple telemetry setup
// Import log filter first to suppress verbose OpenTelemetry output
import './logFilter';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { metrics, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Configuration
const COLLECTOR_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
  'http://otel-collector-collector.monitoring.svc.cluster.local:4318';
const SERVICE_NAME = 'globeco-portfolio-management-portal';

// Global state
let sdk: NodeSDK | null = null;
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let isInitialized = false;

// Simple telemetry initialization

// Initialize everything in one function
export const initializeSimpleTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    return isInitialized;
  }

  try {
    // Set OpenTelemetry diagnostic logging to ERROR level only to suppress verbose output
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${COLLECTOR_URL}/v1/metrics`,
      headers: {},
    });
    
    // Create metric reader
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000, // Export every 5 seconds
      exportTimeoutMillis: 3000,
    });
    
    // Create and start SDK - trace export is disabled via OTEL_TRACES_EXPORTER=none
    // Only our custom traces in withTelemetry will be sent (excluding health checks)
    sdk = new NodeSDK({
      instrumentations: [],
      metricReader,
    });
    
    sdk.start();
    
    // Create meter
    meter = metrics.getMeter(SERVICE_NAME, '0.1.0');
    
    // Test metric creation
    const testCounter = meter.createCounter('simple_telemetry_test', {
      description: 'Test counter for simple telemetry'
    });
    testCounter.add(1, { test: 'initialization', timestamp: Date.now().toString() });
    
    isInitialized = true;
    return true;

  } catch (error) {
    // Only log errors, not debug information
    console.error('SIMPLE-TELEMETRY: Initialization failed:', error);
    isInitialized = false;
    return false;
  }
};

// Simple metrics that work with our setup
const createNoOpMetric = () => ({
  add: () => {},
  record: () => {},
});

export const simpleMetrics = {
  get apiRequestCounter() {
    if (!meter) {
      return createNoOpMetric();
    }
    try {
      return meter.createCounter('api_requests_total', {
        description: 'Total API requests'
      });
    } catch (error) {
      console.error('SIMPLE-TELEMETRY: Failed to create apiRequestCounter:', error);
      return createNoOpMetric();
    }
  },
  
  get pageViewCounter() {
    if (!meter) {
      return createNoOpMetric();
    }
    try {
      return meter.createCounter('page_views_total', {
        description: 'Total page views'
      });
    } catch (error) {
      console.error('SIMPLE-TELEMETRY: Failed to create pageViewCounter:', error);
      return createNoOpMetric();
    }
  },
  
  get errorCounter() {
    if (!meter) {
      return createNoOpMetric();
    }
    try {
      return meter.createCounter('errors_total', {
        description: 'Total errors'
      });
    } catch (error) {
      console.error('SIMPLE-TELEMETRY: Failed to create errorCounter:', error);
      return createNoOpMetric();
    }
  }
};

// Initialize immediately on server side
if (typeof window === 'undefined') {
  initializeSimpleTelemetry();
}

export { isInitialized, meter };