import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from './lib/metrics';
import { logger } from './lib/logger';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  
  // Generate or extract correlation ID
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();
  
  // Create response
  const response = NextResponse.next();
  
  // Add correlation ID to response headers
  response.headers.set('x-correlation-id', correlationId);
  response.headers.set('x-request-id', correlationId);
  
  // Only run on server side
  if (typeof window === 'undefined') {
    // Record page view for non-API routes
    if (!pathname.startsWith('/api/')) {
      logger.info(`Recording page view for ${pathname}`, {
        correlation_id: correlationId,
        path: pathname,
        method,
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent') || undefined
      }, 'middleware:None:0');
      
      telemetryUtils.recordPageView(pathname);
    }
    
    // Add response time header
    const duration = Date.now() - start;
    response.headers.set('x-response-time', `${duration}ms`);
  }
  
  return response;
}

// Helper function to extract client IP
function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return xRealIp || remoteAddr || 'unknown';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};