import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils, customTracing } from './metrics';
import { logger, RequestContext } from './logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

export function withTelemetryTiming(handler: ApiHandler, operationName?: string) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const telemetryStart = Date.now();
    console.log(`[TELEMETRY_TIMING] withTelemetry started at ${new Date().toISOString()}`);
    
    // Create request context for structured logging
    const contextStart = Date.now();
    const requestContext = logger.createRequestContext(req);
    const contextTime = Date.now() - contextStart;
    console.log(`[TELEMETRY_TIMING] Request context created in ${contextTime}ms`);
    
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const spanName = operationName || `${req.method} ${endpoint}`;
    let statusCode = 200;
    let responseBytes: number | undefined;

    // Log incoming request
    const logStart = Date.now();
    logger.logIncomingRequest(requestContext, url.search);
    const logTime = Date.now() - logStart;
    console.log(`[TELEMETRY_TIMING] Incoming request logged in ${logTime}ms`);

    const traceStart = Date.now();
    console.log(`[TELEMETRY_TIMING] Starting trace operation at +${traceStart - telemetryStart}ms`);
    
    return await customTracing.traceAsyncOperation(
      spanName,
      async () => {
        const handlerStart = Date.now();
        console.log(`[TELEMETRY_TIMING] Handler starting at +${handlerStart - telemetryStart}ms`);
        
        let response: NextResponse;

        try {
          response = await handler(req, context);
          const handlerTime = Date.now() - handlerStart;
          console.log(`[TELEMETRY_TIMING] Handler completed in ${handlerTime}ms`);
          
          statusCode = response.status;
          
          // Try to get response size
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            responseBytes = parseInt(contentLength, 10);
          }
          
          return response;
        } catch (error) {
          const handlerTime = Date.now() - handlerStart;
          console.log(`[TELEMETRY_TIMING] Handler failed after ${handlerTime}ms`);
          
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
          const finallyStart = Date.now();
          console.log(`[TELEMETRY_TIMING] Finally block starting at +${finallyStart - telemetryStart}ms`);
          
          // Log completed request
          const logCompleteStart = Date.now();
          logger.logCompletedRequest(requestContext, statusCode, responseBytes);
          const logCompleteTime = Date.now() - logCompleteStart;
          console.log(`[TELEMETRY_TIMING] Completed request logged in ${logCompleteTime}ms`);
          
          // Record telemetry metrics
          const metricsStart = Date.now();
          const duration = Date.now() - requestContext.startTime;
          telemetryUtils.recordApiRequest(req.method, endpoint, statusCode, duration);
          const metricsTime = Date.now() - metricsStart;
          console.log(`[TELEMETRY_TIMING] Metrics recorded in ${metricsTime}ms`);
          
          // Clean up request context
          const cleanupStart = Date.now();
          logger.cleanupRequestContext(requestContext.requestId);
          const cleanupTime = Date.now() - cleanupStart;
          console.log(`[TELEMETRY_TIMING] Context cleanup in ${cleanupTime}ms`);
          
          const finallyTime = Date.now() - finallyStart;
          console.log(`[TELEMETRY_TIMING] Finally block completed in ${finallyTime}ms`);
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
    ).then(result => {
      const totalTelemetryTime = Date.now() - telemetryStart;
      console.log(`[TELEMETRY_TIMING] Total telemetry wrapper time: ${totalTelemetryTime}ms`);
      return result;
    });
  };
}