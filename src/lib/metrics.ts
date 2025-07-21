import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';

// Lazy initialization to ensure SDK is ready
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let tracer: ReturnType<typeof trace.getTracer> | null = null;
let customMetricsCache: any = null;

// Initialize meter and tracer with minimal logging
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

const initializeTelemetry = () => {
  if (!meter && initializationAttempts < MAX_INIT_ATTEMPTS) {
    initializationAttempts++;

    try {
      // Check if we're in the right environment
      if (typeof window !== 'undefined') {
        return false;
      }

      const meterProvider = metrics.getMeterProvider();

      // Check if we have a proper meter provider (not the NoopMeterProvider)
      if (meterProvider.constructor.name === 'NoopMeterProvider') {
        if (initializationAttempts < MAX_INIT_ATTEMPTS) {
          return false;
        }
      }

      meter = metrics.getMeter('globeco-portfolio-management-portal', '0.1.0');
      tracer = trace.getTracer('globeco-portfolio-management-portal', '0.1.0');

      // Only log success if debug is enabled
      if (process.env.OTEL_DEBUG === 'true') {
        console.log('✅ Custom telemetry initialized');
      }
      
      return true;
    } catch (error) {
      // Only log errors, not debug info
      if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
        console.error('❌ Telemetry initialization failed after', MAX_INIT_ATTEMPTS, 'attempts');
      }
      return false;
    }
  }
  return meter !== null;
};

// No-op metric that does nothing if telemetry is not available
const createNoOpMetric = () => ({
  add: () => {},
  record: () => {},
});

// Custom metrics with lazy initialization and null safety
export const customMetrics = {
  get apiRequestCounter() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.apiRequestCounter) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.apiRequestCounter = meter.createCounter('api_requests_total', {
        description: 'Total number of API requests',
      });
    }
    return customMetricsCache.apiRequestCounter;
  },

  get apiResponseTime() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.apiResponseTime) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.apiResponseTime = meter.createHistogram('api_response_duration_ms', {
        description: 'API response time in milliseconds',
      });
    }
    return customMetricsCache.apiResponseTime;
  },

  get pageViewCounter() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.pageViewCounter) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.pageViewCounter = meter.createCounter('page_views_total', {
        description: 'Total number of page views',
      });
    }
    return customMetricsCache.pageViewCounter;
  },

  get activeUsers() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.activeUsers) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.activeUsers = meter.createUpDownCounter('active_users', {
        description: 'Number of active users',
      });
    }
    return customMetricsCache.activeUsers;
  },

  get errorCounter() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.errorCounter) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.errorCounter = meter.createCounter('errors_total', {
        description: 'Total number of errors',
      });
    }
    return customMetricsCache.errorCounter;
  },

  get dbOperationCounter() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.dbOperationCounter) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.dbOperationCounter = meter.createCounter('db_operations_total', {
        description: 'Total number of database operations',
      });
    }
    return customMetricsCache.dbOperationCounter;
  },

  get dbOperationDuration() {
    initializeTelemetry();
    if (!meter) return createNoOpMetric();
    if (!customMetricsCache?.dbOperationDuration) {
      customMetricsCache = customMetricsCache || {};
      customMetricsCache.dbOperationDuration = meter.createHistogram('db_operation_duration_ms', {
        description: 'Database operation duration in milliseconds',
      });
    }
    return customMetricsCache.dbOperationDuration;
  },
};

// Custom tracing utilities
export const customTracing = {
  get tracer() {
    initializeTelemetry();
    return tracer;
  },

  // Helper function to create a span
  createSpan: (name: string, attributes?: Record<string, string | number | boolean>) => {
    try {
      initializeTelemetry();
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
      console.error(`❌ Error creating span ${name}:`, error);
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
    initializeTelemetry();
    
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
      console.error('❌ Error recording API request metrics:', error);
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
      console.error('❌ Error recording page view metric:', error);
    }
  },

  // Record error
  recordError: (errorType: string, errorMessage: string, context?: string) => {
    try {
      customMetrics.errorCounter.add(1, {
        error_type: errorType,
        context: context || 'unknown',
      });
    } catch (error) {
      console.error('❌ Error recording error metric:', error);
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
      console.error('❌ Error recording DB operation metrics:', error);
    }
  },
};