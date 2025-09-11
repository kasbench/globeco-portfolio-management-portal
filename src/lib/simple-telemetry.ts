// Simple telemetry setup that initializes the full SDK
import { metrics } from '@opentelemetry/api';

// Import and initialize the main telemetry system
import { initializeTelemetry } from './telemetry';

// Configuration
const SERVICE_NAME = 'globeco-portfolio-management-portal';

// Global state
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let isInitialized = false;

// Simple telemetry initialization that ensures main telemetry runs
export const initializeSimpleTelemetry = (): boolean => {
  if (isInitialized || typeof window !== 'undefined') {
    return isInitialized;
  }

  try {
    console.log('🔧 SIMPLE-TELEMETRY: Starting initialization...');
    
    // First, ensure the main telemetry SDK is initialized
    const mainTelemetrySuccess = initializeTelemetry();
    if (!mainTelemetrySuccess) {
      console.error('❌ SIMPLE-TELEMETRY: Main telemetry initialization failed');
      return false;
    }
    
    // Now use the initialized meter provider
    meter = metrics.getMeter(SERVICE_NAME, '0.1.0');
    
    // Test metric creation
    const testCounter = meter.createCounter('simple_telemetry_test', {
      description: 'Test counter for simple telemetry'
    });
    testCounter.add(1, { 
      test: 'initialization', 
      component: 'simple-telemetry',
      timestamp: Date.now().toString() 
    });
    
    console.log('✅ SIMPLE-TELEMETRY: Initialized successfully');
    isInitialized = true;
    return true;

  } catch (error) {
    console.error('❌ SIMPLE-TELEMETRY: Initialization failed:', error);
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