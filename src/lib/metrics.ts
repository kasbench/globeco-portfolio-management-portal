import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';

// Create a meter for custom metrics
const meter = metrics.getMeter('globeco-portfolio-management-portal', '0.1.0');

// Create a tracer for custom spans
const tracer = trace.getTracer('globeco-portfolio-management-portal', '0.1.0');

// Custom metrics
export const customMetrics = {
  // Counter for API requests
  apiRequestCounter: meter.createCounter('api_requests_total', {
    description: 'Total number of API requests',
  }),

  // Histogram for API response times
  apiResponseTime: meter.createHistogram('api_response_duration_ms', {
    description: 'API response time in milliseconds',
  }),

  // Counter for page views
  pageViewCounter: meter.createCounter('page_views_total', {
    description: 'Total number of page views',
  }),

  // Gauge for active users (if applicable)
  activeUsers: meter.createUpDownCounter('active_users', {
    description: 'Number of active users',
  }),

  // Counter for errors
  errorCounter: meter.createCounter('errors_total', {
    description: 'Total number of errors',
  }),

  // Counter for database operations
  dbOperationCounter: meter.createCounter('db_operations_total', {
    description: 'Total number of database operations',
  }),

  // Histogram for database operation duration
  dbOperationDuration: meter.createHistogram('db_operation_duration_ms', {
    description: 'Database operation duration in milliseconds',
  }),
};

// Custom tracing utilities
export const customTracing = {
  tracer,

  // Helper function to create a span
  createSpan: (name: string, attributes?: Record<string, string | number | boolean>) => {
    try {
      console.log(`🔍 Creating span: ${name}`);
      const span = tracer.startSpan(name);
      if (attributes) {
        span.setAttributes(attributes);
        console.log(`📝 Span attributes set:`, attributes);
      }
      console.log(`✅ Span created successfully: ${name}`);
      return span;
    } catch (error) {
      console.error(`❌ Error creating span ${name}:`, error);
      throw error;
    }
  },

  // Helper function to wrap async operations with tracing
  traceAsyncOperation: async <T>(
    name: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> => {
    console.log(`🔍 Starting traced operation: ${name}`);
    const span = tracer.startSpan(name);

    if (attributes) {
      span.setAttributes(attributes);
      console.log(`📝 Trace attributes set for ${name}:`, attributes);
    }

    try {
      console.log(`🚀 Executing traced operation: ${name}`);
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      console.log(`✅ Traced operation completed successfully: ${name}`);
      return result;
    } catch (error) {
      console.error(`❌ Traced operation failed: ${name}`, error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
      console.log(`🏁 Span ended: ${name}`);
    }
  },
};

// Utility functions for common operations
export const telemetryUtils = {
  // Record API request
  recordApiRequest: (method: string, endpoint: string, statusCode: number, duration: number) => {
    try {
      console.log(`📊 Recording API request: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);

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

      console.log(`✅ API metrics recorded successfully`);

      // Force immediate export for debugging
      if (process.env.OTEL_DEBUG === 'true') {
        console.log(`🔄 Debug mode: Forcing metric export...`);
        // The metrics will be exported on the next export cycle
      }
    } catch (error) {
      console.error('❌ Error recording API request metrics:', error);
    }
  },

  // Record page view
  recordPageView: (page: string, userId?: string) => {
    try {
      console.log(`👁️ Recording page view: ${page} (user: ${userId || 'anonymous'})`);

      customMetrics.pageViewCounter.add(1, {
        page,
        user_id: userId || 'anonymous',
      });

      console.log(`✅ Page view metric recorded successfully`);
    } catch (error) {
      console.error('❌ Error recording page view metric:', error);
    }
  },

  // Record error
  recordError: (errorType: string, errorMessage: string, context?: string) => {
    try {
      console.log(`🚨 Recording error: ${errorType} - ${errorMessage} (context: ${context || 'unknown'})`);

      customMetrics.errorCounter.add(1, {
        error_type: errorType,
        context: context || 'unknown',
      });

      console.log(`✅ Error metric recorded successfully`);
    } catch (error) {
      console.error('❌ Error recording error metric:', error);
    }
  },

  // Record database operation
  recordDbOperation: (operation: string, table: string, duration: number, success: boolean) => {
    try {
      console.log(`🗄️ Recording DB operation: ${operation} on ${table} - ${success ? 'success' : 'failure'} (${duration}ms)`);

      customMetrics.dbOperationCounter.add(1, {
        operation,
        table,
        success: success.toString(),
      });

      customMetrics.dbOperationDuration.record(duration, {
        operation,
        table,
      });

      console.log(`✅ DB operation metrics recorded successfully`);
    } catch (error) {
      console.error('❌ Error recording DB operation metrics:', error);
    }
  },
};