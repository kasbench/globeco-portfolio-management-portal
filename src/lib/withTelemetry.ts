import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils, customTracing } from './metrics';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

// Initialize telemetry on first API call
let telemetryInitialized = false;
const initializeTelemetry = async () => {
  if (!telemetryInitialized && typeof window === 'undefined') {
    console.log('🔧 withTelemetry: Initializing OpenTelemetry...');
    try {
      await import('./telemetry');
      telemetryInitialized = true;
      console.log('✅ withTelemetry: OpenTelemetry initialized successfully');
    } catch (error) {
      console.error('❌ withTelemetry: Failed to initialize OpenTelemetry:', error);
    }
  }
};

export function withTelemetry(handler: ApiHandler, operationName?: string) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Initialize telemetry on first API call
    await initializeTelemetry();
    
    const start = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const spanName = operationName || `${method} ${endpoint}`;
    let statusCode = 200;
    
    console.log(`🔄 withTelemetry: Starting ${spanName} for ${method} ${endpoint}`);
    
    return await customTracing.traceAsyncOperation(
      spanName,
      async () => {
        let response: NextResponse;
        
        try {
          console.log(`🚀 withTelemetry: Executing handler for ${endpoint}`);
          response = await handler(req, context);
          statusCode = response.status;
          console.log(`✅ withTelemetry: Handler completed with status ${statusCode}`);
          return response;
        } catch (error) {
          statusCode = 500;
          console.error(`❌ withTelemetry: Handler error for ${endpoint}:`, error);
          telemetryUtils.recordError(
            'api_error',
            error instanceof Error ? error.message : 'Unknown API error',
            endpoint
          );
          throw error;
        } finally {
          const duration = Date.now() - start;
          console.log(`⏱️ withTelemetry: Request completed in ${duration}ms`);
          telemetryUtils.recordApiRequest(method, endpoint, statusCode, duration);
        }
      },
      {
        'http.method': method,
        'http.url': req.url,
        'http.route': endpoint,
        'http.status_code': statusCode,
      }
    );
  };
}

// Utility for wrapping database operations
export function withDbTelemetry<T>(
  operation: () => Promise<T>,
  operationType: string,
  tableName: string
): Promise<T> {
  const start = Date.now();
  
  return customTracing.traceAsyncOperation(
    `db.${operationType}`,
    async () => {
      try {
        const result = await operation();
        const duration = Date.now() - start;
        telemetryUtils.recordDbOperation(operationType, tableName, duration, true);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        telemetryUtils.recordDbOperation(operationType, tableName, duration, false);
        throw error;
      }
    },
    {
      'db.operation': operationType,
      'db.table': tableName,
    }
  );
}