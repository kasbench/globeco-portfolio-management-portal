import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils, customTracing } from './metrics';
import { logger, RequestContext } from './logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

export function withTelemetry(handler: ApiHandler, operationName?: string) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Create request context for structured logging
    const requestContext = logger.createRequestContext(req);
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const spanName = operationName || `${req.method} ${endpoint}`;
    let statusCode = 200;
    let responseBytes: number | undefined;

    // Log incoming request
    logger.logIncomingRequest(requestContext, url.search);

    return await customTracing.traceAsyncOperation(
      spanName,
      async () => {
        let response: NextResponse;

        try {
          response = await handler(req, context);
          statusCode = response.status;
          
          // Try to get response size
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            responseBytes = parseInt(contentLength, 10);
          }
          
          return response;
        } catch (error) {
          statusCode = 500;
          
          // Log error with structured logging
          logger.logError(
            `API Error for ${endpoint}`,
            error instanceof Error ? error : new Error(String(error)),
            requestContext,
            { endpoint }
          );
          
          telemetryUtils.recordError(
            'api_error',
            error instanceof Error ? error.message : 'Unknown API error',
            endpoint
          );
          throw error;
        } finally {
          // Log completed request
          logger.logCompletedRequest(requestContext, statusCode, responseBytes);
          
          // Record telemetry metrics
          const duration = Date.now() - requestContext.startTime;
          telemetryUtils.recordApiRequest(req.method, endpoint, statusCode, duration);
          
          // Clean up request context
          logger.cleanupRequestContext(requestContext.requestId);
        }
      },
      {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': endpoint,
        'http.status_code': statusCode,
        'request.id': requestContext.requestId,
        'correlation.id': requestContext.correlationId,
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