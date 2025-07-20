import { NextRequest, NextResponse } from 'next/server';
import { telemetryUtils } from './lib/metrics';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  
  console.log(`🌐 Middleware: ${method} ${pathname} - Start processing`);
  
  // Create response
  const response = NextResponse.next();
  
  // Only run on server side
  if (typeof window === 'undefined') {
    // Record page view for non-API routes
    if (!pathname.startsWith('/api/')) {
      console.log(`👁️ Middleware: Recording page view for ${pathname}`);
      telemetryUtils.recordPageView(pathname);
    } else {
      console.log(`🔧 Middleware: API route detected: ${pathname} - metrics will be handled by API handler`);
    }
    
    // Add response time header and record metrics after response
    const duration = Date.now() - start;
    response.headers.set('x-response-time', `${duration}ms`);
    console.log(`⏱️ Middleware: Request processed in ${duration}ms`);
    
    // For API routes, we'll handle metrics in the API handlers
    // to get accurate status codes and response times
  } else {
    console.log(`🖥️ Middleware: Client-side execution detected, skipping telemetry`);
  }
  
  console.log(`✅ Middleware: ${method} ${pathname} - Processing complete`);
  return response;
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