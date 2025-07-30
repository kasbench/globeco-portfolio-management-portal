import { NextRequest, NextResponse } from 'next/server';
import { logger, RequestContext } from './logger';

/**
 * Enhanced API handler wrapper that provides structured logging for all API operations
 */
export function withStructuredLogging<T extends any[]>(
  handler: (req: NextRequest, context: RequestContext, ...args: T) => Promise<NextResponse>,
  operationName?: string
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestContext = logger.createRequestContext(req);
    const url = new URL(req.url);
    
    // Log incoming request
    logger.logIncomingRequest(requestContext, url.search);
    
    try {
      // Call the actual handler with the request context
      const response = await handler(req, requestContext, ...args);
      
      // Log completed request
      const contentLength = response.headers.get('content-length');
      const bytes = contentLength ? parseInt(contentLength, 10) : undefined;
      logger.logCompletedRequest(requestContext, response.status, bytes);
      
      return response;
    } catch (error) {
      // Log error
      logger.logError(
        `API Error for ${url.pathname}`,
        error instanceof Error ? error : new Error(String(error)),
        requestContext,
        { 
          endpoint: url.pathname,
          operation: operationName 
        }
      );
      
      // Re-throw to let the handler deal with the response
      throw error;
    } finally {
      // Clean up request context
      logger.cleanupRequestContext(requestContext.requestId);
    }
  };
}

/**
 * Helper for logging API operations with consistent format
 */
export function logApiOperation(
  msg: string, 
  context: RequestContext, 
  data?: Record<string, any>
): void {
  logger.logApiOperation(msg, context, data);
}

/**
 * Helper for logging service operations with consistent format
 */
export function logServiceOperation(
  msg: string, 
  context: RequestContext, 
  operation: string, 
  data?: Record<string, any>
): void {
  logger.logServiceOperation(msg, context, operation, data);
}

/**
 * Helper for logging validation errors
 */
export function logValidationError(
  msg: string,
  context: RequestContext,
  validationDetails?: Record<string, any>
): void {
  logger.warn(msg, {
    request_id: context.requestId,
    correlation_id: context.correlationId,
    endpoint: context.path,
    validation_error: true,
    ...validationDetails
  });
}

/**
 * Helper for creating error responses with logging
 */
export function createErrorResponse(
  message: string,
  status: number,
  context: RequestContext,
  additionalData?: Record<string, any>
): NextResponse {
  logger.warn(`API Error Response: ${message}`, {
    request_id: context.requestId,
    correlation_id: context.correlationId,
    endpoint: context.path,
    status,
    ...additionalData
  });
  
  return NextResponse.json({ error: message }, { status });
}

/**
 * Helper for creating success responses with logging
 */
export function createSuccessResponse(
  data: any,
  context: RequestContext,
  message?: string,
  additionalLogData?: Record<string, any>
): NextResponse {
  if (message) {
    logger.info(message, {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      endpoint: context.path,
      ...additionalLogData
    });
  }
  
  return NextResponse.json(data);
}