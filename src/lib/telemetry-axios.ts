import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { trace, context, propagation } from '@opentelemetry/api';
import { customTracing } from './metrics';

/**
 * Wraps an Axios instance with OpenTelemetry tracing
 * Creates spans for all HTTP requests with detailed attributes
 */
export function wrapAxiosWithTelemetry(axiosInstance: AxiosInstance, serviceName: string) {
  // Request interceptor - start span and inject trace context
  axiosInstance.interceptors.request.use(
    (config) => {
      // Store span start time for duration calculation
      (config as any).__telemetry_start = Date.now();
      
      // Create span name
      const method = config.method?.toUpperCase() || 'HTTP';
      const url = config.url || 'unknown';
      const spanName = `${method} ${url}`;
      
      // Starting HTTP span for telemetry
      
      // Inject trace context headers for distributed tracing
      try {
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
          // Ensure headers object exists
          if (!config.headers) {
            config.headers = {} as any;
          }
          
          // Inject trace context into headers
          const headersCarrier: Record<string, string> = {};
          propagation.inject(context.active(), headersCarrier);
          
          // Add the injected headers to the request
          Object.assign(config.headers, headersCarrier);
        }
      } catch (error) {
        // Don't fail the request if trace context injection fails
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - end span with success
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config;
      const startTime = (config as any).__telemetry_start;
      const duration = startTime ? Date.now() - startTime : 0;
      
      const method = config.method?.toUpperCase() || 'HTTP';
      const url = config.url || 'unknown';
      const spanName = `${method} ${url}`;
      
      // Create and immediately end a span for the successful request
      return customTracing.traceAsyncOperation(
        spanName,
        async () => {
          return response;
        },
        {
          'http.method': method,
          'http.url': config.baseURL ? `${config.baseURL}${url}` : url,
          'http.status_code': response.status,
          'http.response_size': JSON.stringify(response.data).length,
          'service.name': serviceName,
          'http.duration_ms': duration,
        }
      );
    },
    (error) => {
      const config = error.config;
      if (config) {
        const startTime = (config as any).__telemetry_start;
        const duration = startTime ? Date.now() - startTime : 0;
        
        const method = config.method?.toUpperCase() || 'HTTP';
        const url = config.url || 'unknown';
        const spanName = `${method} ${url}`;
        const statusCode = error.response?.status || 0;
        
        // Create and immediately end a span for the failed request
        return customTracing.traceAsyncOperation(
          spanName,
          async () => {
            throw error;
          },
          {
            'http.method': method,
            'http.url': config.baseURL ? `${config.baseURL}${url}` : url,
            'http.status_code': statusCode,
            'service.name': serviceName,
            'http.duration_ms': duration,
            'error': true,
            'error.message': error.message,
          }
        );
      }
      
      return Promise.reject(error);
    }
  );

  // Axios instance wrapped with telemetry
  return axiosInstance;
}

/**
 * Creates a traced version of an async function that makes HTTP calls
 * Use this for wrapping individual API methods
 */
export function withHttpTelemetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
  serviceName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return await customTracing.traceAsyncOperation(
      operationName,
      async () => {
        const result = await fn(...args);
        return result;
      },
      {
        'operation.name': operationName,
        'service.name': serviceName,
        'operation.type': 'http_client',
      }
    );
  };
}

/**
 * Wraps fetch calls with OpenTelemetry tracing and trace context propagation
 * Use this for client-side fetch calls in hooks and components
 */
export function withFetchTelemetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
  serviceName: string = 'frontend-api'
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return await customTracing.traceAsyncOperation(
      operationName,
      async () => {
        const result = await fn(...args);
        return result;
      },
      {
        'operation.name': operationName,
        'service.name': serviceName,
        'operation.type': 'fetch_client',
      }
    );
  };
}

/**
 * Enhanced fetch wrapper that automatically injects trace context headers
 * Use this for direct fetch calls that need trace context propagation
 */
export function tracedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  operationName?: string
): Promise<Response> {
  return customTracing.traceAsyncOperation(
    operationName || `fetch ${input.toString()}`,
    async () => {
      const startTime = Date.now();
      
      try {
        // Ensure init and headers exist
        const requestInit = init || {};
        
        // Inject trace context headers
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
          const headers = new Headers(requestInit.headers);
          
          // Inject trace context into headers
          const headersCarrier: Record<string, string> = {};
          propagation.inject(context.active(), headersCarrier);
          
          // Add the injected headers to the request
          Object.entries(headersCarrier).forEach(([key, value]) => {
            headers.set(key, value);
          });
          
          // Update the request init with the new headers
          requestInit.headers = headers;
        }
        
        const response = await fetch(input, requestInit);
        return response;
      } catch (error) {
        throw error;
      }
    },
    {
      'http.method': init?.method || 'GET',
      'http.url': input.toString(),
      'operation.type': 'fetch_client',
    }
  );
}