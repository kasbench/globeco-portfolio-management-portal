import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';

// Simple metrics setup
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let tracer: ReturnType<typeof trace.getTracer> | null = null;
let metricsInitialized = false;
const customMetricsCache: any = {};

// Metrics initialization will be logged through structured logging

// Initialize metrics function
const initializeMetrics = () => {
  if (metricsInitialized || typeof window !== 'undefined') {
    return meter !== null;
  }

  try {
    // Create meter and tracer
    meter = metrics.getMeter('globeco-portfolio-management-portal', '0.1.0');
    tracer = trace.getTracer('globeco-portfolio-management-portal', '0.1.0');
    
    metricsInitialized = true;
    
    // Test metric creation and immediate use
    const testCounter = meter.createCounter('metrics_initialization_test', {
      description: 'Test counter to verify metrics are working'
    });
    testCounter.add(1, { test: 'initialization', timestamp: Date.now().toString() });
    
    return true;
    
  } catch (error) {
    // Use console.error here since logger might not be available during initialization
    console.error('METRICS: Initialization failed:', error);
    metricsInitialized = false;
    return false;
  }
};

// Initialize immediately on server side
if (typeof window === 'undefined') {
  // Add a small delay to ensure telemetry SDK is ready
  setTimeout(() => {
    initializeMetrics();
  }, 100);
}

// No-op metric that does nothing if telemetry is not available
const createNoOpMetric = () => ({
  add: () => {},
  record: () => {},
});

// Simple function to get or create a metric
const getOrCreateMetric = (name: string, type: 'counter' | 'histogram' | 'updowncounter', description: string) => {
  if (!meter) {
    return createNoOpMetric();
  }
  
  if (!customMetricsCache[name]) {
    try {
      switch (type) {
        case 'counter':
          customMetricsCache[name] = meter.createCounter(name, { description });
          break;
        case 'histogram':
          customMetricsCache[name] = meter.createHistogram(name, { description });
          break;
        case 'updowncounter':
          customMetricsCache[name] = meter.createUpDownCounter(name, { description });
          break;
      }
    } catch (error) {
      // Use console.error here since this is a low-level metrics error
      console.error(`METRICS: Failed to create ${name}:`, error);
      return createNoOpMetric();
    }
  }
  
  return customMetricsCache[name];
};

// Simple custom metrics
export const customMetrics = {
  get apiRequestCounter() {
    return getOrCreateMetric('api_requests_total', 'counter', 'Total number of API requests');
  },
  get apiResponseTime() {
    return getOrCreateMetric('api_response_duration_ms', 'histogram', 'API response time in milliseconds');
  },
  get pageViewCounter() {
    return getOrCreateMetric('page_views_total', 'counter', 'Total number of page views');
  },
  get activeUsers() {
    return getOrCreateMetric('active_users', 'updowncounter', 'Number of active users');
  },
  get errorCounter() {
    return getOrCreateMetric('errors_total', 'counter', 'Total number of errors');
  },
  get dbOperationCounter() {
    return getOrCreateMetric('db_operations_total', 'counter', 'Total number of database operations');
  },
  get dbOperationDuration() {
    return getOrCreateMetric('db_operation_duration_ms', 'histogram', 'Database operation duration in milliseconds');
  },
};

// Custom tracing utilities
export const customTracing = {
  get tracer() {
    initializeMetrics();
    return tracer;
  },

  // Helper function to create a span
  createSpan: (name: string, attributes?: Record<string, string | number | boolean>) => {
    try {
      initializeMetrics();
      if (!tracer) {
        // Return a no-op span if tracer is not available
        return {
          setAttributes: () => {},
          setStatus: () => {},
          recordException: () => {},
          end: () => {},
        };
      }
      const span = tracer.startSpan(name);
      if (attributes) {
        span.setAttributes(attributes);
      }
      return span;
    } catch (error) {
      // Use console.error here since this is a low-level tracing error
      console.error(`Error creating span ${name}:`, error);
      // Return a no-op span to prevent crashes
      return {
        setAttributes: () => {},
        setStatus: () => {},
        recordException: () => {},
        end: () => {},
      };
    }
  },

  // Helper function to wrap async operations with tracing
  traceAsyncOperation: async <T>(
    name: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> => {
    initializeMetrics();
    
    if (!tracer) {
      // If tracer is not available, just run the operation without tracing
      return await operation();
    }

    const span = tracer.startSpan(name);

    if (attributes) {
      span.setAttributes(attributes);
    }

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  },
};

// Utility functions for common operations
export const telemetryUtils = {
  // Record API request
  recordApiRequest: (method: string, endpoint: string, statusCode: number, duration: number) => {
    try {
      customMetrics.apiRequestCounter.add(1, {
        method,
        endpoint,
        status_code: statusCode.toString(),
      });

      customMetrics.apiResponseTime.record(duration, {
        method,
        endpoint,
        status_code: statusCode.toString(),
      });
    } catch (error) {
      console.error('Error recording API request metrics:', error);
    }
  },

  // Record page view
  recordPageView: (page: string, userId?: string) => {
    try {
      customMetrics.pageViewCounter.add(1, {
        page,
        user_id: userId || 'anonymous',
      });
    } catch (error) {
      console.error('Error recording page view metric:', error);
    }
  },

  // Record error
  recordError: (errorType: string, errorMessage: string, context?: string) => {
    try {
      customMetrics.errorCounter.add(1, {
        error_type: errorType,
        error_message: errorMessage.substring(0, 100), // Truncate to avoid large labels
        context: context || 'unknown',
      });
    } catch (error) {
      console.error('Error recording error metric:', error);
    }
  },

  // Record database operation
  recordDbOperation: (operation: string, table: string, duration: number, success: boolean) => {
    try {
      customMetrics.dbOperationCounter.add(1, {
        operation,
        table,
        success: success.toString(),
      });

      customMetrics.dbOperationDuration.record(duration, {
        operation,
        table,
      });
    } catch (error) {
      console.error('Error recording DB operation metrics:', error);
    }
  },
};