import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils, customTracing } from './metrics';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

export function withTelemetry(handler: ApiHandler, operationName?: string) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const start = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const spanName = operationName || `${method} ${endpoint}`;
    let statusCode = 200;

    console.log(`🔄 API: ${method} ${endpoint} - Recording metrics and traces`);

    return await customTracing.traceAsyncOperation(
      spanName,
      async () => {
        let response: NextResponse;

        try {
          response = await handler(req, context);
          statusCode = response.status;
          return response;
        } catch (error) {
          statusCode = 500;
          console.error(`❌ API Error for ${endpoint}:`, error);
          telemetryUtils.recordError(
            'api_error',
            error instanceof Error ? error.message : 'Unknown API error',
            endpoint
          );
          throw error;
        } finally {
          const duration = Date.now() - start;
          telemetryUtils.recordApiRequest(method, endpoint, statusCode, duration);
          console.log(`✅ API: ${method} ${endpoint} - ${statusCode} (${duration}ms) - Metrics and traces recorded`);
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