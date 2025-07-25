// All-in-one simple telemetry setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { metrics } from '@opentelemetry/api';

// Configuration
const COLLECTOR_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
  'http://otel-collector-collector.monitoring.svc.cluster.local:4318';
const SERVICE_NAME = 'globeco-portfolio-management-portal';

// Global state
let sdk: NodeSDK | null = null;
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let isInitialized = false;

console.log('🔧 SIMPLE-TELEMETRY: Starting all-in-one initialization...');
console.log(`🔧 SIMPLE-TELEMETRY: Collector URL: ${COLLECTOR_URL}`);
console.log(`🔧 SIMPLE-TELEMETRY: Service Name: ${SERVICE_NAME}`);

// Initialize everything in one function
export const initializeSimpleTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    console.log('🔧 SIMPLE-TELEMETRY: Already initialized or in browser, skipping');
    return isInitialized;
  }

  try {
    console.log('🚀 SIMPLE-TELEMETRY: Creating OTLP metric exporter...');
    
    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${COLLECTOR_URL}/v1/metrics`,
      headers: {},
    });
    console.log('✅ SIMPLE-TELEMETRY: Metric exporter created');
    
    // Create metric reader
    console.log('🚀 SIMPLE-TELEMETRY: Creating periodic metric reader...');
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000, // Export every 5 seconds
      exportTimeoutMillis: 3000,
    });
    console.log('✅ SIMPLE-TELEMETRY: Metric reader created');
    
    // Create and start SDK - trace export is disabled via OTEL_TRACES_EXPORTER=none
    // Only our custom traces in withTelemetry will be sent (excluding health checks)
    console.log('🚀 SIMPLE-TELEMETRY: Creating NodeSDK...');
    sdk = new NodeSDK({
      instrumentations: [],
      metricReader,
    });
    console.log('✅ SIMPLE-TELEMETRY: NodeSDK created (automatic trace export disabled)');
    
    console.log('🚀 SIMPLE-TELEMETRY: Starting SDK...');
    sdk.start();
    console.log('✅ SIMPLE-TELEMETRY: SDK started successfully');
    
    // Create meter
    console.log('🚀 SIMPLE-TELEMETRY: Creating meter...');
    meter = metrics.getMeter(SERVICE_NAME, '0.1.0');
    console.log('✅ SIMPLE-TELEMETRY: Meter created');
    
    // Test metric creation
    console.log('🚀 SIMPLE-TELEMETRY: Testing metric creation...');
    const testCounter = meter.createCounter('simple_telemetry_test', {
      description: 'Test counter for simple telemetry'
    });
    testCounter.add(1, { test: 'initialization', timestamp: Date.now().toString() });
    console.log('✅ SIMPLE-TELEMETRY: Test metric created and incremented');
    
    isInitialized = true;
    console.log('🎉 SIMPLE-TELEMETRY: All initialization completed successfully!');
    
    return true;

  } catch (error) {
    console.error('❌ SIMPLE-TELEMETRY: Initialization failed:', error);
    console.error('❌ SIMPLE-TELEMETRY: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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
      console.log('⚠️ SIMPLE-TELEMETRY: No meter available for apiRequestCounter');
      return createNoOpMetric();
    }
    try {
      const counter = meter.createCounter('api_requests_total', {
        description: 'Total API requests'
      });
      console.log('✅ SIMPLE-TELEMETRY: Created api_requests_total counter');
      return counter;
    } catch (error) {
      console.error('❌ SIMPLE-TELEMETRY: Failed to create apiRequestCounter:', error);
      return createNoOpMetric();
    }
  },
  
  get pageViewCounter() {
    if (!meter) {
      console.log('⚠️ SIMPLE-TELEMETRY: No meter available for pageViewCounter');
      return createNoOpMetric();
    }
    try {
      const counter = meter.createCounter('page_views_total', {
        description: 'Total page views'
      });
      console.log('✅ SIMPLE-TELEMETRY: Created page_views_total counter');
      return counter;
    } catch (error) {
      console.error('❌ SIMPLE-TELEMETRY: Failed to create pageViewCounter:', error);
      return createNoOpMetric();
    }
  },
  
  get errorCounter() {
    if (!meter) {
      console.log('⚠️ SIMPLE-TELEMETRY: No meter available for errorCounter');
      return createNoOpMetric();
    }
    try {
      const counter = meter.createCounter('errors_total', {
        description: 'Total errors'
      });
      console.log('✅ SIMPLE-TELEMETRY: Created errors_total counter');
      return counter;
    } catch (error) {
      console.error('❌ SIMPLE-TELEMETRY: Failed to create errorCounter:', error);
      return createNoOpMetric();
    }
  }
};

// Initialize immediately on server side
if (typeof window === 'undefined') {
  console.log('🔧 SIMPLE-TELEMETRY: Server-side detected, initializing...');
  const success = initializeSimpleTelemetry();
  console.log(`🔧 SIMPLE-TELEMETRY: Final initialization result: ${success ? 'SUCCESS' : 'FAILED'}`);
} else {
  console.log('🔧 SIMPLE-TELEMETRY: Browser-side detected, skipping initialization');
}

export { isInitialized, meter };